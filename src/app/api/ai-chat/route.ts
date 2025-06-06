import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import prisma from "@/lib/db";
import { getFileUrl } from "@/lib/s3";

// Check for OpenAI API key
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.warn('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: openaiApiKey || '',
});

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

  // STOCK INVENTORY
  {
    name: "search_stock_inventory",
    description: "Search stock inventory records by various filters like part number, serial number, station, owner, description, etc.",
    parameters: {
      type: "object",
      properties: {
        partNo: { type: "string", description: "Part number to search for" },
        serialNo: { type: "string", description: "Serial number to search for" },
        description: { type: "string", description: "Description text to search for" },
        station: { type: "string", description: "Station where inventory is located" },
        owner: { type: "string", description: "Owner of the inventory item" },
        type: { type: "string", description: "Type of inventory item" },
        location: { type: "string", description: "Storage location" },
        hasExpired: { type: "boolean", description: "Filter by expired items" },
        hasInspection: { type: "boolean", description: "Whether item has inspection records" },
        inspectionResult: { type: "string", description: "Inspection result (Passed/Failed)" },
        technician: { type: "string", description: "Technician name" },
        dateFrom: { type: "string", description: "ISO date for incoming date start" },
        dateTo: { type: "string", description: "ISO date for incoming date end" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: "get_stock_inventory_by_id",
    description: "Get detailed information about a specific stock inventory item by ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "The unique identifier of the StockInventory record" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_recent_stock_inventory",
    description: "List the most recent stock inventory records.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Number of records to return (1-50)", minimum: 1, maximum: 50, default: 10 },
      },
    },
  },

  // TEMPERATURE CONTROL
  {
    name: "search_temperature_control",
    description: "Search temperature control records by location, date range, temperature/humidity ranges, or employee.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "Location where temperature was recorded" },
        employeeName: { type: "string", description: "Employee who recorded the measurement" },
        dateFrom: { type: "string", description: "ISO date for start of date range" },
        dateTo: { type: "string", description: "ISO date for end of date range" },
        tempMin: { type: "number", description: "Minimum temperature threshold" },
        tempMax: { type: "number", description: "Maximum temperature threshold" },
        humidityMin: { type: "number", description: "Minimum humidity threshold" },
        humidityMax: { type: "number", description: "Maximum humidity threshold" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: "list_recent_temperature_control",
    description: "List the most recent temperature control records.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Number of records to return (1-50)", minimum: 1, maximum: 50, default: 10 },
      },
    },
  },

  // TECHNICIAN TRAINING
  {
    name: "search_technician_training",
    description: "Search technician training records by technician name, organization, training type, date range, etc.",
    parameters: {
      type: "object",
      properties: {
        technician: { type: "string", description: "Technician name" },
        organization: { type: "string", description: "Training organization" },
        type: { type: "string", description: "Type of training" },
        training: { type: "string", description: "Training description or name" },
        engineType: { type: "string", description: "Engine type for engine-related training" },
        hasEngine: { type: "boolean", description: "Whether training is engine-related" },
        hasHours: { type: "boolean", description: "Whether training has recorded hours" },
        dateFrom: { type: "string", description: "ISO date for start of date range" },
        dateTo: { type: "string", description: "ISO date for end of date range" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: "get_technician_training_by_id",
    description: "Get detailed information about a specific technician training record by ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "The unique identifier of the TechnicianTraining record" },
      },
      required: ["id"],
    },
  },

  // SMS REPORTS
  {
    name: "search_sms_reports",
    description: "Search SMS (Safety Management System) reports by various criteria like report type, priority, status, etc.",
    parameters: {
      type: "object",
      properties: {
        reportType: { type: "string", description: "Type of SMS report" },
        priority: { type: "string", description: "Report priority level" },
        status: { type: "string", description: "Report status" },
        submitter: { type: "string", description: "Person who submitted the report" },
        dateFrom: { type: "string", description: "ISO date for start of date range" },
        dateTo: { type: "string", description: "ISO date for end of date range" },
        description: { type: "string", description: "Text to search in report description" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },

  // SDR REPORTS
  {
    name: "search_sdr_reports",
    description: "Search SDR (Service Difficulty Report) reports by control number, submitter, aircraft details, part details, etc.",
    parameters: {
      type: "object",
      properties: {
        controlNumber: { type: "string", description: "SDR control number" },
        reportTitle: { type: "string", description: "Title of the SDR report" },
        submitter: { type: "string", description: "Person who submitted the report" },
        submitterName: { type: "string", description: "Full name of submitter" },
        station: { type: "string", description: "Station where report was filed" },
        condition: { type: "string", description: "Condition that triggered the report" },
        flightNumber: { type: "string", description: "Associated flight number" },
        airplaneModel: { type: "string", description: "Aircraft model" },
        airplaneTailNumber: { type: "string", description: "Aircraft tail number" },
        partNumber: { type: "string", description: "Part number involved" },
        serialNumber: { type: "string", description: "Serial number of part" },
        ataSystemCode: { type: "string", description: "ATA system code" },
        problemDescription: { type: "string", description: "Text to search in problem description" },
        dateFrom: { type: "string", description: "ISO date for start of difficulty date range" },
        dateTo: { type: "string", description: "ISO date for end of difficulty date range" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: "get_sdr_report_by_id",
    description: "Get detailed information about a specific SDR report by ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "The unique identifier of the SDR report" },
      },
      required: ["id"],
    },
  },

  // TECHNICAL QUERIES
  {
    name: "search_technical_queries",
    description: "Search technical queries/questions by title, description, category, status, tags, etc.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Text to search in query title" },
        description: { type: "string", description: "Text to search in query description" },
        category: { type: "string", description: "Query category (e.g., Engine, Avionics, Hydraulics)" },
        priority: { type: "string", description: "Priority level (LOW, MEDIUM, HIGH, URGENT)" },
        status: { type: "string", description: "Query status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)" },
        tags: { type: "string", description: "Tags associated with the query" },
        isResolved: { type: "boolean", description: "Whether the query is resolved" },
        createdBy: { type: "string", description: "Person who created the query" },
        dateFrom: { type: "string", description: "ISO date for start of created date range" },
        dateTo: { type: "string", description: "ISO date for end of created date range" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: "get_technical_query_by_id",
    description: "Get detailed information about a specific technical query including responses by ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "The unique identifier of the TechnicalQuery" },
      },
      required: ["id"],
    },
  },

  // INCOMING INSPECTIONS
  {
    name: "search_incoming_inspections",
    description: "Search incoming inspection records by inspector, part details, inspection results, etc.",
    parameters: {
      type: "object",
      properties: {
        inspector: { type: "string", description: "Inspector name" },
        partNo: { type: "string", description: "Part number being inspected" },
        serialNo: { type: "string", description: "Serial number being inspected" },
        description: { type: "string", description: "Part description" },
        productMatch: { type: "string", description: "Product match result (YES/NO/N/A)" },
        productSpecs: { type: "string", description: "Product specs result (YES/NO/N/A)" },
        physicalCondition: { type: "string", description: "Physical condition result (YES/NO/N/A)" },
        dateFrom: { type: "string", description: "ISO date for start of inspection date range" },
        dateTo: { type: "string", description: "ISO date for end of inspection date range" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
  {
    name: "get_incoming_inspection_by_id",
    description: "Get detailed information about a specific incoming inspection by ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "The unique identifier of the IncomingInspection record" },
      },
      required: ["id"],
    },
  },

  // AIRPORT ID
  {
    name: "search_airport_id",
    description: "Search airport ID records by employee name, station, badge ID, expiration status, etc.",
    parameters: {
      type: "object",
      properties: {
        employeeName: { type: "string", description: "Employee name" },
        station: { type: "string", description: "Airport station" },
        badgeIdNumber: { type: "string", description: "Badge ID number" },
        isExpired: { type: "boolean", description: "Filter by expired badges" },
        expiringWithinDays: { type: "integer", description: "Find badges expiring within specified days" },
        dateFrom: { type: "string", description: "ISO date for start of issue date range" },
        dateTo: { type: "string", description: "ISO date for end of issue date range" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },

  // USER ACTIVITY
  {
    name: "search_user_activity",
    description: "Search user activity logs by user, action type, resource type, date range, etc.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", description: "Action type (LOGIN, LOGOUT, ADDED_FLIGHT_RECORD, etc.)" },
        resourceType: { type: "string", description: "Resource type (FLIGHT_RECORD, STOCK_INVENTORY, etc.)" },
        userId: { type: "string", description: "User ID who performed the action" },
        dateFrom: { type: "string", description: "ISO date for start of activity date range" },
        dateTo: { type: "string", description: "ISO date for end of activity date range" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
    },
  },

  // GENERAL STATISTICS
  {
    name: "get_dashboard_statistics",
    description: "Get overall statistics and counts from various modules in the system.",
    parameters: {
      type: "object",
      properties: {
        modules: {
          type: "array",
          items: { type: "string" },
          description: "Array of modules to get stats for: flight_records, stock_inventory, temperature_control, technician_training, sms_reports, sdr_reports, technical_queries, incoming_inspections, airport_id, user_activity",
        },
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
    // FLIGHT RECORDS
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

    // STOCK INVENTORY
    case 'search_stock_inventory': {
      return await searchStockInventory(args);
    }
    case 'get_stock_inventory_by_id': {
      const id = args.id;
      if (!isString(id)) {
        throw new Error('Invalid ID parameter');
      }
      return await getStockInventoryById(id);
    }
    case 'list_recent_stock_inventory': {
      const limit = args.limit;
      const safeLimit = isNumber(limit) ? Math.min(Math.max(limit, 1), 50) : 10;
      return await listRecentStockInventory(safeLimit);
    }

    // TEMPERATURE CONTROL
    case 'search_temperature_control': {
      return await searchTemperatureControl(args);
    }
    case 'list_recent_temperature_control': {
      const limit = args.limit;
      const safeLimit = isNumber(limit) ? Math.min(Math.max(limit, 1), 50) : 10;
      return await listRecentTemperatureControl(safeLimit);
    }

    // TECHNICIAN TRAINING
    case 'search_technician_training': {
      return await searchTechnicianTraining(args);
    }
    case 'get_technician_training_by_id': {
      const id = args.id;
      if (!isString(id)) {
        throw new Error('Invalid ID parameter');
      }
      return await getTechnicianTrainingById(id);
    }

    // SMS REPORTS
    case 'search_sms_reports': {
      return await searchSMSReports(args);
    }

    // SDR REPORTS
    case 'search_sdr_reports': {
      return await searchSDRReports(args);
    }
    case 'get_sdr_report_by_id': {
      const id = args.id;
      if (!isString(id)) {
        throw new Error('Invalid ID parameter');
      }
      return await getSDRReportById(id);
    }

    // TECHNICAL QUERIES
    case 'search_technical_queries': {
      return await searchTechnicalQueries(args);
    }
    case 'get_technical_query_by_id': {
      const id = args.id;
      if (!isString(id)) {
        throw new Error('Invalid ID parameter');
      }
      return await getTechnicalQueryById(id);
    }

    // INCOMING INSPECTIONS
    case 'search_incoming_inspections': {
      return await searchIncomingInspections(args);
    }
    case 'get_incoming_inspection_by_id': {
      const id = args.id;
      if (!isString(id)) {
        throw new Error('Invalid ID parameter');
      }
      return await getIncomingInspectionById(id);
    }

    // AIRPORT ID
    case 'search_airport_id': {
      return await searchAirportID(args);
    }

    // USER ACTIVITY
    case 'search_user_activity': {
      return await searchUserActivity(args);
    }

    // DASHBOARD STATISTICS
    case 'get_dashboard_statistics': {
      const modules = args.modules;
      if (!Array.isArray(modules)) {
        throw new Error('Invalid modules parameter - must be array');
      }
      return await getDashboardStatistics(modules as string[]);
    }

    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

// === STOCK INVENTORY HELPERS ===
async function searchStockInventory(filters: any) {
  const {
    partNo, serialNo, description, station, owner, type, location,
    hasExpired, hasInspection, inspectionResult, technician,
    dateFrom, dateTo, limit = 20
  } = filters;

  const where: any = {};
  if (partNo) where.partNo = { contains: partNo, mode: 'insensitive' };
  if (serialNo) where.serialNo = { contains: serialNo, mode: 'insensitive' };
  if (description) where.description = { contains: description, mode: 'insensitive' };
  if (station) where.station = { contains: station, mode: 'insensitive' };
  if (owner) where.owner = { contains: owner, mode: 'insensitive' };
  if (type) where.type = { contains: type, mode: 'insensitive' };
  if (location) where.location = { contains: location, mode: 'insensitive' };
  if (typeof hasInspection === 'boolean') where.hasInspection = hasInspection;
  if (inspectionResult) where.inspectionResult = { equals: inspectionResult, mode: 'insensitive' };
  if (technician) where.technician = { contains: technician, mode: 'insensitive' };

  if (hasExpired === true) {
    where.hasExpireDate = true;
    where.expireDate = { lt: new Date() };
  } else if (hasExpired === false) {
    where.OR = [
      { hasExpireDate: false },
      { hasExpireDate: true, expireDate: { gte: new Date() } }
    ];
  }

  if (dateFrom || dateTo) {
    where.incomingDate = {};
    if (dateFrom) where.incomingDate.gte = new Date(dateFrom);
    if (dateTo) where.incomingDate.lte = new Date(dateTo);
  }

  const records = await prisma.stockInventory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: { Attachment: true }
  });

  return records.map(record => ({
    id: record.id,
    incomingDate: record.incomingDate,
    station: record.station,
    owner: record.owner,
    description: record.description,
    partNo: record.partNo,
    serialNo: record.serialNo,
    quantity: record.quantity,
    hasExpireDate: record.hasExpireDate,
    expireDate: record.expireDate,
    type: record.type,
    location: record.location,
    hasInspection: record.hasInspection,
    inspectionResult: record.inspectionResult,
    technician: record.technician,
    hasAttachments: record.hasAttachments,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }));
}

async function getStockInventoryById(id: string) {
  const record = await prisma.stockInventory.findUnique({
    where: { id },
    include: { Attachment: true, IncomingInspection: true }
  });
  return record;
}

async function listRecentStockInventory(limit: number = 10) {
  const records = await prisma.stockInventory.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 50),
    include: { Attachment: true }
  });
  return records;
}

// === TEMPERATURE CONTROL HELPERS ===
async function searchTemperatureControl(filters: any) {
  const {
    location, employeeName, dateFrom, dateTo,
    tempMin, tempMax, humidityMin, humidityMax, limit = 20
  } = filters;

  const where: any = {};
  if (location) where.location = { contains: location, mode: 'insensitive' };
  if (employeeName) where.employeeName = { contains: employeeName, mode: 'insensitive' };

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  if (tempMin !== undefined || tempMax !== undefined) {
    where.temperature = {};
    if (tempMin !== undefined) where.temperature.gte = tempMin;
    if (tempMax !== undefined) where.temperature.lte = tempMax;
  }

  if (humidityMin !== undefined || humidityMax !== undefined) {
    where.humidity = {};
    if (humidityMin !== undefined) where.humidity.gte = humidityMin;
    if (humidityMax !== undefined) where.humidity.lte = humidityMax;
  }

  const records = await prisma.temperatureControl.findMany({
    where,
    orderBy: { date: 'desc' },
    take: Math.min(Math.max(limit, 1), 100)
  });

  return records;
}

async function listRecentTemperatureControl(limit: number = 10) {
  const records = await prisma.temperatureControl.findMany({
    orderBy: { date: 'desc' },
    take: Math.min(Math.max(limit, 1), 50)
  });
  return records;
}

// === TECHNICIAN TRAINING HELPERS ===
async function searchTechnicianTraining(filters: any) {
  const {
    technician, organization, type, training, engineType,
    hasEngine, hasHours, dateFrom, dateTo, limit = 20
  } = filters;

  const where: any = {};
  if (technician) where.technician = { contains: technician, mode: 'insensitive' };
  if (organization) where.organization = { contains: organization, mode: 'insensitive' };
  if (type) where.type = { contains: type, mode: 'insensitive' };
  if (training) where.training = { contains: training, mode: 'insensitive' };
  if (engineType) where.engineType = { contains: engineType, mode: 'insensitive' };
  if (typeof hasEngine === 'boolean') where.hasEngine = hasEngine;
  if (typeof hasHours === 'boolean') where.hasHours = hasHours;

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  const records = await prisma.technicianTraining.findMany({
    where,
    orderBy: { date: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: { Attachment: true }
  });

  return records;
}

async function getTechnicianTrainingById(id: string) {
  const record = await prisma.technicianTraining.findUnique({
    where: { id },
    include: { Attachment: true }
  });
  return record;
}

// === SMS REPORTS HELPERS ===
async function searchSMSReports(filters: any) {
  const {
    reportType, priority, status, submitter, dateFrom, dateTo,
    description, limit = 20
  } = filters;

  const where: any = {};
  if (reportType) where.reportType = { contains: reportType, mode: 'insensitive' };
  if (priority) where.priority = { equals: priority, mode: 'insensitive' };
  if (status) where.status = { equals: status, mode: 'insensitive' };
  if (submitter) where.submitter = { contains: submitter, mode: 'insensitive' };
  if (description) {
    where.OR = [
      { description: { contains: description, mode: 'insensitive' } },
      { title: { contains: description, mode: 'insensitive' } }
    ];
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const records = await prisma.sMSReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: { Attachment: true }
  });

  return records;
}

// === SDR REPORTS HELPERS ===
async function searchSDRReports(filters: any) {
  const {
    controlNumber, reportTitle, submitter, submitterName, station,
    condition, flightNumber, airplaneModel, airplaneTailNumber,
    partNumber, serialNumber, ataSystemCode, problemDescription,
    dateFrom, dateTo, limit = 20
  } = filters;

  const where: any = {};
  if (controlNumber) where.controlNumber = { contains: controlNumber, mode: 'insensitive' };
  if (reportTitle) where.reportTitle = { contains: reportTitle, mode: 'insensitive' };
  if (submitter) where.submitter = { contains: submitter, mode: 'insensitive' };
  if (submitterName) where.submitterName = { contains: submitterName, mode: 'insensitive' };
  if (station) where.station = { contains: station, mode: 'insensitive' };
  if (condition) where.condition = { contains: condition, mode: 'insensitive' };
  if (flightNumber) where.flightNumber = { contains: flightNumber, mode: 'insensitive' };
  if (airplaneModel) where.airplaneModel = { contains: airplaneModel, mode: 'insensitive' };
  if (airplaneTailNumber) where.airplaneTailNumber = { contains: airplaneTailNumber, mode: 'insensitive' };
  if (partNumber) where.partNumber = { contains: partNumber, mode: 'insensitive' };
  if (serialNumber) where.serialNumber = { contains: serialNumber, mode: 'insensitive' };
  if (ataSystemCode) where.ataSystemCode = { contains: ataSystemCode, mode: 'insensitive' };
  if (problemDescription) where.problemDescription = { contains: problemDescription, mode: 'insensitive' };

  if (dateFrom || dateTo) {
    where.difficultyDate = {};
    if (dateFrom) where.difficultyDate.gte = new Date(dateFrom);
    if (dateTo) where.difficultyDate.lte = new Date(dateTo);
  }

  const records = await prisma.sDRReport.findMany({
    where,
    orderBy: { difficultyDate: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: { Attachment: true }
  });

  return records;
}

async function getSDRReportById(id: string) {
  const record = await prisma.sDRReport.findUnique({
    where: { id },
    include: { Attachment: true }
  });
  return record;
}

// === TECHNICAL QUERIES HELPERS ===
async function searchTechnicalQueries(filters: any) {
  const {
    title, description, category, priority, status, tags, isResolved,
    createdBy, dateFrom, dateTo, limit = 20
  } = filters;

  const where: any = {};
  if (title) where.title = { contains: title, mode: 'insensitive' };
  if (description) where.description = { contains: description, mode: 'insensitive' };
  if (category) where.category = { contains: category, mode: 'insensitive' };
  if (priority) where.priority = { equals: priority };
  if (status) where.status = { equals: status };
  if (typeof isResolved === 'boolean') where.isResolved = isResolved;
  if (createdBy) {
    where.createdBy = {
      OR: [
        { firstName: { contains: createdBy, mode: 'insensitive' } },
        { lastName: { contains: createdBy, mode: 'insensitive' } },
        { username: { contains: createdBy, mode: 'insensitive' } }
      ]
    };
  }
  if (tags) where.tags = { has: tags };

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const records = await prisma.technicalQuery.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: {
      createdBy: { select: { firstName: true, lastName: true, username: true } },
      responses: {
        take: 5,
        include: {
          createdBy: { select: { firstName: true, lastName: true, username: true } }
        }
      },
      attachments: true
    }
  });

  return records;
}

async function getTechnicalQueryById(id: string) {
  const record = await prisma.technicalQuery.findUnique({
    where: { id },
    include: {
      createdBy: { select: { firstName: true, lastName: true, username: true } },
      updatedBy: { select: { firstName: true, lastName: true, username: true } },
      resolvedBy: { select: { firstName: true, lastName: true, username: true } },
      responses: {
        include: {
          createdBy: { select: { firstName: true, lastName: true, username: true } },
          attachments: true
        }
      },
      attachments: true,
      votes: true
    }
  });
  return record;
}

// === INCOMING INSPECTIONS HELPERS ===
async function searchIncomingInspections(filters: any) {
  const {
    inspector, partNo, serialNo, description, productMatch,
    productSpecs, physicalCondition, dateFrom, dateTo, limit = 20
  } = filters;

  const where: any = {};
  if (inspector) where.inspector = { contains: inspector, mode: 'insensitive' };
  if (partNo) where.partNo = { contains: partNo, mode: 'insensitive' };
  if (serialNo) where.serialNo = { contains: serialNo, mode: 'insensitive' };
  if (description) where.description = { contains: description, mode: 'insensitive' };
  if (productMatch) where.productMatch = { equals: productMatch };
  if (productSpecs) where.productSpecs = { equals: productSpecs };
  if (physicalCondition) where.physicalCondition = { equals: physicalCondition };

  if (dateFrom || dateTo) {
    where.inspectionDate = {};
    if (dateFrom) where.inspectionDate.gte = new Date(dateFrom);
    if (dateTo) where.inspectionDate.lte = new Date(dateTo);
  }

  const records = await prisma.incomingInspection.findMany({
    where,
    orderBy: { inspectionDate: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: { Attachment: true, StockInventory: true }
  });

  return records;
}

async function getIncomingInspectionById(id: string) {
  const record = await prisma.incomingInspection.findUnique({
    where: { id },
    include: { Attachment: true, StockInventory: true }
  });
  return record;
}

// === AIRPORT ID HELPERS ===
async function searchAirportID(filters: any) {
  const {
    employeeName, station, badgeIdNumber, isExpired,
    expiringWithinDays, dateFrom, dateTo, limit = 20
  } = filters;

  const where: any = {};
  if (employeeName) where.employeeName = { contains: employeeName, mode: 'insensitive' };
  if (station) where.station = { contains: station, mode: 'insensitive' };
  if (badgeIdNumber) where.badgeIdNumber = { contains: badgeIdNumber, mode: 'insensitive' };

  if (isExpired === true) {
    where.expireDate = { lt: new Date() };
  } else if (isExpired === false) {
    where.expireDate = { gte: new Date() };
  }

  if (expiringWithinDays) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + expiringWithinDays);
    where.expireDate = { 
      gte: new Date(),
      lte: targetDate
    };
  }

  if (dateFrom || dateTo) {
    where.idIssuedDate = {};
    if (dateFrom) where.idIssuedDate.gte = new Date(dateFrom);
    if (dateTo) where.idIssuedDate.lte = new Date(dateTo);
  }

  const records = await prisma.airportID.findMany({
    where,
    orderBy: { idIssuedDate: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: { Attachment: true }
  });

  return records;
}

// === USER ACTIVITY HELPERS ===
async function searchUserActivity(filters: any) {
  const {
    action, resourceType, userId, dateFrom, dateTo, limit = 20
  } = filters;

  const where: any = {};
  if (action) where.action = { equals: action };
  if (resourceType) where.resourceType = { equals: resourceType };
  if (userId) where.userId = userId;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const records = await prisma.userActivity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: { user: { select: { firstName: true, lastName: true, username: true } } }
  });

  return records;
}

// === DASHBOARD STATISTICS HELPER ===
async function getDashboardStatistics(modules: string[]) {
  const stats: Record<string, any> = {};

  for (const module of modules) {
    switch (module) {
      case 'flight_records':
        stats.flight_records = {
          total: await prisma.flightRecord.count(),
          withDefects: await prisma.flightRecord.count({ where: { hasDefect: true } }),
          withAttachments: await prisma.flightRecord.count({ where: { hasAttachments: true } }),
          recentCount: await prisma.flightRecord.count({
            where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
          })
        };
        break;
      case 'stock_inventory':
        stats.stock_inventory = {
          total: await prisma.stockInventory.count(),
          withInspection: await prisma.stockInventory.count({ where: { hasInspection: true } }),
          expired: await prisma.stockInventory.count({
            where: { hasExpireDate: true, expireDate: { lt: new Date() } }
          })
        };
        break;
      case 'temperature_control':
        stats.temperature_control = {
          total: await prisma.temperatureControl.count(),
          recentCount: await prisma.temperatureControl.count({
            where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
          })
        };
        break;
      case 'technician_training':
        stats.technician_training = {
          total: await prisma.technicianTraining.count(),
          withEngine: await prisma.technicianTraining.count({ where: { hasEngine: true } }),
          withHours: await prisma.technicianTraining.count({ where: { hasHours: true } })
        };
        break;
      case 'sms_reports':
        stats.sms_reports = {
          total: await prisma.sMSReport.count(),
          recentCount: await prisma.sMSReport.count({
            where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
          })
        };
        break;
      case 'sdr_reports':
        stats.sdr_reports = {
          total: await prisma.sDRReport.count(),
          recentCount: await prisma.sDRReport.count({
            where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
          })
        };
        break;
      case 'technical_queries':
        stats.technical_queries = {
          total: await prisma.technicalQuery.count(),
          resolved: await prisma.technicalQuery.count({ where: { isResolved: true } }),
          open: await prisma.technicalQuery.count({ where: { status: 'OPEN' } })
        };
        break;
      case 'incoming_inspections':
        stats.incoming_inspections = {
          total: await prisma.incomingInspection.count(),
          recentCount: await prisma.incomingInspection.count({
            where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
          })
        };
        break;
      case 'airport_id':
        stats.airport_id = {
          total: await prisma.airportID.count(),
          expired: await prisma.airportID.count({ where: { expireDate: { lt: new Date() } } }),
          expiringSoon: await prisma.airportID.count({
            where: {
              expireDate: {
                gte: new Date(),
                lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              }
            }
          })
        };
        break;
      case 'user_activity':
        stats.user_activity = {
          total: await prisma.userActivity.count(),
          recentCount: await prisma.userActivity.count({
            where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
          })
        };
        break;
    }
  }

  return stats;
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
    const appStructureRaw = fs.readFileSync(appStructurePath, 'utf-8');
    const appStructure = JSON.parse(appStructureRaw);

    // Determine if this is the first message in the session
    const isFirstMessage = messages.length === 1;
    
    // Get the system prompt from app-structure.json and customize it
    let baseSystemPrompt = appStructure.assistant?.systemPrompt || 
      `You are the MRO Logix in-app assistant. For the first message in a chat session, start with: 'Welcome, {firstName} {lastName}!' followed by a brief, friendly greeting. Then, for the rest of the session, answer questions about the web app strictly from the JSON below. When referring to a page, always return the page name as a markdown link using its 'path'. If you cannot find the answer, say you don't know.`;

    // Replace placeholder with actual user name if it's the first message
    if (isFirstMessage) {
      baseSystemPrompt = baseSystemPrompt.replace('{firstName}', user.firstName)
                                         .replace('{lastName}', user.lastName);
    }

    // Build comprehensive instructions from app-structure.json
    const comprehensiveInstructions = appStructure.assistant?.comprehensiveInstructions;
    let toolInstructionsText = '';
    
    if (comprehensiveInstructions?.toolInstructions) {
      toolInstructionsText = `COMPREHENSIVE TOOL INSTRUCTIONS:
${comprehensiveInstructions.toolInstructions.overview}

`;
      
      // Build tool categories documentation
      comprehensiveInstructions.toolInstructions.categories.forEach((category: any) => {
        toolInstructionsText += `${category.name}:\n`;
        category.functions.forEach((func: any) => {
          const paramsText = func.params.length > 0 ? ` (${func.params.join(', ')})` : '';
          toolInstructionsText += `• ${func.name}${paramsText} – ${func.description}\n`;
        });
        toolInstructionsText += '\n';
      });
      
      toolInstructionsText += comprehensiveInstructions.toolInstructions.usageGuideline;
    }

    // Navigation rules from app-structure.json
    const navigationRules = comprehensiveInstructions?.applicationGuidance?.navigationRules || [];
    const navigationText = navigationRules.length > 0 
      ? `APPLICATION STRUCTURE AND NAVIGATION:\n${navigationRules.join('\n')}\n\n` 
      : '';

    // Create a comprehensive system message that includes both app structure and tool instructions
    const systemMessage = {
      role: 'system' as const,
      content: `${baseSystemPrompt}

${navigationText}APPLICATION STRUCTURE:
${JSON.stringify(appStructure, null, 2)}

${toolInstructionsText}`,
    };

    // Personalised user context for the assistant
    const userSystemMessage = {
      role: 'system' as const,
      content: `Current user information:\n- ID: ${user.id}\n- Full name: ${user.firstName} ${user.lastName}\n- Username: ${user.username}\n- Email: ${user.email}\n- Account created: ${user.createdAt}\nUse these details when relevant to personalise your responses.`,
    };

    // --- First assistant call (may trigger a tool call) ---
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [systemMessage, userSystemMessage, ...messages];

    let assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage | undefined;

    const firstResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      tools: chatFunctions.map(func => ({
        type: "function" as const,
        function: func
      })),
      tool_choice: "auto",
      temperature: 1.0,
      max_tokens: 2048,
    });
    assistantMessage = firstResponse.choices[0].message;
    console.log("First assistant message", JSON.stringify(assistantMessage, null, 2));

    // Handle tool calls from the modern OpenAI SDK
    const toolCalls = assistantMessage?.tool_calls || [];

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
          role: "tool",
          tool_call_id: toolCall.id,
          content: safeStringify(functionResult),
        });
      }

      // === Final assistant response handling (may require multiple tool passes) ===
      console.log("Sending tool responses to OpenAI for final response", JSON.stringify(chatMessages.slice(-2), null, 2));

      let followUpData: unknown = null;
      let iteration = 0;
      const maxIterations = 3; // prevent infinite loops

      while (iteration < maxIterations) {
        iteration += 1;
        try {
          const followUpResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: chatMessages,
            tools: chatFunctions.map(func => ({
              type: "function" as const,
              function: func
            })),
            tool_choice: "auto",
            temperature: 1.0,
            max_tokens: 2048,
          });
          const nextMessage = followUpResponse.choices[0].message;
          console.log(`Follow-up #${iteration} response:`, JSON.stringify(nextMessage, null, 2));

          // If the model is asking to execute another function/tool, do it and continue the loop
          const nextToolCalls = nextMessage.tool_calls || [];
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
              chatMessages.push({ role: "tool", tool_call_id: ntc.id, content: safeStringify(result) });
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
          refusal: null,
        };
      }
    }

    // Ensure assistantMessage is defined
    if (!assistantMessage) {
      assistantMessage = {
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        refusal: null,
      };
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