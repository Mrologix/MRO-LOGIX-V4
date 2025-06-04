import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

// GET - Fetch responses for a technical query
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch responses for the technical query
    const responses = await prisma.technicalQueryResponse.findMany({
      where: { technicalQueryId: id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        attachments: true,
        _count: {
          select: {
            votes: true
          }
        }
      },
      orderBy: [
        { isAcceptedAnswer: 'desc' },
        { upvotes: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: responses
    });

  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}

// POST - Create a new response to a technical query
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user
    const token = (await cookies()).get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let currentUser;
    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as { id: string };
      currentUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, firstName: true, lastName: true }
      });
      
      if (!currentUser) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Check if the technical query exists
    const technicalQuery = await prisma.technicalQuery.findUnique({
      where: { id },
      select: { id: true, title: true }
    });

    if (!technicalQuery) {
      return NextResponse.json(
        { success: false, message: 'Technical query not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content } = body;

    // Validate required fields
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Response content is required' },
        { status: 400 }
      );
    }

    // Create the response
    const response = await prisma.technicalQueryResponse.create({
      data: {
        content: content.trim(),
        technicalQueryId: id,
        createdById: currentUser.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      }
    });

    // Log the activity
    const requestInfo = await getRequestInfo(request);
    await logActivity({
      userId: currentUser.id,
      action: 'CREATED_TECHNICAL_QUERY_RESPONSE',
      resourceType: 'TECHNICAL_QUERY_RESPONSE',
      resourceId: response.id,
      resourceTitle: `Response to: ${technicalQuery.title}`,
      metadata: {
        technicalQueryId: id,
        technicalQueryTitle: technicalQuery.title
      },
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    return NextResponse.json({
      success: true,
      data: response,
      message: 'Response created successfully'
    });

  } catch (error) {
    console.error('Error creating response:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create response' },
      { status: 500 }
    );
  }
} 