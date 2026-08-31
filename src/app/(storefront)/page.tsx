import { prisma } from "@/lib/prisma"
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from "@/lib/redis-cache"
import StorefrontClient from "./StorefrontClient"

export const revalidate = 10 // Revalidate page cache at most every 10 seconds (ISR)

export default async function StorefrontPage() {
  const [categories, products, banners, packagingIngredients] = await Promise.all([
    getOrSetCache(
      CACHE_KEYS.CATEGORIES_ALL,
      () =>
        prisma.category.findMany({
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        }),
      CACHE_TTL.CATEGORIES
    ),
    getOrSetCache(
      CACHE_KEYS.PRODUCTS_ALL,
      () =>
        prisma.product.findMany({
          where: {
            OR: [
              { badge: null },
              { badge: { not: 'archived' } }
            ]
          },
          orderBy: { createdAt: 'desc' }, // Newest first
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image: true,
            categoryId: true,
            badge: true,
            modifiers: true,
          },
        }),
      CACHE_TTL.PRODUCTS
    ),
    getOrSetCache(
      CACHE_KEYS.BANNERS_ACTIVE,
      () =>
        prisma.heroBanner.findMany({
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            image: true,
            alt: true,
            headline: true,
            subheadline: true,
          },
        }),
      CACHE_TTL.BANNERS
    ),
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
        modifiers = typeof p.modifiers === 'string' ? JSON.parse(p.modifiers) : p.modifiers;
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
