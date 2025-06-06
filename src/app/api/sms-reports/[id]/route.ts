import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { deleteSMSReportFile } from '@/lib/s3';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const smsReport = await prisma.sMSReport.findUnique({
      where: { id },
      include: {
        Attachment: {
          select: {
            id: true,
            fileName: true,
            fileKey: true,
            fileSize: true,
            fileType: true,
            createdAt: true
          }
        }
      }
    });

    if (!smsReport) {
      return NextResponse.json(
        { success: false, message: 'SMS report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: smsReport
    });
  } catch (error) {
    console.error('Error fetching SMS report:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user to get user ID for activity logging
    const token = (await cookies()).get('token')?.value;
    let currentUser = null;
    
    if (token) {
      try {
        const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as { id: string };
        currentUser = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, firstName: true, lastName: true }
        });
      } catch {
        // Continue without user context if token is invalid
      }
    }

    const { id } = await params;

    // First, get the SMS report with its attachments
    const smsReport = await prisma.sMSReport.findUnique({
      where: { id },
      include: {
        Attachment: true
      }
    });

    if (!smsReport) {
      return NextResponse.json(
        { success: false, message: 'SMS report not found' },
        { status: 404 }
      );
    }

    // Delete all attachments from S3
    if (smsReport.Attachment.length > 0) {
      const deletePromises = smsReport.Attachment.map(async (attachment) => {
        try {
          await deleteSMSReportFile(attachment.fileKey);
        } catch (error) {
          console.error(`Error deleting file ${attachment.fileKey}:`, error);
          // Continue with other deletions even if one fails
        }
      });
      
      await Promise.allSettled(deletePromises);
    }

    // Delete the SMS report (this will cascade delete attachments from DB)
    await prisma.sMSReport.delete({
      where: { id }
    });

    // Log the activity if user is authenticated
    if (currentUser) {
      try {
        const requestInfo = await getRequestInfo(request);
        await logActivity({
          userId: currentUser.id,
          action: 'DELETED_SMS_REPORT',
          resourceType: 'SMS_REPORT',
          resourceId: id,
          resourceTitle: `Deleted SMS report ${smsReport.reportNumber}: ${smsReport.reportTitle}`,
          ...requestInfo
        });
      } catch (activityError) {
        console.error('Error logging activity:', activityError);
        // Don't fail the request if activity logging fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'SMS report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting SMS report:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 