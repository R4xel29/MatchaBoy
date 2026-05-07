import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // In PostgreSQL or MySQL, we could use Prisma's `ORDER BY RANDOM()` via raw queries,
    // but a database-agnostic way for a small catalog is to fetch all active IDs and pick 3.
    // Fetch all active IDs and pick 3. Products are active unless badge is 'sold-out'.
    const allProducts = await prisma.product.findMany({
      where: { 
        OR: [
          { badge: null },
          { badge: { not: 'sold-out' } }
        ]
      },
      select: { id: true }
    });

    if (allProducts.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Shuffle and pick 3 IDs
    const shuffledIds = allProducts.sort(() => 0.5 - Math.random()).slice(0, 3).map(p => p.id);

    // Fetch the full details for the selected IDs
    const randomProducts = await prisma.product.findMany({
      where: { id: { in: shuffledIds } }
    });

    const mappedProducts = randomProducts.map((p: any) => {
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
        badge: p.badge as "new" | "best-seller" | "sold-out" | undefined,
        modifiers
      };
    });

    return NextResponse.json({ products: mappedProducts });
  } catch (error) {
    console.error('Error fetching random products:', error);
    return NextResponse.json({ products: [] });
  }
}
