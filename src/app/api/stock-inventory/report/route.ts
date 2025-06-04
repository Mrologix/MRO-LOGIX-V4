import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const { startDate, endDate, owner } = await request.json();

    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Build the query
    const where: Prisma.StockInventoryWhereInput = {
      incomingDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    // Add owner filter if specified
    if (owner) {
      where.owner = owner;
    }

    // Fetch the data
    const records = await prisma.stockInventory.findMany({
      where,
      include: {
        Attachment: true,
      },
      orderBy: {
        incomingDate: 'desc',
      },
    });

    // Prepare data for Excel
    const excelData = records.map((record: {
      incomingDate: Date;
      station: string;
      owner: string;
      description: string;
      partNo: string;
      serialNo: string;
      quantity: string;
      type: string;
      location: string;
      hasExpireDate: boolean;
      expireDate: Date | null;
      hasInspection: boolean;
      inspectionResult: string | null;
      inspectionFailure: string | null;
      customFailure: string | null;
      hasComment: boolean;
      comment: string | null;
      hasAttachments: boolean;
      Attachment: { fileName: string }[];
    }) => ({
      'Incoming Date': format(new Date(record.incomingDate), 'MMM dd, yyyy'),
      'Station': record.station,
      'Owner': record.owner,
      'Description': record.description,
      'Part No': record.partNo,
      'Serial No': record.serialNo,
      'Quantity': record.quantity,
      'Type': record.type,
      'Location': record.location,
      'Expire Date': record.hasExpireDate && record.expireDate 
        ? format(new Date(record.expireDate), 'MMM dd, yyyy')
        : 'N/A',
      'Inspection Result': record.hasInspection 
        ? record.inspectionResult 
        : 'N/A',
      'Inspection Failure': record.hasInspection && record.inspectionResult === 'Failed'
        ? (record.inspectionFailure === 'Other' ? record.customFailure : record.inspectionFailure)
        : 'N/A',
      'Comments': record.hasComment && record.comment 
        ? record.comment 
        : 'N/A',
      'Attachments': record.hasAttachments && record.Attachment.length > 0
        ? record.Attachment.map(a => a.fileName).join(', ')
        : 'N/A',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Incoming Date
      { wch: 10 }, // Station
      { wch: 12 }, // Owner
      { wch: 30 }, // Description
      { wch: 15 }, // Part No
      { wch: 15 }, // Serial No
      { wch: 10 }, // Quantity
      { wch: 12 }, // Type
      { wch: 12 }, // Location
      { wch: 12 }, // Expire Date
      { wch: 15 }, // Inspection Result
      { wch: 20 }, // Inspection Failure
      { wch: 30 }, // Comments
      { wch: 30 }, // Attachments
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Inventory Report');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="stock-inventory-report-${startDate}-to-${endDate}.xlsx"`);

    return new NextResponse(excelBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate report' },
      { status: 500 }
    );
  }
} 