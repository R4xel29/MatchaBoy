import { prisma } from '@/lib/prisma';
import AdminProductsClient from './AdminProductsClient';

export const revalidate = 0; // Always fetch fresh products

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: {
      category: {
        name: 'asc'
      }
    }
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Product Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your menu items, pricing, and availability.
          </p>
        </div>
      </div>

      <AdminProductsClient initialProducts={products} categories={categories} />
    </div>
  );
}
