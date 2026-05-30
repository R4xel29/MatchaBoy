import { prisma } from '@/lib/prisma';
import AdminRecipesClient from './AdminRecipesClient';

export const revalidate = 0;

export default async function AdminCustomRecipesPage() {
  const recipes = await prisma.customRecipe.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
        },
      },
    },
  });

  // Calculate stats
  const totalRecipes = recipes.length;
  const publicCount = recipes.filter(r => r.isPublic).length;
  const privateCount = totalRecipes - publicCount;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Custom Recipe Moderation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola resep kreasi pelanggan dan tentukan mana yang layak ditampilkan ke publik.</p>
      </div>
      <AdminRecipesClient
        initialRecipes={JSON.parse(JSON.stringify(recipes))}
        initialStats={{
          totalRecipes,
          publicCount,
          pendingApproval: privateCount,
        }}
      />
    </div>
  );
}
