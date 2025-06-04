import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { deleteDocumentFile } from '@/lib/s3';

// PUT - Update folder
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
    const { name, description } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Find the folder
    const folder = await prisma.documentFolder.findFirst({
      where: {
        id: id,
        userId: user.id
      },
      include: {
        parent: true
      }
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, message: 'Folder not found' },
        { status: 404 }
      );
    }

    // Check if another folder with the same name exists in the same location
    const existingFolder = await prisma.documentFolder.findFirst({
      where: {
        name,
        parentId: folder.parentId,
        userId: user.id,
        id: { not: id }
      }
    });

    if (existingFolder) {
      return NextResponse.json(
        { success: false, message: 'A folder with this name already exists in this location' },
        { status: 409 }
      );
    }

    // Update folder path if name changed
    const newPath = folder.parent ? `${folder.parent.path}/${name}` : `/${name}`;

    // Update the folder
    const updatedFolder = await prisma.documentFolder.update({
      where: { id: id },
      data: {
        name,
        description: description || null,
        path: newPath
      },
      include: {
        _count: {
          select: {
            files: true,
            children: true
          }
        }
      }
    });

    // Update paths of all child folders if the name changed
    if (folder.name !== name) {
      await updateChildPaths(id, newPath);
    }

    return NextResponse.json({
      success: true,
      data: updatedFolder,
      message: 'Folder updated successfully'
    });

  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

// DELETE - Delete folder
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

    // Find the folder with all its contents
    const folder = await prisma.documentFolder.findFirst({
      where: {
        id: id,
        userId: user.id
      },
      include: {
        files: true,
        children: {
          include: {
            files: true
          }
        }
      }
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, message: 'Folder not found' },
        { status: 404 }
      );
    }

    // Get all files in this folder and its subfolders recursively
    const allFiles = await getAllFilesInFolder(id);

    // Delete all files from S3
    const deletePromises = allFiles.map(file => 
      deleteDocumentFile(file.fileKey).catch(error => {
        console.error(`Failed to delete file ${file.fileKey} from S3:`, error);
        // Continue with deletion even if S3 deletion fails
      })
    );

    await Promise.allSettled(deletePromises);

    // Delete the folder (this will cascade delete all children and files)
    await prisma.documentFolder.delete({
      where: { id: id }
    });

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}

// Helper function to update child folder paths recursively
async function updateChildPaths(folderId: string, newParentPath: string) {
  const children = await prisma.documentFolder.findMany({
    where: { parentId: folderId }
  });

  for (const child of children) {
    const newChildPath = `${newParentPath}/${child.name}`;
    await prisma.documentFolder.update({
      where: { id: child.id },
      data: { path: newChildPath }
    });
    
    // Recursively update grandchildren
    await updateChildPaths(child.id, newChildPath);
  }
}

// Helper function to get all files in a folder recursively
async function getAllFilesInFolder(folderId: string): Promise<{ fileKey: string }[]> {
  const files = await prisma.documentFile.findMany({
    where: { folderId },
    select: { fileKey: true }
  });

  const children = await prisma.documentFolder.findMany({
    where: { parentId: folderId },
    select: { id: true }
  });

  const childFiles = await Promise.all(
    children.map((child: { id: string }) => getAllFilesInFolder(child.id))
  );

  return [...files, ...childFiles.flat()];
}