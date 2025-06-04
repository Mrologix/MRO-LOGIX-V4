import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
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

    // Get the version with file info
    const version = await prisma.manualVersion.findUnique({
      where: {
        id: versionId,
        manualId: id,
      },
      include: {
        file: true,
        manual: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json(
        { message: "Version not found" },
        { status: 404 }
      );
    }

    // Check if file exists
    if (!existsSync(version.file.fileKey)) {
      return NextResponse.json(
        { message: "File not found" },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await readFile(version.file.fileKey);

    // Create response with file
    const response = new NextResponse(fileBuffer);
    response.headers.set(
      "Content-Type",
      version.file.fileType || "application/octet-stream"
    );
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="${version.file.name}"`
    );

    return response;
  } catch (error) {
    console.error("Error downloading version:", error);
    return NextResponse.json(
      { message: "Failed to download version" },
      { status: 500 }
    );
  }
} 