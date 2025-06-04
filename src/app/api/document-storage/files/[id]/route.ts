import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { deleteDocumentFile } from '@/lib/s3';

// PUT - Update file metadata
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { fileName, description, tags, folderId } = body;

    // Find the file
    const file = await prisma.documentFile.findFirst({
      where: {
        id: id,
        userId: user.id
      },
      include: {
        folder: true
      }
    });

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }

    // Validate new folder if provided and different from current
    let newFolder = null;
    if (folderId && folderId !== file.folderId) {
      newFolder = await prisma.documentFolder.findFirst({
        where: {
          id: folderId,
          userId: user.id
        }
      });

      if (!newFolder) {
        return NextResponse.json(
          { success: false, message: 'Target folder not found' },
          { status: 404 }
        );
      }

      // Check if file with same name already exists in target folder
      const existingFile = await prisma.documentFile.findFirst({
        where: {
          fileName: fileName || file.fileName,
          folderId: folderId,
          userId: user.id,
          id: { not: id }
        }
      });

      if (existingFile) {
        return NextResponse.json(
          { success: false, message: 'A file with this name already exists in the target folder' },
          { status: 409 }
        );
      }
    }

    // Check if filename is being changed and if it conflicts
    if (fileName && fileName !== file.fileName) {
      const existingFile = await prisma.documentFile.findFirst({
        where: {
          fileName,
          folderId: folderId || file.folderId,
          userId: user.id,
          id: { not: id }
        }
      });

      if (existingFile) {
        return NextResponse.json(
          { success: false, message: 'A file with this name already exists in this location' },
          { status: 409 }
        );
      }
    }

    // Calculate new path
    const targetFolder = newFolder || file.folder;
    const newFileName = fileName || file.fileName;
    const newPath = targetFolder ? `${targetFolder.path}/${newFileName}` : `/${newFileName}`;

    // Update the file
    const updatedFile = await prisma.documentFile.update({
      where: { id: id },
      data: {
        fileName: newFileName,
        description: description !== undefined ? description : file.description,
        tags: tags !== undefined ? tags : file.tags,
        folderId: folderId !== undefined ? (folderId || null) : file.folderId,
        path: newPath
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedFile,
      message: 'File updated successfully'
    });

  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update file' },
      { status: 500 }
    );
  }
}

// DELETE - Delete file
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Find the file
    const file = await prisma.documentFile.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }

    // Delete file from S3
    try {
      await deleteDocumentFile(file.fileKey);
    } catch (error) {
      console.error(`Failed to delete file ${file.fileKey} from S3:`, error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete file record from database
    await prisma.documentFile.delete({
      where: { id: id }
    });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete file' },
      { status: 500 }
    );
  }
}