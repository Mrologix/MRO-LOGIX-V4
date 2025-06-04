import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import prisma from '@/lib/db';

// GET all user activities with pagination and filtering
export async function GET(request: Request) {
  try {
    // Authenticate user via JWT cookie
    const token = (await cookies()).get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
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
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const action = searchParams.get('action') || '';
    const resourceType = searchParams.get('resourceType') || '';
    const userId = searchParams.get('userId') || '';

    // Build where clause for filtering
    const where: {
      action?: { contains: string; mode: 'insensitive' };
      resourceType?: string;
      userId?: string;
    } = {};
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    if (resourceType) {
      where.resourceType = resourceType;
    }
    if (userId) {
      where.userId = userId;
    }

    // Get total count
    const total = await prisma.userActivity.count({ where });

    const skip = (page - 1) * limit;

    // Get activities with user information
    const activities = await prisma.userActivity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 