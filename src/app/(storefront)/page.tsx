import { prisma } from "@/lib/prisma"
import StorefrontClient from "./StorefrontClient"
import { ADD_ONS } from "@/lib/constants"

export const dynamic = 'force-dynamic' // Render at request time — avoids build-time DB access

export default async function StorefrontPage() {
  const [categories, products, banners] = await Promise.all([
    prisma.category.findMany({
      orderBy: { createdAt: 'asc' }
    }),
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' } // Newest first
    }),
    prisma.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })
  ])

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
    // Parse modifiers from DB JSON — no more matching against constants.ts
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
    />
  )
}
