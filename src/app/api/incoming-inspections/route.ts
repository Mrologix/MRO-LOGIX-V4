import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadIncomingInspectionFile } from '@/lib/s3';
import { parseLocalDate } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const data = JSON.parse(formData.get('data') as string);

    // Fix: Parse date as local date to prevent timezone shifting
    const inspectionDate = parseLocalDate(data.inspectionDate);

    // If we have a stock inventory ID, fetch its details first
    let stockInventoryData = null;
    if (data.stockInventoryId) {
      stockInventoryData = await prisma.stockInventory.findUnique({
        where: { id: data.stockInventoryId },
        select: {
          partNo: true,
          serialNo: true,
          description: true
        }
      });
    }

    // Create the inspection record with the correct field names
    const inspection = await prisma.incomingInspection.create({
      data: {
        inspectionDate: inspectionDate,
        inspector: data.inspector,
        // Use the nested StockInventory relation
        StockInventory: data.stockInventoryId ? {
          connect: { id: data.stockInventoryId }
        } : undefined,
        // Store part information from stock inventory if available
        partNo: stockInventoryData?.partNo || null,
        serialNo: stockInventoryData?.serialNo || null,
        description: stockInventoryData?.description || null,
        // Inspection checklist fields
        productMatch: data.productMatch,
        productSpecs: data.productSpecs,
        batchNumber: data.batchNumber,
        productObservations: data.productObservations,
        quantityMatch: data.quantityMatch,
        physicalCondition: data.physicalCondition,
        expirationDate: data.expirationDate,
        serviceableExpiry: data.serviceableExpiry,
        physicalDefects: data.physicalDefects,
        suspectedUnapproved: data.suspectedUnapproved,
        quantityObservations: data.quantityObservations,
        esdSensitive: data.esdSensitive,
        inventoryRecorded: data.inventoryRecorded,
        temperatureControl: data.temperatureControl,
        handlingObservations: data.handlingObservations,
        hasAttachments: files.length > 0,
      },
      include: {
        StockInventory: true,
        Attachment: true
      }
    });

    // Upload files if any
    if (files.length > 0) {
      const attachmentPromises = files.map(async (file) => {
        const fileKey = await uploadIncomingInspectionFile(file, inspection.id);
        return prisma.incomingInspectionAttachment.create({
          data: {
            fileName: file.name,
            fileKey,
            fileSize: file.size,
            fileType: file.type,
            incomingInspectionId: inspection.id,
          },
        });
      });

      await Promise.all(attachmentPromises);
    }

    return NextResponse.json({ success: true, data: inspection });
  } catch (error) {
    console.error('Error creating incoming inspection:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create incoming inspection'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stockInventoryId = searchParams.get('stockInventoryId');

    const inspections = await prisma.incomingInspection.findMany({
      where: stockInventoryId ? { stockInventoryId } : undefined,
      include: {
        Attachment: true,
        StockInventory: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: inspections });
  } catch (error) {
    console.error('Error fetching incoming inspections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incoming inspections' },
      { status: 500 }
    );
  }
} 