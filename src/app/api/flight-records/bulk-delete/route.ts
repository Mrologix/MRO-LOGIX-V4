import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No records selected for deletion' },
        { status: 400 }
      );
    }

    // First, delete all attachments associated with these flight records
    await prisma.attachment.deleteMany({
      where: {
        flightRecordId: {
          in: ids
        }
      }
    });

    // Then delete the flight records
    await prisma.flightRecord.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${ids.length} record(s)`
    });
  } catch (error) {
    console.error('Error deleting flight records:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete records' },
      { status: 500 }
    );
  }
} 