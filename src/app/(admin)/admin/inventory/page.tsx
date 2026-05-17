import { prisma } from '@/lib/prisma';
import InventoryClient from './InventoryClient';

export const revalidate = 0;

export default async function AdminInventoryPage() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Inventory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage raw materials, packaging, and stock levels</p>
      </div>
      <InventoryClient initialIngredients={ingredients} />
    </div>
  );
}
