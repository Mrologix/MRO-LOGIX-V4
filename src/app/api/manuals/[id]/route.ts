import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { writeFile } from "fs/promises";
import { deleteDocumentFile } from "@/lib/s3";

const UPLOAD_DIR = join(process.cwd(), "uploads");

// PATCH /api/manuals/[id] - Update manual status
export async function PATCH(
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

    const body = await request.json();
    const { status } = body;

    if (!status || !["DRAFT", "APPROVED", "ARCHIVED"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid status value" },
        { status: 400 }
      );
    }

    const manual = await prisma.manual.update({
      where: { id },
      data: {
        status: status as any,
        updatedById: decoded.id,
      },
    });

    return NextResponse.json({ manual });
  } catch (error) {
    console.error("Error updating manual:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update manual" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Get the manual with its versions
    const manual = await prisma.manual.findUnique({
      where: { id },
      include: {
        versions: {
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

    // Delete all files from S3
    const deletePromises = manual.versions.map(async (version) => {
      if (version.file.fileKey) {
        try {
          await deleteDocumentFile(version.file.fileKey);
        } catch (error) {
          console.error(`Failed to delete file ${version.file.fileKey} from S3:`, error);
          // Continue with deletion even if S3 deletion fails
        }
      }
    });

    await Promise.allSettled(deletePromises);

    // Delete the manual (this will cascade delete all versions, comments, etc.)
    await prisma.manual.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting manual:", error);
    return NextResponse.json(
      { error: "Failed to delete manual" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const token = (await cookies()).get("token")?.value;

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
    const status = formData.get("status") as "DRAFT" | "APPROVED" | "ARCHIVED";
    const description = formData.get("description") as string;
    const keywords = (formData.get("keywords") as string)
      ?.split(",")
      .map((k) => k.trim())
      .filter(Boolean) || [];
    const file = formData.get("file") as File | null;
    const comment = formData.get("comment") as string | null;

    // Validate status
    if (!["DRAFT", "APPROVED", "ARCHIVED"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      );
    }

    // Get current manual
    const currentManual = await prisma.manual.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            file: true,
          },
        },
      },
    });

    if (!currentManual) {
      return NextResponse.json(
        { message: "Manual not found" },
        { status: 404 }
      );
    }

    // Start a transaction to update manual and create new version if needed
    const updatedManual = await prisma.$transaction(async (tx) => {
      // Update manual details
      const manual = await tx.manual.update({
        where: { id },
        data: {
          name,
          status,
          description,
          keywords,
          updatedAt: new Date(),
          updatedById: userId,
        },
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
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

      // If a new file is uploaded, create a new version
      if (file) {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = join(process.cwd(), "uploads", fileName);
        const fileType = file.type;
        const fileSize = file.size;

        // Save the file
        await writeFile(filePath, fileBuffer);

        // Create new version
        const newVersion = await (tx as any).manualVersion.create({
          data: {
            manualId: manual.id,
            versionNumber: (manual.versions[0]?.versionNumber || 0) + 1,
            comment,
            file: {
              create: {
                name: file.name,
                fileKey: filePath,
                fileName: file.name,
                fileType,
                fileSize,
                path: filePath,
                userId: userId,
              },
            },
            editorId: userId,
          } as any,
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

        // Update current version
        await tx.manual.update({
          where: { id: manual.id },
          data: {
            currentVersionId: newVersion.id,
            fileKey: newVersion.file.fileKey,
            fileType: newVersion.file.fileType,
            fileSize: newVersion.file.fileSize,
          },
        });

        // Delete old file if it exists
        if (currentManual.versions[0]?.file.fileKey) {
          const oldFilePath = currentManual.versions[0].file.fileKey;
          if (existsSync(oldFilePath)) {
            await unlink(oldFilePath);
          }
        }

        // Add new version to the response
        manual.versions = [newVersion, ...manual.versions];
      }

      return manual;
    });

    return NextResponse.json({ manual: updatedManual });
  } catch (error) {
    console.error("Error updating manual:", error);
    return NextResponse.json(
      { message: "Failed to update manual" },
      { status: 500 }
    );
  }
} 