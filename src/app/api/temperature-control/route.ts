import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    
    const date = formData.get('date') as string;
    const location = formData.get('location') as string;
    const customLocation = formData.get('customLocation') as string;
    const time = formData.get('time') as string;
    const temperature = formData.get('temperature') as string;
    const humidity = formData.get('humidity') as string;
    const employeeName = formData.get('employeeName') as string;
    const hasComment = formData.get('hasComment') as string;
    const comment = formData.get('comment') as string;

    // Validation
    if (!date || !location || !time || !temperature || !humidity || !employeeName || !hasComment) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }    // Create temperature control record
    // Fix date handling to prevent timezone issues
    // By adding 'T00:00:00.000Z' we ensure the date is treated as UTC midnight
    // which prevents the date from shifting due to timezone conversion
    const temperatureControl = await prisma.temperatureControl.create({
      data: {
        date: new Date(`${date}T00:00:00.000Z`),
        location: location,
        customLocation: location === 'Other' ? customLocation : null,
        time: time,
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        employeeName: employeeName,
        hasComment: hasComment === 'Yes',
        comment: hasComment === 'Yes' ? comment : null,
      },
    });

    // Log the activity if user is authenticated
    if (currentUser) {
      const requestInfo = getRequestInfo(request);
      await logActivity({
        userId: currentUser.id,
        action: 'ADDED_TEMPERATURE_CONTROL',
        resourceType: 'TEMPERATURE_CONTROL',
        resourceId: temperatureControl.id,
        resourceTitle: `Temperature Control: ${location === 'Other' ? customLocation : location} at ${time}`,
        metadata: {
          location: location === 'Other' ? customLocation : location,
          time,
          temperature: parseFloat(temperature),
          humidity: parseFloat(humidity),
          employeeName,
          hasComment: hasComment === 'Yes'
        },
        ...requestInfo
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Temperature control record saved successfully',
      data: temperatureControl,
    });
  } catch (error) {
    console.error('Error saving temperature control record:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const countOnly = searchParams.get('count') === 'true';

    // Build where clause for search
    const where = search
      ? {
          OR: [
            { location: { contains: search, mode: 'insensitive' as const } },
            { customLocation: { contains: search, mode: 'insensitive' as const } },
            { employeeName: { contains: search, mode: 'insensitive' as const } },
            { comment: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get total count
    const total = await prisma.temperatureControl.count({ where });
    
    // If count only is requested, return just the total
    if (countOnly) {
      return NextResponse.json({
        success: true,
        data: {
          total
        },
      });
    }

    const skip = (page - 1) * limit;

    // Get records
    const records = await prisma.temperatureControl.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching temperature control records:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate the ID
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Temperature control record ID is required' },
        { status: 400 }
      );
    }

    // Check if the record exists
    const record = await prisma.temperatureControl.findUnique({
      where: { id: id }
    });

    if (!record) {
      return NextResponse.json(
        { success: false, message: 'Temperature control record not found' },
        { status: 404 }
      );
    }

    // Delete the temperature control record
    await prisma.temperatureControl.delete({
      where: { id: id }
    });

    // Log the activity if user is authenticated
    if (currentUser) {
      const requestInfo = getRequestInfo(request);
      await logActivity({
        userId: currentUser.id,
        action: 'DELETED_TEMPERATURE_CONTROL',
        resourceType: 'TEMPERATURE_CONTROL',
        resourceId: id,
        resourceTitle: `Temperature Control: ${record.location === 'Other' ? record.customLocation : record.location} at ${record.time}`,
        metadata: {
          location: record.location === 'Other' ? record.customLocation : record.location,
          time: record.time,
          temperature: record.temperature,
          humidity: record.humidity,
          employeeName: record.employeeName,
          hasComment: record.hasComment
        },
        ...requestInfo
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Temperature control record deleted successfully',
      id: id
    });
  } catch (error) {
    console.error('Error deleting temperature control record:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete temperature control record',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
