import { prisma } from '@/lib/prisma';
import AdminCategoriesClient from './AdminCategoriesClient';

export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { products: true } },
      products: {
        select: {
          id: true,
          name: true,
          price: true,
          image: true,
          badge: true,
        },
        take: 4,
        orderBy: { name: 'asc' },
      },
    },
  });

  const allProducts = await prisma.product.findMany({
    where: {
      OR: [
        { badge: null },
        { badge: { not: 'archived' } },
      ],
    },
    select: {
      id: true,
      name: true,
      price: true,
      image: true,
      badge: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  });

  return (
    <div className="space-y-6">
      <AdminCategoriesClient
        initialCategories={categories as any}
        allProducts={allProducts as any}
      />
    </div>
  );
}
