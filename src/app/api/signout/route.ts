import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

export async function POST(request: Request) {
  try {
    // Try to get user info before logging out to record the activity
    const token = (await cookies()).get('token')?.value;
    let userId: string | null = null;
    
    if (token) {
      try {
        const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as { id: string };
        userId = decoded.id;
      } catch {
        // Token is invalid, but we still want to clear the cookie
      }
    }
    
    // Create response and delete cookie
    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully'
    });
    
    // Delete the auth token cookie
    response.cookies.delete('token');
    
    // Log logout activity if we have a user ID
    if (userId) {
      const requestInfo = getRequestInfo(request);
      await logActivity({
        userId: userId,
        action: 'LOGOUT',
        resourceType: 'AUTHENTICATION',
        resourceTitle: 'User logout',
        metadata: {
          logoutMethod: 'manual'
        },
        ...requestInfo
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error signing out:', error);
    return NextResponse.json(
      { error: 'An error occurred while signing out' },
      { status: 500 }
    );
  }
} 