import { prisma } from '@/lib/prisma';
import AdminCategoriesClient from './AdminCategoriesClient';

export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Category Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage product categories for your menu.
        </p>
      </div>
      <AdminCategoriesClient initialCategories={categories} />
    </div>
  );
}
