import { NextResponse } from 'next/server';
import { getStockInventoryFile } from '@/lib/s3';
import prisma from '@/lib/db';

export async function GET(
  request: Request,
  context: { params: Promise<{ fileKey: string }> }
) {
  try {
    // Decode the fileKey (it will be URL encoded from the frontend)
    const { fileKey: encodedFileKey } = await context.params;
    const fileKey = decodeURIComponent(encodedFileKey);
    
    // Validate the file key
    if (!fileKey) {
      return NextResponse.json(
        { success: false, message: 'File key is required' },
        { status: 400 }
      );
    }
    
    // Find the attachment in the database
    const attachment = await prisma.stockInventoryAttachment.findFirst({
      where: {
        fileKey: fileKey
      }
    });
    
    if (!attachment) {
      console.error(`Attachment not found for fileKey: ${fileKey}`);
      return NextResponse.json(
        { success: false, message: 'Attachment not found in database' },
        { status: 404 }
      );
    }
    
    // Get the file from S3
    const fileData = await getStockInventoryFile(fileKey);
    
    if (!fileData) {
      console.error(`File data not found for fileKey: ${fileKey}`);
      return NextResponse.json(
        { success: false, message: 'File not found in storage' },
        { status: 404 }
      );
    }
    
    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', attachment.fileType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
    headers.set('Cache-Control', 'no-cache');
    
    return new NextResponse(fileData, {
      status: 200,
      headers
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error downloading attachment:', errorMessage);
    return NextResponse.json(
      { success: false, message: `Failed to download attachment: ${errorMessage}` },
      { status: 500 }
    );
  }
} 