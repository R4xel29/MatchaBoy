import { prisma } from '@/lib/prisma';
import InventoryClient from './InventoryClient';

export const revalidate = 0;

export default async function AdminInventoryPage() {
  const [ingredients, recentMovements] = await Promise.all([
    prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.stockMovement.findMany({
      take: 40,
      orderBy: { createdAt: 'desc' },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
            isPackaging: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <InventoryClient
        initialIngredients={ingredients}
        initialMovements={recentMovements}
      />
    </div>
  );
}

