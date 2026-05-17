import { prisma } from '@/lib/prisma';
import AdminProductsClient from './AdminProductsClient';

export const revalidate = 0;

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { category: { name: 'asc' } }
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });

  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Products</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage menu items, pricing, and availability</p>
      </div>
      <AdminProductsClient 
        initialProducts={products} 
        categories={categories} 
        ingredients={ingredients}
      />
    </div>
  );
}
