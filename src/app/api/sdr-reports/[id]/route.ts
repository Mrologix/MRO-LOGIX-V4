import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteSDRReportFile } from '@/lib/s3';

// GET - Fetch single SDR report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sdrReport = await prisma.sDRReport.findUnique({
      where: { id },
      include: {
        Attachment: true,
      },
    });

    if (!sdrReport) {
      return NextResponse.json(
        { error: 'SDR report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(sdrReport);
  } catch (error) {
    console.error('Error fetching SDR report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SDR report' },
      { status: 500 }
    );
  }
}

// DELETE - Delete SDR report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // First, get the report with its attachments
    const sdrReport = await prisma.sDRReport.findUnique({
      where: { id },
      include: {
        Attachment: true,
      },
    });

    if (!sdrReport) {
      return NextResponse.json(
        { error: 'SDR report not found' },
        { status: 404 }
      );
    }

    // Delete all attachments from S3
    for (const attachment of sdrReport.Attachment) {
      try {
        await deleteSDRReportFile(attachment.fileKey);
      } catch (error) {
        console.error(`Failed to delete file ${attachment.fileKey}:`, error);
        // Continue with deletion even if S3 deletion fails
      }
    }

    // Delete the report (this will cascade delete attachments due to Prisma schema)
    await prisma.sDRReport.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'SDR report deleted successfully' });
  } catch (error) {
    console.error('Error deleting SDR report:', error);
    return NextResponse.json(
      { error: 'Failed to delete SDR report' },
      { status: 500 }
    );
  }
} 