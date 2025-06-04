import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and Word documents are allowed." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const filePath = join(UPLOAD_DIR, uniqueFilename);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create manual record in database
    const manual = await prisma.manual.create({
      data: {
        name: file.name,
        number: `DOC-${Date.now().toString().slice(-6)}`,
        status: "DRAFT",
        fileKey: uniqueFilename,
        fileType: file.type,
        fileSize: file.size,
      } as any,
    });

    return NextResponse.json({ manual });
  } catch (error) {
    console.error("Error uploading manual:", error);
    return NextResponse.json(
      { error: "Failed to upload manual" },
      { status: 500 }
    );
  }
} 