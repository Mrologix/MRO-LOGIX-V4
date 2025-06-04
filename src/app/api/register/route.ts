import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generatePIN } from '@/lib/pinUtils';
import { sendPinEmail } from '@/lib/email';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, username, email, password } = body;
    
    // Validate input fields
    if (!firstName || !lastName || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate a PIN for email verification
    const pin = generatePIN();
    const pinCreatedAt = new Date();
    
    // Create the user in the database
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        username,
        email,
        password: hashedPassword,
        pin,
        pinCreatedAt
      }
    });
    
    // Send verification email
    await sendPinEmail(email, pin, firstName);
    
    return NextResponse.json({
      success: true,
      userId: user.id
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
} 