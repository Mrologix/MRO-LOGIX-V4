import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // Get the token from cookies
    const token = (await cookies()).get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify token
    const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as {
      id: string;
      email: string;
    };
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }
    
    // User is authenticated
    return NextResponse.json({
      authenticated: true,
      user
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Not authenticated' },
      { status: 401 }
    );
  }
} 