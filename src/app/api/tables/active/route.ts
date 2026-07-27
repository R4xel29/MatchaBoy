import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tables = await prisma.diningTable.findMany({
      orderBy: { number: 'asc' },
    });
    return NextResponse.json(tables);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch active tables' },
      { status: 500 }
    );
  }
}
