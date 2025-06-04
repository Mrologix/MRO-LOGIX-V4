import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteIncomingInspectionFile } from '@/lib/s3';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inspection = await prisma.incomingInspection.findUnique({
      where: {
        id,
      },
      include: {
        StockInventory: true,
        Attachment: true,
      },
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: inspection });
  } catch (error) {
    console.error('Error fetching inspection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspection' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // First get the inspection to handle attachments
    const inspection = await prisma.incomingInspection.findUnique({
      where: { id },
      include: { Attachment: true }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      );
    }

    // Delete all attachments from S3
    const deleteAttachmentPromises = inspection.Attachment.map(async (attachment) => {
      try {
        await deleteIncomingInspectionFile(attachment.fileKey);
      } catch (error) {
        console.error(`Error deleting attachment ${attachment.fileKey}:`, error);
      }
    });

    await Promise.all(deleteAttachmentPromises);

    // Delete the inspection record
    await prisma.incomingInspection.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inspection:', error);
    return NextResponse.json(
      { error: 'Failed to delete inspection' },
      { status: 500 }
    );
  }
} 