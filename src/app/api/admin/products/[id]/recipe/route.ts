import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

async function handleSaveRecipe(
  request: Request,
  params: { id: string }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const rawItems = body.items || body.ingredients || [];

    const validItems = rawItems
      .filter((ing: any) => ing.ingredientId && parseFloat(ing.quantity) > 0)
      .map((ing: any) => ({
        productId: id,
        ingredientId: ing.ingredientId,
        quantity: parseFloat(ing.quantity),
      }));

    // Use transaction to update recipe
    await prisma.$transaction([
      // Delete existing recipe items
      prisma.productIngredient.deleteMany({
        where: { productId: id },
      }),
      // Create new recipe items if any
      ...(validItems.length > 0
        ? [
            prisma.productIngredient.createMany({
              data: validItems,
            }),
          ]
        : []),
    ]);

    const updatedRecipe = await prisma.productIngredient.findMany({
      where: { productId: id },
      include: { ingredient: true },
    });

    return NextResponse.json({ success: true, recipe: updatedRecipe });
  } catch (error) {
    console.error('Error updating product recipe:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSaveRecipe(request, await params);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSaveRecipe(request, await params);
}
