import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // Get distinct stations that have flight records
    const stationsWithRecords = await prisma.flightRecord.findMany({
      where: {
        station: {
          not: "",
        }
      },
      distinct: ['station'],
      select: {
        station: true
      }
    });

    return NextResponse.json({
      success: true,
      count: stationsWithRecords.length,
      stations: stationsWithRecords.map((s: { station: string }) => s.station)
    });
  } catch (error) {
    console.error('Error fetching stations count:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stations count' },
      { status: 500 }
    );
  }
} 