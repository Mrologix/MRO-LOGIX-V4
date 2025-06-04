import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/users
// Returns total number of registered users.
export async function GET() {
  try {
    // Count all users. Adjust the query if you need to filter by verified status etc.
    const count = await prisma.user.count();

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching users count:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users count' }, { status: 500 });
  }
}
