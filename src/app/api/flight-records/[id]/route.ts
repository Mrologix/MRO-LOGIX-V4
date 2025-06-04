import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { deleteFlightRecordFile } from '@/lib/s3';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate the ID
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Flight record ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch the flight record with its attachments
    const record = await prisma.flightRecord.findUnique({
      where: {
        id: id
      },
      include: {
        Attachment: true,
        PartReplacement: true
      }
    });
    
    if (!record) {
      return NextResponse.json(
        { success: false, message: 'Flight record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      record
    });
  } catch (error) {
    console.error('Error fetching flight record:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch flight record' },
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
    
    // Authenticate user to get user ID for activity logging
    const token = (await cookies()).get('token')?.value;
    let currentUser = null;
    
    if (token) {
      try {
        const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as { id: string };
        currentUser = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, firstName: true, lastName: true }
        });
      } catch {
        // Continue without user context if token is invalid
      }
    }
    
    // Validate the ID
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Flight record ID is required' },
        { status: 400 }
      );
    }
    
    // First, find the flight record with its attachments to check if any files need to be deleted
    const record = await prisma.flightRecord.findUnique({
      where: {
        id: id
      },
      include: {
        Attachment: true
      }
    });
    
    if (!record) {
      return NextResponse.json(
        { success: false, message: 'Flight record not found' },
        { status: 404 }
      );
    }
    
    // Track deletion status of files
    const fileResults = [];
    
    // Delete any attached files from S3 first
    if (record.hasAttachments && record.Attachment.length > 0) {
      console.log(`Deleting ${record.Attachment.length} attachment(s) for flight record ${id}`);
      
      // Delete each file from S3
      for (const attachment of record.Attachment) {
        try {
          await deleteFlightRecordFile(attachment.fileKey);
          fileResults.push({
            fileKey: attachment.fileKey,
            success: true
          });
        } catch (fileError) {
          console.error(`Error deleting file ${attachment.fileKey}:`, fileError);
          fileResults.push({
            fileKey: attachment.fileKey,
            success: false,
            error: fileError instanceof Error ? fileError.message : 'Unknown error'
          });
        }
      }
    }
    
    // Use a transaction to delete both attachments and the flight record
    await prisma.$transaction(async (tx) => {
      // Delete all attachments first (database records)
      if (record.hasAttachments) {
        await tx.attachment.deleteMany({
          where: {
            flightRecordId: id
          }
        });
      }
      
      // Then delete the flight record
      await tx.flightRecord.delete({
        where: {
          id: id
        }
      });
    });
    
    // Log the activity if user is authenticated
    if (currentUser) {
      const requestInfo = getRequestInfo(request);
      await logActivity({
        userId: currentUser.id,
        action: 'DELETED_FLIGHT_RECORD',
        resourceType: 'FLIGHT_RECORD',
        resourceId: id,
        resourceTitle: `Flight Record: ${record.airline} ${record.fleet} - ${record.tail || 'N/A'} (${record.station})`,
        metadata: {
          airline: record.airline,
          fleet: record.fleet,
          tail: record.tail || null,
          station: record.station,
          service: record.service,
          hadAttachments: record.hasAttachments,
          attachmentCount: record.Attachment.length
        },
        ...requestInfo
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Flight record deleted successfully',
      id: id,
      fileResults: fileResults.length > 0 ? fileResults : undefined
    });
  } catch (error) {
    console.error('Error deleting flight record:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete flight record',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 