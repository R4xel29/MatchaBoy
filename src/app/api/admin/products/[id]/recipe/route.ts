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

    // Handle modifiers-based configs (jumboRecipe, sugarDoses, matchaDoses, shotDoses)
    const hasModifierUpdates =
      body.jumboItems !== undefined ||
      body.jumboRecipe !== undefined ||
      body.sugarDoses !== undefined ||
      body.matchaDoses !== undefined ||
      body.shotDoses !== undefined;

    if (hasModifierUpdates) {
      const currentProduct = await prisma.product.findUnique({
        where: { id },
        select: { modifiers: true },
      });

      let mods: any = {};
      if (currentProduct?.modifiers) {
        try {
          mods = JSON.parse(currentProduct.modifiers);
        } catch {}
      }

      if (body.jumboItems !== undefined || body.jumboRecipe !== undefined) {
        const rawJumbo = body.jumboItems || body.jumboRecipe || [];
        const validJumbo = rawJumbo
          .filter((ing: any) => ing.ingredientId && parseFloat(ing.quantity) > 0)
          .map((ing: any) => ({
            ingredientId: ing.ingredientId,
            quantity: parseFloat(ing.quantity),
          }));
        mods.jumboRecipe = validJumbo;
      }

      if (body.sugarDoses !== undefined) {
        mods.sugarDoses = body.sugarDoses;
      }
      if (body.matchaDoses !== undefined) {
        mods.matchaDoses = body.matchaDoses;
      }
      if (body.shotDoses !== undefined) {
        mods.shotDoses = body.shotDoses;
      }

      await prisma.product.update({
        where: { id },
        data: { modifiers: JSON.stringify(mods) },
      });
    }

    // Use transaction to update base regular recipe
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

    const [updatedRecipe, updatedProduct] = await Promise.all([
      prisma.productIngredient.findMany({
        where: { productId: id },
        include: { ingredient: true },
      }),
      prisma.product.findUnique({
        where: { id },
        select: { modifiers: true },
      }),
    ]);

    let jumboRecipe: any[] = [];
    let sugarDoses = null;
    let matchaDoses = null;
    let shotDoses = null;

    if (updatedProduct?.modifiers) {
      try {
        const parsed = JSON.parse(updatedProduct.modifiers);
        if (Array.isArray(parsed.jumboRecipe)) {
          jumboRecipe = parsed.jumboRecipe;
        }
        sugarDoses = parsed.sugarDoses || null;
        matchaDoses = parsed.matchaDoses || null;
        shotDoses = parsed.shotDoses || null;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      recipe: updatedRecipe,
      jumboRecipe,
      sugarDoses,
      matchaDoses,
      shotDoses,
    });
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
    const [recipe, product] = await Promise.all([
      prisma.productIngredient.findMany({
        where: { productId: id },
        include: { ingredient: true },
      }),
      prisma.product.findUnique({
        where: { id },
        select: { modifiers: true },
      }),
    ]);

    let jumboRecipe: any[] = [];
    let sugarDoses = null;
    let matchaDoses = null;
    let shotDoses = null;

    if (product?.modifiers) {
      try {
        const parsed = JSON.parse(product.modifiers);
        if (Array.isArray(parsed.jumboRecipe)) {
          jumboRecipe = parsed.jumboRecipe;
        }
        sugarDoses = parsed.sugarDoses || null;
        matchaDoses = parsed.matchaDoses || null;
        shotDoses = parsed.shotDoses || null;
      } catch {}
    }

    return NextResponse.json({
      recipe,
      jumboRecipe,
      sugarDoses,
      matchaDoses,
      shotDoses,
    });
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
