import { Configuration, OpenAIApi } from "openai-edge";
import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import prisma from "@/lib/db";
import { getFileUrl } from "@/lib/s3";
import type { ChatCompletionRequestMessage, ChatCompletionFunctions } from "openai-edge";

// Check for OpenAI API key
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.warn('OPENAI_API_KEY is not set in environment variables');
}

const config = new Configuration({
  apiKey: openaiApiKey || '',
});

const openai = new OpenAIApi(config);

// --- Function calling setup ---
const chatFunctions = [
  {
    name: "get_flight_record_by_id",
    description: "Get full information about a flight record using its ID.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique identifier of the FlightRecord",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "list_attachments_for_record",
    description: "Return attachment metadata (fileName, url, size, type) for the specified flight record ID.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique identifier of the FlightRecord",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "list_recent_flight_records",
    description: "List the most recent flight records with optional limit (default 5).",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Number of records to return (1-20).",
          minimum: 1,
          maximum: 20,
          default: 5,
        },
      },
    },
  },
  {
    name: "search_flight_records_by_tail",
    description: "Find flight records that match a given tail number.",
    parameters: {
      type: "object",
      properties: {
        tail: {
          type: "string",
          description: "The aircraft tail number to search for.",
        },
        limit: {
          type: "integer",
          description: "Maximum records to return (default 10).",
          minimum: 1,
          maximum: 50,
          default: 10,
        },
      },
      required: ["tail"],
    },
  },
  {
    name: "search_flight_records",
    description: "Search flight records by various optional filters such as airline, fleet, tail, date range, systemAffected, hasDefect, etc.",
    parameters: {
      type: "object",
      properties: {
        airline: { type: "string", description: "Airline code or name (e.g. Airline-1)" },
        fleet: { type: "string", description: "Aircraft fleet type (e.g. A-320, B-737)" },
        tail: { type: "string", description: "Aircraft tail/registration number" },
        station: { type: "string", description: "Airport station code where record was filed (e.g. STA-1)" },
        service: { type: "string", description: "Type of service event (e.g. Transit, Over-Night)" },
        systemAffected: { type: "string", description: "ATA / system affected code (e.g. ATA-21 Air Conditioning)" },
        hasDefect: { type: "boolean", description: "Whether the flight record reports a defect" },
        hasTime: { type: "boolean", description: "Indicates block/out times are recorded" },
        blockTime: { type: "string", description: "Recorded block time HH:MM" },
        outTime: { type: "string", description: "Recorded out time HH:MM" },
        logPageNo: { type: "string", description: "AMM/tech log page number" },
        discrepancyNote: { type: "string", description: "Text of discrepancy/defect reported" },
        rectificationNote: { type: "string", description: "Rectification / corrective action text" },
        hasAttachments: { type: "boolean", description: "Whether attachments exist for the record" },
        technician: { type: "string", description: "Technician full name saved with the record" },
        flightNumber: { type: "string", description: "Flight number under which the flight record was saved" },
        createdFrom: { type: "string", description: "ISO date for createdAt start" },
        createdTo: { type: "string", description: "ISO date for createdAt end" },
        updatedFrom: { type: "string", description: "ISO date for updatedAt start" },
        updatedTo: { type: "string", description: "ISO date for updatedAt end" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
] as const;

// Define proper types for the record and attachment
interface FlightRecord {
  id: string;
  date: Date;
  airline: string | null;
  fleet: string | null;
  flightNumber: string | null;
  station: string | null;
  service: string | null;
  tail: string | null;
  hasDefect: boolean;
  systemAffected: string | null;
  logPageNo: string | null;
  Attachment?: Attachment[];
  createdAt: Date;
  updatedAt: Date;
  hasTime?: boolean;
  blockTime?: string | null;
  outTime?: string | null;
  discrepancyNote?: string | null;
  rectificationNote?: string | null;
  technician?: string | null;
  hasPartReplaced?: boolean;
}

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileKey: string;
}

function serializeFlightRecord(record: FlightRecord, withAttachments: boolean = false) {
  const base = {
    id: record.id,
    date: record.date,
    airline: record.airline,
    fleet: record.fleet,
    flightNumber: record.flightNumber,
    station: record.station,
    service: record.service,
    tail: record.tail,
    hasDefect: record.hasDefect,
    systemAffected: record.systemAffected,
    logPageNo: record.logPageNo,
  };
  if (withAttachments) {
    return { 
      ...base, 
      attachments: (record.Attachment || []).map((a: Attachment) => ({ 
        id: a.id, 
        fileName: a.fileName, 
        fileType: a.fileType, 
        fileSize: a.fileSize 
      })) 
    };
  }
  return base;
}

// Helper that fetches a FlightRecord with attachments
async function getFlightRecordById(id: string) {
  const record = await prisma.flightRecord.findUnique({
    where: { id },
    include: { Attachment: true },
  });
  return record ? serializeFlightRecord(record as FlightRecord, true) : null;
}

// Helper that returns attachment info with public URLs
async function listAttachmentsForRecord(id: string) {
  const attachments = await prisma.attachment.findMany({
    where: { flightRecordId: id },
  });
  return attachments.map((a: Attachment) => ({
    fileName: a.fileName,
    url: getFileUrl(a.fileKey),
    fileSize: a.fileSize,
    fileType: a.fileType,
  }));
}

// Helper to list recent flight records
async function listRecentFlightRecords(limit: number = 5) {
  const records = await prisma.flightRecord.findMany({
    orderBy: {
      date: 'desc',
    },
    take: Math.min(Math.max(limit, 1), 20),
    include: {
      Attachment: true,
    },
  });
  return records.map((r: FlightRecord) => serializeFlightRecord(r as FlightRecord, true));
}

// Helper: search by tail number
async function searchFlightRecordsByTail(tail: string, limit: number = 10) {
  const records = await prisma.flightRecord.findMany({
    where: {
      tail: {
        equals: tail,
        mode: 'insensitive',
      },
    },
    orderBy: {
      date: 'desc',
    },
    take: Math.min(Math.max(limit, 1), 50),
    include: {
      Attachment: true,
    },
  });
  return records.map((r: FlightRecord) => serializeFlightRecord(r as FlightRecord, true));
}

// Generic search helper with dynamic filters
type SearchFilters = {
  airline?: string;
  fleet?: string;
  tail?: string;
  station?: string;
  service?: string;
  systemAffected?: string;
  flightNumber?: string;
  hasDefect?: boolean;
  dateFrom?: string;
  dateTo?: string;
  hasTime?: boolean;
  blockTime?: string;
  outTime?: string;
  logPageNo?: string;
  discrepancyNote?: string;
  rectificationNote?: string;
  hasAttachments?: boolean;
  technician?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  limit?: number;
};

async function searchFlightRecords(filters: SearchFilters) {
  const {
    airline,
    fleet,
    tail,
    station,
    service,
    systemAffected,
    flightNumber,
    hasDefect,
    dateFrom,
    dateTo,
    hasTime,
    blockTime,
    outTime,
    logPageNo,
    discrepancyNote,
    rectificationNote,
    hasAttachments,
    technician,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    limit = 20,
  } = filters;

  interface PrismaWhereClause {
    airline?: { equals: string; mode: 'insensitive' };
    fleet?: { equals: string; mode: 'insensitive' };
    tail?: { equals: string; mode: 'insensitive' };
    station?: { equals: string; mode: 'insensitive' };
    service?: { equals: string; mode: 'insensitive' };
    systemAffected?: { equals: string; mode: 'insensitive' };
    hasDefect?: boolean;
    flightNumber?: { equals: string; mode: 'insensitive' };
    hasTime?: boolean;
    blockTime?: { equals: string };
    outTime?: { equals: string };
    logPageNo?: { equals: string };
    discrepancyNote?: { contains: string; mode: 'insensitive' };
    rectificationNote?: { contains: string; mode: 'insensitive' };
    hasAttachments?: boolean;
    technician?: { equals: string; mode: 'insensitive' };
    date?: {
      gte?: Date;
      lte?: Date;
    };
    createdAt?: {
      gte?: Date;
      lte?: Date;
    };
    updatedAt?: {
      gte?: Date;
      lte?: Date;
    };
  }

  const where: PrismaWhereClause = {};
  if (airline) where.airline = { equals: airline, mode: 'insensitive' };
  if (fleet) where.fleet = { equals: fleet, mode: 'insensitive' };
  if (tail) where.tail = { equals: tail, mode: 'insensitive' };
  if (station) where.station = { equals: station, mode: 'insensitive' };
  if (service) where.service = { equals: service, mode: 'insensitive' };
  if (systemAffected) where.systemAffected = { equals: systemAffected, mode: 'insensitive' };
  if (typeof hasDefect === 'boolean') where.hasDefect = hasDefect;
  if (flightNumber) where.flightNumber = { equals: flightNumber, mode: 'insensitive' };
  if (typeof hasTime === 'boolean') where.hasTime = hasTime;
  if (blockTime) where.blockTime = { equals: blockTime };
  if (outTime) where.outTime = { equals: outTime };
  if (logPageNo) where.logPageNo = { equals: logPageNo };
  if (discrepancyNote) where.discrepancyNote = { contains: discrepancyNote, mode: 'insensitive' };
  if (rectificationNote) where.rectificationNote = { contains: rectificationNote, mode: 'insensitive' };
  if (typeof hasAttachments === 'boolean') where.hasAttachments = hasAttachments;
  if (technician) where.technician = { equals: technician, mode: 'insensitive' };

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) {
      const toDate = new Date(dateTo);
      // ensure end date includes full day
      toDate.setHours(23, 59, 59, 999);
      where.date.lte = toDate;
    }
  }

  // createdAt filter
  if (createdFrom || createdTo) {
    where.createdAt = {};
    if (createdFrom) where.createdAt.gte = new Date(createdFrom);
    if (createdTo) {
      const ct = new Date(createdTo);
      ct.setHours(23, 59, 59, 999);
      where.createdAt.lte = ct;
    }
  }

  // updatedAt filter
  if (updatedFrom || updatedTo) {
    where.updatedAt = {};
    if (updatedFrom) where.updatedAt.gte = new Date(updatedFrom);
    if (updatedTo) {
      const ut = new Date(updatedTo);
      ut.setHours(23, 59, 59, 999);
      where.updatedAt.lte = ut;
    }
  }

  const records = await prisma.flightRecord.findMany({
    where,
    orderBy: { date: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: { Attachment: true },
  });
  return records.map((r: FlightRecord) => serializeFlightRecord(r, true));
}

// Helper: safe JSON serialization for responses & logging
function safeStringify(value: unknown) {
  return JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === "undefined") return null; // drop undefined
      if (typeof val === "bigint") return val.toString(); // BigInt -> string
      return val;
    },
  );
}

