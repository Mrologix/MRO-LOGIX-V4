import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic'; // Force dynamic rendering

// GET - Fetch user's document storage structure
export async function GET() {
  try {
    console.log('Document storage GET request received');
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
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('User not found in database');
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch user's folders and files
    const folders = await prisma.documentFolder.findMany({
      where: { userId: user.id },
      include: {
        children: {
          include: {
            _count: {
              select: {
                files: true,
                children: true
              }
            }
          }
        },
        files: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            createdAt: true,
            updatedAt: true,
            tags: true,
            description: true,
            isShared: true,
            isPublic: true,
            downloadCount: true,
            lastAccessedAt: true
          }
        },
        _count: {
          select: {
            files: true,
            children: true
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    // Fetch root files (files not in any folder)
    const rootFiles = await prisma.documentFile.findMany({
      where: {
        userId: user.id,
        folderId: null
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        createdAt: true,
        updatedAt: true,
        tags: true,
        description: true,
        isShared: true,
        isPublic: true,
        downloadCount: true,
        lastAccessedAt: true
      },
      orderBy: [
        { fileName: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: {
        folders,
        rootFiles,
        userId: user.id
      }
    });

  } catch (error) {
    console.error('Error fetching document storage:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch document storage' },
      { status: 500 }
    );
  }
} 