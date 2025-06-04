import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { uploadDocumentFile } from "@/lib/s3";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { join } from "path";
import { writeFile } from "fs/promises";

// GET /api/manuals – paginated list
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as { id: string };

    const manuals = await prisma.manual.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ manuals });
  } catch (error) {
    console.error("Error fetching manuals:", error);
    return NextResponse.json(
      { error: "Failed to fetch manuals" },
      { status: 500 }
    );
  }
}

// POST /api/manuals – create a new manual (metadata + optional file upload)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as { id: string };
    const userId = decoded.id;

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const number = formData.get("number") as string;
    const revision = formData.get("revision") as string;
    const revisionDate = formData.get("revisionDate") as string;
    const description = formData.get("description") as string;
    const keywords = (formData.get("keywords") as string)
      ?.split(",")
      .map((k) => k.trim())
      .filter(Boolean) || [];
    const file = formData.get("file") as File | null;

    // Log the received data for debugging
    console.log("Received manual data:", {
      name,
      number,
      revision,
      revisionDate,
      description,
      keywords,
      fileInfo: file ? {
        name: file.name,
        type: file.type,
        size: file.size
      } : null
    });

    if (!name || !number || !revision || !revisionDate) {
      return NextResponse.json(
        { message: "Name, number, revision, and revision date are required" },
        { status: 400 }
      );
    }

    // Convert revision date to UTC midnight
    const [year, month, day] = revisionDate.split('-').map(Number);
    const utcRevisionDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (isNaN(utcRevisionDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid revision date" },
        { status: 400 }
      );
    }

    // Check if manual number already exists
    const existingManual = await prisma.manual.findUnique({
      where: { number },
    });

    if (existingManual) {
      return NextResponse.json(
        { message: "Manual number already exists" },
        { status: 400 }
      );
    }

    // Start a transaction to create manual and version if file is provided
    const manual = await prisma.$transaction(async (tx) => {
      try {
        const manual = await tx.manual.create({
          data: {
            name,
            number,
            revision,
            revisionDate: utcRevisionDate,
            description,
            keywords,
            status: "DRAFT",
            fileKey: file ? "pending" : null,
            fileType: file ? file.type : "none",
            fileSize: file ? file.size : 0,
            createdById: userId,
            updatedById: userId,
          },
        });

        if (file) {
          try {
            // Upload file to S3
            const fileKey = await uploadDocumentFile(file, userId, undefined, true);
            console.log("File uploaded successfully:", fileKey);

            // Create initial version
            const version = await tx.manualVersion.create({
              data: {
                versionNumber: 1,
                file: {
                  create: {
                    name: file.name,
                    fileName: file.name,
                    fileKey,
                    fileType: file.type,
                    fileSize: file.size,
                    userId: userId,
                    path: fileKey,
                    tags: keywords,
                    description: description || undefined,
                  },
                },
                editor: {
                  connect: {
                    id: userId
                  }
                },
                manual: {
                  connect: {
                    id: manual.id
                  }
                }
              },
              include: {
                file: true,
                editor: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            });

            // Update manual with version info
            return tx.manual.update({
              where: { id: manual.id },
              data: {
                currentVersionId: version.id,
                fileKey: version.file.fileKey,
                fileType: version.file.fileType,
                fileSize: version.file.fileSize,
              },
              include: {
                versions: {
                  include: {
                    file: true,
                    editor: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            });
          } catch (uploadError) {
            console.error("Error during file upload or version creation:", uploadError);
            throw new Error(`File upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          }
        }

        return manual;
      } catch (dbError) {
        console.error("Database error during manual creation:", dbError);
        throw new Error(`Database operation failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
    });

    return NextResponse.json({ manual });
  } catch (error) {
    console.error("Error creating manual:", error);
    // Return more detailed error information
    return NextResponse.json(
      { 
        message: "Failed to create manual",
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 