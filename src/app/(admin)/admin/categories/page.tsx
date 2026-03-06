import { prisma } from '@/lib/prisma';
import AdminCategoriesClient from './AdminCategoriesClient';

export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Categories</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Organize your menu categories</p>
      </div>
      <AdminCategoriesClient initialCategories={categories} />
    </div>
  );
}
