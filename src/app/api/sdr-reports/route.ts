import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadSDRReportFile } from '@/lib/s3';

// Generate unique control number
function generateControlNumber(): string {
  const randomNum = Math.floor(Math.random() * 9000) + 1000; // 4-digit number
  return `SDR${randomNum}`;
}

// GET - Fetch all SDR reports
export async function GET() {
  try {
    const sdrReports = await prisma.sDRReport.findMany({
      include: {
        Attachment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(sdrReports);
  } catch (error) {
    console.error('Error fetching SDR reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SDR reports' },
      { status: 500 }
    );
  }
}

// POST - Create new SDR report
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form fields
    const reportTitle = formData.get('reportTitle') as string;
    const difficultyDate = formData.get('difficultyDate') as string;
    const submitter = formData.get('submitter') as string;
    const submitterOther = formData.get('submitterOther') as string;
    const submitterName = formData.get('submitterName') as string;
    const email = formData.get('email') as string;
    const station = formData.get('station') as string;
    const condition = formData.get('condition') as string;
    const conditionOther = formData.get('conditionOther') as string;
    const howDiscovered = formData.get('howDiscovered') as string;
    const howDiscoveredOther = formData.get('howDiscoveredOther') as string;
    const hasFlightNumber = formData.get('hasFlightNumber') === 'true';
    const flightNumber = formData.get('flightNumber') as string;
    const partOrAirplane = formData.get('partOrAirplane') as string;
    const airplaneModel = formData.get('airplaneModel') as string;
    const airplaneTailNumber = formData.get('airplaneTailNumber') as string;
    const partNumber = formData.get('partNumber') as string;
    const serialNumber = formData.get('serialNumber') as string;
    const timeOfDiscover = formData.get('timeOfDiscover') as string;
    const hasAtaCode = formData.get('hasAtaCode') === 'true';
    const ataSystemCode = formData.get('ataSystemCode') as string;
    const problemDescription = formData.get('problemDescription') as string;
    const symptoms = formData.get('symptoms') as string;
    const consequences = formData.get('consequences') as string;
    const correctiveAction = formData.get('correctiveAction') as string;

    // Generate unique control number
    let controlNumber = generateControlNumber();
    let isUnique = false;
    while (!isUnique) {
      const existing = await prisma.sDRReport.findUnique({
        where: { controlNumber },
      });
      if (!existing) {
        isUnique = true;
      } else {
        controlNumber = generateControlNumber();
      }
    }

    // Create the SDR report
    const sdrReport = await prisma.sDRReport.create({
      data: {
        controlNumber,
        reportTitle,
        difficultyDate: new Date(difficultyDate + 'T12:00:00.000Z'), // Add noon UTC to prevent timezone shift
        submitter,
        submitterOther: submitterOther || null,
        submitterName,
        email,
        station,
        condition,
        conditionOther: conditionOther || null,
        howDiscovered,
        howDiscoveredOther: howDiscoveredOther || null,
        hasFlightNumber,
        flightNumber: flightNumber || null,
        partOrAirplane,
        airplaneModel: airplaneModel || null,
        airplaneTailNumber: airplaneTailNumber || null,
        partNumber: partNumber || null,
        serialNumber: serialNumber || null,
        timeOfDiscover: timeOfDiscover || null,
        hasAtaCode,
        ataSystemCode: ataSystemCode || null,
        problemDescription,
        symptoms: symptoms || null,
        consequences: consequences || null,
        correctiveAction: correctiveAction || null,
        hasAttachments: false,
      },
    });

    // Handle file attachments
    const files = formData.getAll('attachments') as File[];
    if (files.length > 0 && files[0].size > 0) {
      const attachments = [];
      
      for (const file of files) {
        if (file.size > 0) {
          const fileKey = await uploadSDRReportFile(file, sdrReport.id);
          
          const attachment = await prisma.sDRReportAttachment.create({
            data: {
              fileName: file.name,
              fileKey,
              fileSize: file.size,
              fileType: file.type,
              sdrReportId: sdrReport.id,
            },
          });
          
          attachments.push(attachment);
        }
      }

      // Update the report to indicate it has attachments
      if (attachments.length > 0) {
        await prisma.sDRReport.update({
          where: { id: sdrReport.id },
          data: { hasAttachments: true },
        });
      }
    }

    // Fetch the complete report with attachments
    const completeReport = await prisma.sDRReport.findUnique({
      where: { id: sdrReport.id },
      include: {
        Attachment: true,
      },
    });

    return NextResponse.json(completeReport);
  } catch (error) {
    console.error('Error creating SDR report:', error);
    return NextResponse.json(
      { error: 'Failed to create SDR report' },
      { status: 500 }
    );
  }
} 