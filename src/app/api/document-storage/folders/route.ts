import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';

// POST - Create a new folder
export async function POST(request: Request) {
  try {
    console.log('Creating folder request received');
    const session = await getServerSession();
    console.log('Session:', session);
    
    if (!session?.user?.email) {
      console.log('No session or user email found');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, parentId, description } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Validate parent folder if provided
    let parentFolder = null;
    if (parentId) {
      parentFolder = await prisma.documentFolder.findFirst({
        where: {
          id: parentId,
          userId: user.id
        }
      });

      if (!parentFolder) {
        return NextResponse.json(
          { success: false, message: 'Parent folder not found' },
          { status: 404 }
        );
      }
    }

    // Check if folder with same name exists in the same location
    const existingFolder = await prisma.documentFolder.findFirst({
      where: {
        name,
        parentId: parentId || null,
        userId: user.id
      }
    });

    if (existingFolder) {
      return NextResponse.json(
        { success: false, message: 'A folder with this name already exists in this location' },
        { status: 409 }
      );
    }

    // Create folder path
    const path = parentFolder ? `${parentFolder.path}/${name}` : `/${name}`;

    // Create the folder
    const folder = await prisma.documentFolder.create({
      data: {
        name,
        parentId: parentId || null,
        userId: user.id,
        path,
        description: description || null
      },
      include: {
        _count: {
          select: {
            files: true,
            children: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: folder,
      message: 'Folder created successfully'
    });

  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create folder' },
      { status: 500 }
    );
  }
} 