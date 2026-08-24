import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, type, x, y, width, height, rotation, color } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (x !== undefined) data.x = typeof x === 'number' ? x : parseInt(x);
    if (y !== undefined) data.y = typeof y === 'number' ? y : parseInt(y);
    if (width !== undefined) data.width = typeof width === 'number' ? width : parseInt(width);
    if (height !== undefined) data.height = typeof height === 'number' ? height : parseInt(height);
    if (rotation !== undefined) data.rotation = typeof rotation === 'number' ? rotation : parseInt(rotation);
    if (color !== undefined) data.color = color;

    const element = await prisma.floorElement.update({
      where: { id },
      data,
    });

    return NextResponse.json(element);
  } catch (error: any) {
    console.error('Error updating floor element:', error);
    return NextResponse.json({ error: 'Failed to update floor element' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.floorElement.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting floor element:', error);
    return NextResponse.json({ error: 'Failed to delete floor element' }, { status: 500 });
  }
}
