import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const elements = await prisma.floorElement.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ elements });
  } catch (error: any) {
    console.error('Error fetching floor elements:', error);
    return NextResponse.json({ error: 'Failed to fetch floor elements' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, x, y, width, height, rotation, color } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const element = await prisma.floorElement.create({
      data: {
        name,
        type,
        x: typeof x === 'number' ? x : 50,
        y: typeof y === 'number' ? y : 50,
        width: typeof width === 'number' ? width : 80,
        height: typeof height === 'number' ? height : 40,
        rotation: typeof rotation === 'number' ? rotation : 0,
        color: color || null,
      },
    });

    return NextResponse.json(element, { status: 201 });
  } catch (error: any) {
    console.error('Error creating floor element:', error);
    return NextResponse.json({ error: 'Failed to create floor element' }, { status: 500 });
  }
}
