import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
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
        badge: p.badge,
        modifiers
      };
    });

    return NextResponse.json({ products: mappedProducts });
  } catch (error) {
    console.error('Error fetching all products:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
