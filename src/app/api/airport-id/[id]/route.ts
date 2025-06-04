import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { uploadAirportIdFile, deleteAirportIdFile } from '@/lib/s3';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

// GET single airport ID record
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const airportId = await prisma.airportID.findUnique({
      where: { id },
      include: {
        Attachment: true
      }
    });

    if (!airportId) {
      return NextResponse.json(
        { error: 'Airport ID not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(airportId);
  } catch (error) {
    console.error('Error fetching airport ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch airport ID' },
      { status: 500 }
    );
  }
}

// PUT update airport ID record
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const formData = await request.formData();
    const employeeName = formData.get('employeeName') as string;
    const station = formData.get('station') as string;
    const customStation = formData.get('customStation') as string | null;
    const idIssuedDate = new Date(formData.get('idIssuedDate') as string);
    const badgeIdNumber = formData.get('badgeIdNumber') as string;
    const expireDate = new Date(formData.get('expireDate') as string);
    const hasComment = formData.get('hasComment') === 'Yes';
    const comment = hasComment ? (formData.get('comment') as string) : null;
    const hasAttachment = formData.get('hasAttachment') === 'Yes';
    const file = formData.get('file') as File | null;

    // Get existing record to check for attachments
    const existingRecord = await prisma.airportID.findUnique({
      where: { id },
      include: { Attachment: true }
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Airport ID not found' },
        { status: 404 }
      );
    }

    // Update the airport ID record
    const airportId = await prisma.airportID.update({
      where: { id },
      data: {
        employeeName,
        station,
        customStation,
        idIssuedDate,
        badgeIdNumber,
        expireDate,
        hasComment,
        comment,
        hasAttachment: hasAttachment && (file !== null || existingRecord.hasAttachment)
      }
    });

    // Handle file upload if present
    if (hasAttachment && file) {
      // Delete existing file if any
      if (existingRecord.Attachment.length > 0) {
        await deleteAirportIdFile(existingRecord.Attachment[0].fileKey);
        await prisma.airportIDAttachment.deleteMany({
          where: { airportIdId: id }
        });
      }

      // Upload new file
      const fileKey = await uploadAirportIdFile(file, airportId.id);
      await prisma.airportIDAttachment.create({
        data: {
          fileName: file.name,
          fileKey,
          fileSize: file.size,
          fileType: file.type,
          airportIdId: airportId.id
        }
      });
    }

    return NextResponse.json(airportId);
  } catch (error) {
    console.error('Error updating airport ID:', error);
    return NextResponse.json(
      { error: 'Failed to update airport ID' },
      { status: 500 }
    );
  }
}

// DELETE airport ID record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
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

    // Get the record to check for attachments
    const airportId = await prisma.airportID.findUnique({
      where: { id },
      include: { Attachment: true }
    });

    if (!airportId) {
      return NextResponse.json(
        { error: 'Airport ID not found' },
        { status: 404 }
      );
    }

    // Delete attached file if any
    if (airportId.Attachment.length > 0) {
      await deleteAirportIdFile(airportId.Attachment[0].fileKey);
    }

    // Delete the record (cascade will handle the attachment)
    await prisma.airportID.delete({
      where: { id }
    });

    // Log the activity if user is authenticated
    if (currentUser) {
      const requestInfo = getRequestInfo(request);
      await logActivity({
        userId: currentUser.id,
        action: 'DELETED_AIRPORT_ID',
        resourceType: 'AIRPORT_ID',
        resourceId: id,
        resourceTitle: `Airport ID: ${airportId.employeeName} - ${airportId.badgeIdNumber}`,
        metadata: {
          employeeName: airportId.employeeName,
          station: airportId.station,
          customStation: airportId.customStation,
          badgeIdNumber: airportId.badgeIdNumber,
          hasComment: airportId.hasComment,
          hadAttachment: airportId.Attachment.length > 0
        },
        ...requestInfo
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting airport ID:', error);
    return NextResponse.json(
      { error: 'Failed to delete airport ID' },
      { status: 500 }
    );
  }
} 