import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDocumentFile } from "@/lib/s3";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Auth check
    const token = (await cookies()).get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decoded: { id: string };
    try {
      decoded = verify(token, process.env.JWT_SECRET || "fallback-secret-key") as { id: string };
    } catch {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get the manual with its current version
    const manual = await prisma.manual.findUnique({
      where: { id: id },
      include: {
        currentVersion: {
          include: {
            file: true
          }
        }
      }
    });

    if (!manual) {
      return NextResponse.json(
        { error: "Manual not found" },
        { status: 404 }
      );
    }

    if (!manual.currentVersion?.file.fileKey) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Get the file from S3
    const fileBuffer = await getDocumentFile(manual.currentVersion.file.fileKey);
    
    // Set appropriate headers
    const headers = new Headers();
    headers.set("Content-Type", manual.fileType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${manual.name}"`
    );

    return new NextResponse(fileBuffer, {
      headers,
    });
  } catch (error) {
    console.error("Error downloading manual:", error);
    return NextResponse.json(
      { error: "Failed to download manual" },
      { status: 500 }
    );
  }
} 