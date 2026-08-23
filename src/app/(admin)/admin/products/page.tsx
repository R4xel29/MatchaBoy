import { prisma } from '@/lib/prisma';
import AdminProductsClient from './AdminProductsClient';

export const revalidate = 0;

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      productIngredients: {
        include: {
          ingredient: true,
        },
      },
    },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-5">
      <AdminProductsClient
        initialProducts={products as any}
        categories={categories}
        ingredients={ingredients}
      />
    </div>
  );
}
