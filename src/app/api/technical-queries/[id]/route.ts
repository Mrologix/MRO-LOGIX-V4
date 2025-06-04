import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

// GET - Fetch a single technical query with responses
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Increment view count
    await prisma.technicalQuery.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    // Fetch the technical query with all related data
    const technicalQuery = await prisma.technicalQuery.findUnique({
      where: { id },
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
        resolvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        responses: {
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
        },
        attachments: true,
        _count: {
          select: {
            responses: true,
            votes: true
          }
        }
      }
    });

    if (!technicalQuery) {
      return NextResponse.json(
        { success: false, message: 'Technical query not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: technicalQuery
    });

  } catch (error) {
    console.error('Error fetching technical query:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch technical query' },
      { status: 500 }
    );
  }
}

// PUT - Update a technical query
export async function PUT(
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

    // Check if the technical query exists and user has permission to edit
    const existingQuery = await prisma.technicalQuery.findUnique({
      where: { id },
      select: { id: true, createdById: true, title: true }
    });

    if (!existingQuery) {
      return NextResponse.json(
        { success: false, message: 'Technical query not found' },
        { status: 404 }
      );
    }

    if (existingQuery.createdById !== currentUser.id) {
      return NextResponse.json(
        { success: false, message: 'You can only edit your own queries' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, category, priority, tags, status, isResolved } = body;

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { success: false, message: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Update the technical query
    const updatedQuery = await prisma.technicalQuery.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category || null,
        priority: priority || 'MEDIUM',
        tags: Array.isArray(tags) ? tags : [],
        status: status || 'OPEN',
        isResolved: isResolved || false,
        resolvedAt: isResolved ? new Date() : null,
        resolvedById: isResolved ? currentUser.id : null,
        updatedById: currentUser.id
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
        updatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        _count: {
          select: {
            responses: true,
            votes: true
          }
        }
      }
    });

    // Log the activity
    const requestInfo = await getRequestInfo(request);
    await logActivity({
      userId: currentUser.id,
      action: 'UPDATED_TECHNICAL_QUERY',
      resourceType: 'TECHNICAL_QUERY',
      resourceId: updatedQuery.id,
      resourceTitle: updatedQuery.title,
      metadata: {
        category: updatedQuery.category,
        priority: updatedQuery.priority,
        status: updatedQuery.status,
        isResolved: updatedQuery.isResolved
      },
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    return NextResponse.json({
      success: true,
      data: updatedQuery,
      message: 'Technical query updated successfully'
    });

  } catch (error) {
    console.error('Error updating technical query:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update technical query' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a technical query
export async function DELETE(
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

    // Check if the technical query exists and user has permission to delete
    const existingQuery = await prisma.technicalQuery.findUnique({
      where: { id },
      select: { id: true, createdById: true, title: true }
    });

    if (!existingQuery) {
      return NextResponse.json(
        { success: false, message: 'Technical query not found' },
        { status: 404 }
      );
    }

    if (existingQuery.createdById !== currentUser.id) {
      return NextResponse.json(
        { success: false, message: 'You can only delete your own queries' },
        { status: 403 }
      );
    }

    // Delete the technical query (cascade will handle related records)
    await prisma.technicalQuery.delete({
      where: { id }
    });

    // Log the activity
    const requestInfo = await getRequestInfo(request);
    await logActivity({
      userId: currentUser.id,
      action: 'DELETED_TECHNICAL_QUERY',
      resourceType: 'TECHNICAL_QUERY',
      resourceId: id,
      resourceTitle: existingQuery.title,
      metadata: {},
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    return NextResponse.json({
      success: true,
      message: 'Technical query deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting technical query:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete technical query' },
      { status: 500 }
    );
  }
} 