import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { uploadSMSReportFile } from '@/lib/s3';
import { sendSMSReportEmail } from '@/lib/email';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { logActivity, getRequestInfo } from '@/lib/activity-logger';

// Maximum file size limit (250MB in bytes)
const MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;

// Generate auto-increment report number
async function generateReportNumber(): Promise<string> {
  const lastReport = await prisma.sMSReport.findFirst({
    orderBy: { reportNumber: 'desc' },
    select: { reportNumber: true }
  });

  if (!lastReport) {
    return 'sms01';
  }

  // Extract number from last report (e.g., "sms05" -> 5)
  const lastNumber = parseInt(lastReport.reportNumber.replace('sms', ''));
  const nextNumber = lastNumber + 1;
  
  // Format with leading zero if needed (e.g., 5 -> "sms05")
  return `sms${nextNumber.toString().padStart(2, '0')}`;
}

export async function POST(request: Request) {
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

    const formData = await request.formData();
    
    // Extract and validate required form data
    const date = formData.get('date') as string;
    const reportTitle = formData.get('reportTitle') as string;
    const reportDescription = formData.get('reportDescription') as string;
    
    // Validate required fields
    if (!date || !reportTitle || !reportDescription) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: date, reportTitle, and reportDescription are required' },
        { status: 400 }
      );
    }
    
    // Extract optional form data
    const reporterName = formData.get('reporterName') as string;
    const reporterEmail = formData.get('reporterEmail') as string;
    const timeOfEvent = formData.get('timeOfEvent') as string;
    const hasAttachments = formData.get('hasAttachments') === 'true';
    
    // Fix the date timezone issue by properly handling the date
    let correctedDate;
    if (date) {
      // Split the date string into parts (YYYY-MM-DD format from input)
      const [year, month, day] = date.split('-').map(Number);
      
      // Create date with local timezone (using UTC date constructor with local values)
      correctedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      correctedDate = new Date();
    }
    
    console.log(`Original date string: ${date}, Corrected date: ${correctedDate.toISOString()}`);
    
    // Generate report number
    const reportNumber = await generateReportNumber();
    
    // Create SMS report in database
    let smsReport;
    try {
      console.log('Creating SMS report with data:', {
        reportNumber,
        reporterName,
        reporterEmail,
        date: correctedDate,
        timeOfEvent,
        reportTitle,
        reportDescription,
        hasAttachments
      });

      smsReport = await prisma.sMSReport.create({
        data: {
          reportNumber,
          reporterName: reporterName || null,
          reporterEmail: reporterEmail || null,
          date: correctedDate,
          timeOfEvent: timeOfEvent || null,
          reportTitle,
          reportDescription,
          hasAttachments
        }
      });

      console.log('Successfully created SMS report:', smsReport);
    } catch (dbError) {
      console.error('Detailed database error:', {
        error: dbError,
        errorMessage: dbError instanceof Error ? dbError.message : 'Unknown error',
        errorStack: dbError instanceof Error ? dbError.stack : undefined
      });
      return NextResponse.json(
        { success: false, message: 'Database error while creating SMS report', error: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    // Handle file uploads if there are attachments
    if (hasAttachments) {
      const fileEntries = formData.getAll('files');
      
      console.log('Raw file entries from FormData:', fileEntries.map(f => ({
        name: (f as any).name,
        size: (f as any).size,
        type: (f as any).type,
        constructor: f.constructor.name,
        isFile: f instanceof File,
        keys: Object.keys(f),
        toString: f.toString()
      })));
      
      // Filter out empty entries and ensure we have valid files
      const validFiles = fileEntries.filter(f => f && (f as any).name && (f as any).size > 0) as File[];
      
             if (validFiles.length > 0) {
        // Calculate total size of files
        const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
        
        // Check if total size exceeds the limit
        if (totalSize > MAX_UPLOAD_SIZE_BYTES) {
          // Delete the SMS report we just created since we can't add the attachments
          await prisma.sMSReport.delete({
            where: { id: smsReport.id }
          });
          
          return NextResponse.json(
            { success: false, message: `Total upload size (${(totalSize / (1024 * 1024)).toFixed(2)}MB) exceeds the 250MB limit` },
            { status: 400 }
          );
        }
        
        const attachmentPromises = validFiles.map(async (file, index) => {
          console.log(`Processing file ${index}:`, {
            name: file.name,
            size: file.size,
            type: file.type,
            hasArrayBuffer: typeof file.arrayBuffer === 'function',
            hasStream: typeof file.stream === 'function',
            constructor: file.constructor.name
          });
          
          try {
            // Upload file to S3 and get the file key
            const fileKey = await uploadSMSReportFile(file, smsReport.id);
            
            // Create attachment record in database
            return prisma.sMSReportAttachment.create({
              data: {
                fileName: file.name,
                fileKey,
                fileSize: file.size,
                fileType: file.type,
                smsReportId: smsReport.id,
              },
            });
          } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError);
            throw new Error(`Failed to upload file ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
          }
        });
        
        // Wait for all file uploads and database entries to complete
        await Promise.all(attachmentPromises);
      }
    }
    
    // Send email copy if reporter provided email
    if (reporterEmail) {
      try {
        await sendSMSReportEmail(reporterEmail, {
          reportNumber: smsReport.reportNumber,
          reporterName: smsReport.reporterName || undefined,
          date: correctedDate.toLocaleDateString(),
          timeOfEvent: smsReport.timeOfEvent || undefined,
          reportTitle: smsReport.reportTitle,
          reportDescription: smsReport.reportDescription
        });
        console.log('Email sent successfully to:', reporterEmail);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email fails, just log it
      }
    }
    
    // Log the activity if user is authenticated
    if (currentUser) {
      try {
        const requestInfo = await getRequestInfo(request);
        await logActivity({
          userId: currentUser.id,
          action: 'CREATED_SMS_REPORT',
                      resourceType: 'SMS_REPORT',
          resourceId: smsReport.id,
          resourceTitle: `Created SMS report ${smsReport.reportNumber}: ${smsReport.reportTitle}`,
          ...requestInfo
        });
      } catch (activityError) {
        console.error('Error logging activity:', activityError);
        // Don't fail the request if activity logging fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'SMS report created successfully',
      data: {
        id: smsReport.id,
        reportNumber: smsReport.reportNumber,
        reportTitle: smsReport.reportTitle
      }
    });
    
  } catch (error) {
    console.error('Error creating SMS report:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const smsReports = await prisma.sMSReport.findMany({
      include: {
        Attachment: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: smsReports
    });
  } catch (error) {
    console.error('Error fetching SMS reports:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 