// Helper: robust parsing of function-call arguments
function parseArgs(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string') {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

// Add type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

// Update the function calls with type safety
async function handleFunctionCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'get_flight_record_by_id': {
      const id = args.id;
      if (!isString(id)) {
        throw new Error('Invalid ID parameter');
      }
      return await getFlightRecordById(id);
    }
    case 'list_attachments_for_record': {
      const id = args.id;
      if (!isString(id)) {
        throw new Error('Invalid ID parameter');
      }
      return await listAttachmentsForRecord(id);
    }
    case 'list_recent_flight_records': {
      const limit = args.limit;
      const safeLimit = isNumber(limit) ? Math.min(Math.max(limit, 1), 20) : 5;
      return await listRecentFlightRecords(safeLimit);
    }
    case 'search_flight_records_by_tail': {
      const tail = args.tail;
      const limit = args.limit;
      if (!isString(tail)) {
        throw new Error('Invalid tail parameter');
      }
      const safeLimit = isNumber(limit) ? Math.min(Math.max(limit, 1), 50) : 10;
      return await searchFlightRecordsByTail(tail, safeLimit);
    }
    case 'search_flight_records': {
      const filters: SearchFilters = {};
      if (isString(args.airline)) filters.airline = args.airline;
      if (isString(args.fleet)) filters.fleet = args.fleet;
      if (isString(args.tail)) filters.tail = args.tail;
      if (isString(args.station)) filters.station = args.station;
      if (isString(args.service)) filters.service = args.service;
      if (isString(args.systemAffected)) filters.systemAffected = args.systemAffected;
      if (typeof args.hasDefect === 'boolean') filters.hasDefect = args.hasDefect;
      if (typeof args.hasTime === 'boolean') filters.hasTime = args.hasTime;
      if (isString(args.blockTime)) filters.blockTime = args.blockTime;
      if (isString(args.outTime)) filters.outTime = args.outTime;
      if (isString(args.logPageNo)) filters.logPageNo = args.logPageNo;
      if (isString(args.discrepancyNote)) filters.discrepancyNote = args.discrepancyNote;
      if (isString(args.rectificationNote)) filters.rectificationNote = args.rectificationNote;
      if (typeof args.hasAttachments === 'boolean') filters.hasAttachments = args.hasAttachments;
      if (isString(args.technician)) filters.technician = args.technician;
      if (isString(args.flightNumber)) filters.flightNumber = args.flightNumber;
      if (isString(args.createdFrom)) filters.createdFrom = args.createdFrom;
      if (isString(args.createdTo)) filters.createdTo = args.createdTo;
      if (isString(args.updatedFrom)) filters.updatedFrom = args.updatedFrom;
      if (isString(args.updatedTo)) filters.updatedTo = args.updatedTo;
      if (isNumber(args.limit)) filters.limit = Math.min(Math.max(args.limit, 1), 100);
      return await searchFlightRecords(filters);
    }
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is available
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages } = body;

    if (!messages) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    // Authenticate user via JWT cookie
    const token = (await cookies()).get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    let user;
    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as { id: string };
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
          createdAt: true,
        },
      });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const appStructurePath = path.join(process.cwd(), 'src', 'app-structure.json');
    const appStructure = fs.readFileSync(appStructurePath, 'utf-8');

    // Create a system message with instructions about page links
    const systemMessage = {
      role: 'system' as const,
      content: `You are a helpful assistant for an aviation maintenance application. When referring to pages or sections of the application, please format them as markdown links like this: [Page Name](/path/to/page).
    
    Here's the application structure:
    ${appStructure}
    Always use the exact path from the 'path' field when creating links. If a path in the application structure contains a placeholder like ':id' (e.g., '/dashboard/flight-records/:id'), and you have a specific ID for that item (e.g., from a database lookup or a function call result such as getFlightRecordById), replace the placeholder in the path with the actual ID. For example, if a flight record ID is '123xyz', the link to its detail page '/dashboard/flight-records/:id' would become '[Flight Record 123xyz](/dashboard/flight-records/123xyz)'.
    Do not mention the underlying file paths or filenames in your responses.
    Respond in a clear, concise manner, avoiding unnecessary technical jargon unless specifically requested.
    Use bullet points for listing multiple options or instructions.
    ⚠️ If the user asks for a page or section of the application, respond only with the markdown link to that page — do not include any explanations, descriptions, or additional content.
    Use these details when relevant to personalise your responses.

    TOOL INSTRUCTIONS:
    You have access to the following tools that let you query real data. Always call them whenever the user requests related information.
    • get_flight_record_by_id (id) – fetch full details for a flight record.
    • list_attachments_for_record (id) – fetch attachment metadata and URLs for a flight record.
    • list_recent_flight_records (limit) – fetch the most recent flight records (default 5).
    • search_flight_records_by_tail (tail, limit) – find flight records that match a given tail number.
    • search_flight_records (filters) – flexible search by airline, fleet, tail, date range, etc.
    If a question requires these data, respond with a function call instead of answering from memory. Only answer directly if the information is clearly unrelated to flight records or attachments.`,
    };

    // Personalised user context for the assistant
    const userSystemMessage = {
      role: 'system' as const,
      content: `Current user information:\n- ID: ${user.id}\n- Full name: ${user.firstName} ${user.lastName}\n- Username: ${user.username}\n- Email: ${user.email}\n- Account created: ${user.createdAt}\nUse these details when relevant to personalise your responses.`,
    };

    // --- First assistant call (may trigger a tool call) ---
    const chatMessages: ChatCompletionRequestMessage[] = [systemMessage, userSystemMessage, ...messages];

    let assistantMessage: ChatCompletionRequestMessage | undefined;

    const firstResponse = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: chatMessages,
      functions: chatFunctions as unknown as ChatCompletionFunctions[],
      function_call: "auto",
      temperature: 1.0,
      max_tokens: 2048,
    });
    const firstData = await firstResponse.json();
    assistantMessage = firstData.choices[0].message as ChatCompletionRequestMessage;
    console.log("First assistant message", JSON.stringify(assistantMessage, null, 2));

    // Handle legacy single function_call or new tool_calls array
    type ToolCall = {
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    };
    function isToolCallArray(obj: unknown): obj is ToolCall[] {
      return Array.isArray(obj) && obj.every(tc => tc && typeof tc.id === 'string' && tc.type === 'function' && typeof tc.function?.name === 'string' && typeof tc.function?.arguments === 'string');
    }
    function isFunctionCall(obj: unknown): obj is { name: string; arguments: string } {
      return !!obj && typeof (obj as { name?: unknown; arguments?: unknown }).name === 'string' && typeof (obj as { name?: unknown; arguments?: unknown }).arguments === 'string';
    }
    let toolCalls: ToolCall[] = [];
    const amsg = assistantMessage as unknown as Record<string, unknown>;
    if (isToolCallArray(amsg.tool_calls)) {
      toolCalls = amsg.tool_calls as ToolCall[];
    } else if (isFunctionCall(amsg.function_call)) {
      toolCalls = [{ id: 'legacy', function: amsg.function_call as { name: string; arguments: string }, type: 'function' }];
    }

    if (toolCalls.length > 0) {
      // Add the assistant function call message once
      chatMessages.push(assistantMessage);

      for (const toolCall of toolCalls) {
        const { name, arguments: args } = toolCall.function;
        let functionResult: unknown = { error: "Unknown function" };

        try {
          const parsedArgs = parseArgs(args);
          console.log(`Executing function: ${name} with args:`, JSON.stringify(parsedArgs));
          
          functionResult = await handleFunctionCall(name, parsedArgs);
          
          console.log(`Function ${name} executed successfully:`, 
            JSON.stringify(functionResult).length > 500 
              ? `[Large result with ${JSON.stringify(functionResult).length} chars]` 
              : JSON.stringify(functionResult)
          );
        } catch (err) {
          console.error(`Error executing function ${name}:`, err);
          functionResult = { error: "Failed to execute function", details: String(err) };
        }

        // Push tool response
        chatMessages.push({
          role: "function" as ChatCompletionRequestMessage["role"],
          tool_call_id: toolCall.id,
          content: safeStringify(functionResult),
        } as ChatCompletionRequestMessage);
      }

      // === Final assistant response handling (may require multiple tool passes) ===
      console.log("Sending tool responses to OpenAI for final response", JSON.stringify(chatMessages.slice(-2), null, 2));

      let followUpData: unknown = null;
      let iteration = 0;
      const maxIterations = 3; // prevent infinite loops

      while (iteration < maxIterations) {
        iteration += 1;
        try {
          const followUpResponse = await openai.createChatCompletion({
            model: "gpt-4o-mini",
            messages: chatMessages,
            functions: chatFunctions as unknown as ChatCompletionFunctions[],
            function_call: "auto",
            temperature: 1.0,
            max_tokens: 2048,
          });
          followUpData = await followUpResponse.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nextMessage = (followUpData as any)?.choices?.[0]?.message as ChatCompletionRequestMessage;
          console.log(`Follow-up #${iteration} response:`, JSON.stringify(nextMessage, null, 2));

          // If the model is asking to execute another function/tool, do it and continue the loop
          let nextToolCalls: ToolCall[] = [];
          const nmsg = nextMessage as unknown as Record<string, unknown>;
          if (isToolCallArray(nmsg.tool_calls)) {
            nextToolCalls = nmsg.tool_calls as ToolCall[];
          } else if (isFunctionCall(nmsg.function_call)) {
            nextToolCalls = [{ id: 'legacy', function: nmsg.function_call as { name: string; arguments: string }, type: 'function' }];
          }
          if (nextToolCalls.length > 0) {
            // Push assistant function-call message
            chatMessages.push(nextMessage);

            for (const ntc of nextToolCalls) {
              const { name, arguments: nArgs } = ntc.function;
              let result: unknown = { error: "Unknown function" };
              try {
                const parsed = parseArgs(nArgs);
                console.log(`Executing follow-up function ${name} with args:`, JSON.stringify(parsed));
                result = await handleFunctionCall(name, parsed);
                console.log(`Follow-up function ${name} executed:`, JSON.stringify(result).length > 500 ? `[Large with ${JSON.stringify(result).length} chars]` : JSON.stringify(result));
              } catch (err) {
                console.error(`Error executing follow-up function ${name}:`, err);
                result = { error: "Failed to execute function", details: String(err) };
              }
              chatMessages.push({ role: "function" as ChatCompletionRequestMessage["role"], tool_call_id: ntc.id, content: safeStringify(result) } as ChatCompletionRequestMessage);
            }
            // Continue loop to let model consume new tool results
            continue;
          }

          // If we have a normal assistant message, use it and break
          assistantMessage = nextMessage;
          break;
        } catch (err) {
          console.error("Error in follow-up OpenAI call:", err);
          break;
        }
      }

      if (!assistantMessage || !assistantMessage.content) {
        assistantMessage = {
          role: "assistant",
          content: "Sorry, I found your flight information but encountered an error formatting the response. Please try again or view the flight records directly in the dashboard.",
        } as ChatCompletionRequestMessage;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        role: 'assistant',
        content: assistantMessage.content,
      },
    });
  } catch (error: unknown) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}