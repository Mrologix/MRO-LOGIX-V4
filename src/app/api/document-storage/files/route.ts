import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { uploadDocumentFile } from '@/lib/s3';

// Maximum file size limit (250MB in bytes)
const MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;

// POST - Upload files
export async function POST(request: Request) {
  try {
    console.log('Upload files request received');
    const session = await getServerSession();
    console.log('Session:', session);
    
    if (!session?.user?.email) {
      console.log('No session or user email found');
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
    }    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folderId = formData.get('folderId') as string;
    const tags = formData.get('tags') as string;
    const description = formData.get('description') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No files provided' },
        { status: 400 }
      );
    }

    // Calculate total size of files
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    // Check if total size exceeds the limit
    if (totalSize > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: `Total upload size (${(totalSize / (1024 * 1024)).toFixed(2)}MB) exceeds the 250MB limit` },
        { status: 400 }
      );
    }

    // Validate folder if provided
    let folder = null;
    let folderPath = '';
    if (folderId) {
      folder = await prisma.documentFolder.findFirst({
        where: {
          id: folderId,
          userId: user.id
        }
      });

      if (!folder) {
        return NextResponse.json(
          { success: false, message: 'Folder not found' },
          { status: 404 }
        );
      }
      folderPath = folder.path;
    }

    const uploadedFiles = [];
    const errors = [];

    // Parse tags
    let parsedTags: string[] = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (error) {
        console.error('Error parsing tags:', error);
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }
    }

    for (const file of files) {
      try {
        // Check if file with same name already exists in the same location
        const existingFile = await prisma.documentFile.findFirst({
          where: {
            fileName: file.name,
            folderId: folderId || null,
            userId: user.id
          }
        });

        if (existingFile) {
          errors.push(`File "${file.name}" already exists in this location`);
          continue;
        }

        // Upload file to S3
        const fileKey = await uploadDocumentFile(file, user.id, folderPath);

        // Create file record in database
        const documentFile = await prisma.documentFile.create({
          data: {
            name: file.name,
            fileName: file.name,
            fileKey,
            fileSize: file.size,
            fileType: file.type,
            folderId: folderId || null,
            userId: user.id,
            path: folder ? `${folder.path}/${file.name}` : `/${file.name}`,
            description: description || null,
            tags: parsedTags
          }
        });

        uploadedFiles.push(documentFile);

      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        errors.push(`Failed to upload "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: uploadedFiles,
      errors: errors.length > 0 ? errors : null,
      message: `${uploadedFiles.length} file(s) uploaded successfully${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload files' },
      { status: 500 }
    );
  }
} 