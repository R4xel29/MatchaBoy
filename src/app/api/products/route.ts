import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getOrSetCache(
      CACHE_KEYS.PRODUCTS_ALL,
      async () => {
        const [products, categories, packagingIngredients] = await Promise.all([
          prisma.product.findMany({
            where: {
              OR: [{ badge: null }, { badge: { not: 'archived' } }],
            },
            include: {
              category: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.category.findMany({
            orderBy: { name: 'asc' },
          }),
          prisma.ingredient.findMany({
            where: { isPackaging: true },
            select: { id: true, name: true, stock: true },
          }),
        ]);

        let cupRegularStock = 999;
        let cupJumboStock = 999;

        packagingIngredients.forEach((p) => {
          const name = p.name.toLowerCase();
          if (name.includes('jumbo') || name.includes('large') || name.includes('22')) {
            cupJumboStock = p.stock;
          } else if (name.includes('regular') || name.includes('14') || name.includes('16') || name.includes('gelas')) {
            cupRegularStock = p.stock;
          }
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
            modifiers,
          };
        });

        return {
          products: mappedProducts,
          categories,
          packagingStock: {
            cupRegular: cupRegularStock,
            cupJumbo: cupJumboStock,
          },
        };
      },
      CACHE_TTL.PRODUCTS
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching all products:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
