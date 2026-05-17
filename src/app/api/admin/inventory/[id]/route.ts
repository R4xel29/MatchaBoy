import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, unit, stock, costPerUnit, isPackaging } = body;

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        name,
        unit,
        stock: stock !== undefined ? parseFloat(stock) : undefined,
        costPerUnit: costPerUnit !== undefined ? parseInt(costPerUnit) : undefined,
        isPackaging: isPackaging !== undefined ? !!isPackaging : undefined,
      },
    });

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    await prisma.ingredient.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
