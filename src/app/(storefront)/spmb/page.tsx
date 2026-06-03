import { prisma } from "@/lib/prisma"
import SpmbClient from "./SpmbClient"

export const dynamic = 'force-dynamic'

export default async function SpmbPage() {
  const [categories, products, storeSettings] = await Promise.all([
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
    prisma.storeSettings.findFirst()
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

  const botNumber = storeSettings?.whatsappNumber || "";

  return (
    <SpmbClient 
      categories={mappedCategories} 
      products={mappedProducts}
      botNumber={botNumber}
      spmbStartTime={storeSettings?.spmbStartTime || "08:00"}
      spmbEndTime={storeSettings?.spmbEndTime || "13:00"}
      spmbCloseTime={storeSettings?.spmbCloseTime || "16:00"}
    />
  )
}
