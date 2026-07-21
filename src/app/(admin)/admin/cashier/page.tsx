import { prisma } from '@/lib/prisma';
import CashierPOSClient from './CashierPOSClient';

export const revalidate = 0;

export default async function AdminCashierPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        productIngredients: {
          include: { ingredient: { select: { id: true, stock: true } } },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ]);

  // Filter out archived, hidden, and disabled items
  const activeProducts = products.filter((p) => {
    const badgeLower = (p.badge || '').toLowerCase();
    return !badgeLower.includes('archived') && !badgeLower.includes('hidden') && !badgeLower.includes('disabled');
  });

  const mappedProducts = activeProducts.map((p) => {
    const isBadgeSoldOut =
      p.badge?.toLowerCase().includes('sold') ||
      p.badge?.toLowerCase().includes('habis') ||
      p.badge?.toLowerCase().includes('empty');

    const isIngredientEmpty = p.productIngredients.some(
      (pi) => pi.ingredient.stock < pi.quantity
    );

    const isSoldOut = isBadgeSoldOut || isIngredientEmpty;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      image: p.image,
      badge: p.badge,
      isSoldOut,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      modifiers: p.modifiers ? JSON.parse(p.modifiers) : null,
    };
  });

  const mappedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  return <CashierPOSClient products={mappedProducts} categories={mappedCategories} />;
}
