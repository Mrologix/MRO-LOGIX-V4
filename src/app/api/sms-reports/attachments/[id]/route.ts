import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSMSReportFile } from '@/lib/s3';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the attachment record from database
    const attachment = await prisma.sMSReportAttachment.findUnique({
      where: { id },
      include: {
        SMSReport: {
          select: {
            id: true,
            reportNumber: true,
            reportTitle: true
          }
        }
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, message: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Get the file from S3
    const fileBuffer = await getSMSReportFile(attachment.fileKey);

    if (!fileBuffer) {
      return NextResponse.json(
        { success: false, message: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
        'Content-Length': attachment.fileSize.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading SMS report attachment:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 