import { prisma } from '@/lib/prisma';
import AdminFlashSalesClient from './AdminFlashSalesClient';

export const revalidate = 0;

export default async function AdminFlashSalesPage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: 'asc' }
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });

  // Map products to parse modifiers
  const mappedProducts = products.map(p => {
    let modifiers = null;
    if (p.modifiers) {
      try {
        modifiers = JSON.parse(p.modifiers);
      } catch {
        modifiers = null;
      }
    }
    return {
      ...p,
      modifiers
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Flash Sales & Promos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Jadwalkan diskon kilat berbasis durasi waktu dengan hitung mundur visual.</p>
      </div>
      <AdminFlashSalesClient 
        initialProducts={mappedProducts as any[]} 
        categories={categories} 
      />
    </div>
  );
}
