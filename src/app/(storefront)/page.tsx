import { prisma } from "@/lib/prisma"
import StorefrontClient from "./StorefrontClient"

export const revalidate = 10 // Revalidate page cache at most every 10 seconds (ISR)

export default async function StorefrontPage() {
  const [categories, products, banners, packagingIngredients] = await Promise.all([
    prisma.category.findMany({
      orderBy: { createdAt: 'asc' }
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { badge: null },
          { badge: { not: 'archived' } }
        ]
      },
      orderBy: { createdAt: 'desc' } // Newest first
    }),
    prisma.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    }),
    prisma.ingredient.findMany({
      where: { isPackaging: true },
      select: { id: true, name: true, stock: true },
    }),
  ])

  let cupRegularStock = 999;
  let cupJumboStock = 999;

  packagingIngredients.forEach((p) => {
    const name = p.name.toLowerCase();
    if (name.includes('jumbo') || name.includes('large') || name.includes('22')) {
      cupJumboStock = p.stock;
    } else if (name.includes('regular') || name.includes('14') || name.includes('16') || name.includes('gelas')) {
      cupRegularStock = p.stock;
    }
  });

  // Map Prisma 'Category' to the frontend 'Category' type format
  const mappedCategories = [
    { id: 'all', name: 'All', slug: 'all' },
    ...categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug
    }))
  ]

  // Map Prisma Product to frontend Product, reading modifiers from DB
  const mappedProducts = products.map((p: any) => {
    let modifiers = undefined;
    if (p.modifiers) {
      try {
        modifiers = JSON.parse(p.modifiers);
      } catch {
        modifiers = undefined;
      }
    }

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      image: p.image || undefined,
      category: p.categoryId,
      badge: p.badge as "new" | "best-seller" | "sold-out" | undefined,
      modifiers
    }
  })

  return (
    <StorefrontClient 
      categories={mappedCategories} 
      products={mappedProducts}
      banners={banners}
      packagingStock={{ cupRegular: cupRegularStock, cupJumbo: cupJumboStock }}
    />
  )
}
