import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const recipe = await prisma.productIngredient.findMany({
      where: { productId: id },
      include: { ingredient: true },
    });

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error fetching product recipe:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
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
    const { ingredients } = body; // Array of { ingredientId: string, quantity: number }

    // Use transaction to update recipe
    await prisma.$transaction([
      // Delete existing recipe items
      prisma.productIngredient.deleteMany({
        where: { productId: id },
      }),
      // Create new recipe items
      prisma.productIngredient.createMany({
        data: ingredients.map((ing: any) => ({
          productId: id,
          ingredientId: ing.ingredientId,
          quantity: parseFloat(ing.quantity),
        })),
      }),
    ]);

    return new NextResponse('Recipe updated', { status: 200 });
  } catch (error) {
    console.error('Error updating product recipe:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
