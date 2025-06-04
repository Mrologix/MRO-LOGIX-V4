import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

// POST - Vote on a technical query
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
    const { voteType } = body; // "UP" or "DOWN"

    if (!voteType || !['UP', 'DOWN'].includes(voteType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid vote type. Must be UP or DOWN' },
        { status: 400 }
      );
    }

    // Check if user has already voted
    const existingVote = await prisma.technicalQueryVote.findUnique({
      where: {
        technicalQueryId_userId: {
          technicalQueryId: id,
          userId: currentUser.id
        }
      }
    });

    let result;
    
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Same vote type - remove the vote (toggle off)
        await prisma.technicalQueryVote.delete({
          where: { id: existingVote.id }
        });
        result = { action: 'removed', voteType };
      } else {
        // Different vote type - update the vote
        await prisma.technicalQueryVote.update({
          where: { id: existingVote.id },
          data: { voteType }
        });
        result = { action: 'updated', voteType, previousVoteType: existingVote.voteType };
      }
    } else {
      // No existing vote - create new vote
      await prisma.technicalQueryVote.create({
        data: {
          voteType,
          technicalQueryId: id,
          userId: currentUser.id
        }
      });
      result = { action: 'created', voteType };
    }

    // Update the vote counts on the technical query
    const votes = await prisma.technicalQueryVote.groupBy({
      by: ['voteType'],
      where: { technicalQueryId: id },
      _count: { voteType: true }
    });

    const upvotes = votes.find(v => v.voteType === 'UP')?._count.voteType || 0;
    const downvotes = votes.find(v => v.voteType === 'DOWN')?._count.voteType || 0;

    await prisma.technicalQuery.update({
      where: { id },
      data: { upvotes, downvotes }
    });

    // Log the activity
    const requestInfo = await getRequestInfo(request);
    const actionMap = {
      'created': 'CREATED_TECHNICAL_QUERY_VOTE',
      'updated': 'UPDATED_TECHNICAL_QUERY_VOTE',
      'removed': 'REMOVED_TECHNICAL_QUERY_VOTE'
    } as const;
    
    await logActivity({
      userId: currentUser.id,
      action: actionMap[result.action as keyof typeof actionMap],
      resourceType: 'TECHNICAL_QUERY',
      resourceId: id,
      resourceTitle: technicalQuery.title,
      metadata: {
        voteType: result.voteType,
        action: result.action,
        upvotes,
        downvotes
      },
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        upvotes,
        downvotes,
        userVote: result.action === 'removed' ? null : result.voteType
      },
      message: `Vote ${result.action} successfully`
    });

  } catch (error) {
    console.error('Error processing vote:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process vote' },
      { status: 500 }
    );
  }
}

// GET - Get user's vote status for a technical query
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate user
    const token = (await cookies()).get('token')?.value;
    if (!token) {
      return NextResponse.json({
        success: true,
        data: { userVote: null }
      });
    }

    let currentUser;
    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as { id: string };
      currentUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true }
      });
    } catch {
      return NextResponse.json({
        success: true,
        data: { userVote: null }
      });
    }

    if (!currentUser) {
      return NextResponse.json({
        success: true,
        data: { userVote: null }
      });
    }

    // Get user's vote
    const userVote = await prisma.technicalQueryVote.findUnique({
      where: {
        technicalQueryId_userId: {
          technicalQueryId: id,
          userId: currentUser.id
        }
      },
      select: { voteType: true }
    });

    return NextResponse.json({
      success: true,
      data: { userVote: userVote?.voteType || null }
    });

  } catch (error) {
    console.error('Error fetching vote status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch vote status' },
      { status: 500 }
    );
  }
} 