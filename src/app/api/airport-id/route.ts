import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { uploadAirportIdFile } from '@/lib/s3';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

// GET all airport ID records
export async function GET() {
  try {
    const airportIds = await prisma.airportID.findMany({
      include: {
        Attachment: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(airportIds);
  } catch (error) {
    console.error('Error fetching airport IDs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch airport IDs' },
      { status: 500 }
    );
  }
}

// POST new airport ID record
export async function POST(request: Request) {
  try {
    // Authenticate user to get user ID for activity logging
    const token = (await cookies()).get('auth_token')?.value;
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

    // Create the airport ID record
    const airportId = await prisma.airportID.create({
      data: {
        employeeName,
        station,
        customStation,
        idIssuedDate,
        badgeIdNumber,
        expireDate,
        hasComment,
        comment,
        hasAttachment: hasAttachment && file !== null
      }
    });

    // Handle file upload if present
    if (hasAttachment && file) {
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

    // Log the activity if user is authenticated
    if (currentUser) {
      const requestInfo = getRequestInfo(request);
      await logActivity({
        userId: currentUser.id,
        action: 'ADDED_AIRPORT_ID',
        resourceType: 'AIRPORT_ID',
        resourceId: airportId.id,
        resourceTitle: `Airport ID: ${employeeName} - ${badgeIdNumber}`,
        metadata: {
          employeeName,
          station,
          customStation,
          badgeIdNumber,
          hasComment,
          hasAttachment: hasAttachment && file !== null
        },
        ...requestInfo
      });
    }

    return NextResponse.json(airportId);
  } catch (error) {
    console.error('Error creating airport ID:', error);
    return NextResponse.json(
      { error: 'Failed to create airport ID' },
      { status: 500 }
    );
  }
} 