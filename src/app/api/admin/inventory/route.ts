import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const ingredients = await prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { name, unit, stock, costPerUnit, isPackaging } = body;

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        stock: parseFloat(stock) || 0,
        costPerUnit: parseInt(costPerUnit) || 0,
        isPackaging: !!isPackaging,
      },
    });

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error('Error creating ingredient:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
