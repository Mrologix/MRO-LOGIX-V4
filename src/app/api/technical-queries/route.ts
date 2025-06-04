import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

// GET - Fetch all technical queries with optional filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause for filtering
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Fetch queries with pagination
    const [queries, totalCount] = await Promise.all([
      prisma.technicalQuery.findMany({
        where,
        include: {
          createdBy: {
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
            select: {
              id: true,
              isAcceptedAnswer: true
            }
          },
          _count: {
            select: {
              responses: true,
              votes: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip: offset,
        take: limit
      }),
      prisma.technicalQuery.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        queries,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching technical queries:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch technical queries' },
      { status: 500 }
    );
  }
}

// POST - Create a new technical query
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { title, description, category, priority, tags } = body;

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { success: false, message: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Create the technical query
    const technicalQuery = await prisma.technicalQuery.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category || null,
        priority: priority || 'MEDIUM',
        tags: Array.isArray(tags) ? tags : [],
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
      action: 'CREATED_TECHNICAL_QUERY',
      resourceType: 'TECHNICAL_QUERY',
      resourceId: technicalQuery.id,
      resourceTitle: technicalQuery.title,
      metadata: {
        category: technicalQuery.category,
        priority: technicalQuery.priority,
        tags: technicalQuery.tags
      },
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    return NextResponse.json({
      success: true,
      data: technicalQuery,
      message: 'Technical query created successfully'
    });

  } catch (error) {
    console.error('Error creating technical query:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create technical query' },
      { status: 500 }
    );
  }
} 