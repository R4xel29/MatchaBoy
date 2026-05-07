import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return new NextResponse('Product not found', { status: 404 });
    }

    let modifiers = undefined;
    if (product.modifiers) {
      try {
        modifiers = JSON.parse(product.modifiers);
      } catch {
        modifiers = undefined;
      }
    }

    const mappedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image || undefined,
      category: product.categoryId,
      badge: product.badge as "new" | "best-seller" | "sold-out" | undefined,
      modifiers
    };

    return NextResponse.json({ product: mappedProduct });
  } catch (error) {
    console.error('Error fetching product:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
