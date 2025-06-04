import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verify, JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export async function POST(request: Request) {
  try {
    const { password, checkOnly } = await request.json();

    // 1. Get the auth_token cookie
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.match(/token=([^;]+)/);
    if (!match) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Decode JWT
    let payload: JwtPayload;
    try {
      payload = verify(match[1], JWT_SECRET) as JwtPayload;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // For checkOnly, just verify the token and return success
    if (checkOnly) {
      return NextResponse.json({ success: true });
    }

    // 3. Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // 4. Compare password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    // Success!
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify password' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // No-op for now, or you can clear cookies if needed
  return NextResponse.json({ success: true });
} 