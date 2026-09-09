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

  return (
    <div className="space-y-6">
      <AdminCategoriesClient initialCategories={categories as any} />
    </div>
  );
}
