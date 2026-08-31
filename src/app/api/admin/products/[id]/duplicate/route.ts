import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';
import { invalidateProductCache } from '@/lib/redis-cache';

// POST /api/admin/products/[id]/duplicate — Duplicate an existing product
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const originalProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        productIngredients: true,
        productToppings: true,
      },
    });

    if (!originalProduct) {
      return new NextResponse('Product not found', { status: 404 });
    }

    const newName = `${originalProduct.name} (Copy)`;

    // Create cloned product
    const duplicatedProduct = await prisma.product.create({
      data: {
        name: newName,
        description: originalProduct.description,
        price: originalProduct.price,
        image: originalProduct.image,
        badge: originalProduct.badge === 'archived' ? null : originalProduct.badge,
        modifiers: originalProduct.modifiers,
        categoryId: originalProduct.categoryId,
        // Clone recipes if any
        productIngredients: {
          create: originalProduct.productIngredients.map((pi) => ({
            ingredientId: pi.ingredientId,
            quantity: pi.quantity,
          })),
        },
        // Clone toppings if any
        productToppings: {
          create: originalProduct.productToppings.map((pt) => ({
            toppingId: pt.toppingId,
            customPrice: pt.customPrice,
          })),
        },
      },
      include: {
        category: true,
        productIngredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    await logAdminAction({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'PRODUCT',
      entityId: duplicatedProduct.id,
      details: `Menduplikasi produk "${originalProduct.name}" menjadi "${duplicatedProduct.name}"`,
    });

    await invalidateProductCache();

    return NextResponse.json(duplicatedProduct, { status: 201 });
  } catch (error) {
    console.error('Error duplicating product:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
