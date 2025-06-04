import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { getDocumentFile } from '@/lib/s3';

export async function GET(
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

    // Find the file and check permissions
    const file = await prisma.documentFile.findFirst({
      where: {
        id: id,
        OR: [
          { userId: user.id }, // User owns the file
          { 
            isPublic: true // File is public
          },
          {
            sharedWith: {
              some: {
                sharedWithUserId: user.id // File is shared with user
              }
            }
          }
        ]
      }
    });

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File not found or access denied' },
        { status: 404 }
      );
    }

    // Get the file from S3
    const fileData = await getDocumentFile(file.fileKey);

    if (!fileData) {
      console.error(`File data not found for fileKey: ${file.fileKey}`);
      return NextResponse.json(
        { success: false, message: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Update download count and last accessed time
    await prisma.documentFile.update({
      where: { id: id },
      data: {
        downloadCount: {
          increment: 1
        },
        lastAccessedAt: new Date()
      }
    });

    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', file.fileType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
    headers.set('Content-Length', fileData.length.toString());
    headers.set('Cache-Control', 'no-cache');

    return new NextResponse(fileData, {
      status: 200,
      headers
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error downloading file:', errorMessage);
    return NextResponse.json(
      { success: false, message: `Failed to download file: ${errorMessage}` },
      { status: 500 }
    );
  }
}