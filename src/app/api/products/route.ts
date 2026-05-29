import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { badge: null },
          { badge: { not: 'archived' } }
        ]
      },
      include: {
        category: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedProducts = products.map((p: any) => {
      let modifiers = undefined;
      if (p.modifiers) {
        try {
          modifiers = JSON.parse(p.modifiers);
        } catch {
          modifiers = undefined;
        }
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        image: p.image || undefined,
        category: p.categoryId,
        categoryName: p.category?.name,
        categorySlug: p.category?.slug,
        badge: p.badge,
        modifiers
      };
    });

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ 
      products: mappedProducts,
      categories: categories
    });
  } catch (error) {
    console.error('Error fetching all products:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

