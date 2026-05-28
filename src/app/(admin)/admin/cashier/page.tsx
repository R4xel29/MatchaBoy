import { prisma } from '@/lib/prisma';
import CashierPOSClient from './CashierPOSClient';

export const revalidate = 0;

export default async function AdminCashierPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        AND: [
          { badge: { not: 'sold-out' } },
          {
            OR: [
              { badge: null },
              { badge: { not: 'archived' } }
            ]
          }
        ]
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const mappedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    image: p.image,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    modifiers: p.modifiers ? JSON.parse(p.modifiers) : null,
  }));

  const mappedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  return <CashierPOSClient products={mappedProducts} categories={mappedCategories} />;
}
