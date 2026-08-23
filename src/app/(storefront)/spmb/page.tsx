import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import SpmbClient from "./SpmbClient"

export const dynamic = 'force-dynamic'

export default async function SpmbPage() {
  const [categories, products, storeSettings, tables] = await Promise.all([
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
      include: {
        category: true
      },
      orderBy: { createdAt: 'desc' } // Newest first
    }),
    prisma.storeSettings.findFirst(),
    prisma.diningTable.findMany({
      orderBy: { number: 'asc' }
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
      categoryName: p.category?.name,
      categorySlug: p.category?.slug,
      badge: p.badge as "new" | "best-seller" | "sold-out" | undefined,
      modifiers
    }
  })

  const botNumber = storeSettings?.whatsappNumber || "";

  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-brand-500/25 border-t-brand-500 animate-spin" />
          <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase">Memuat Menu...</p>
        </div>
      </div>
    }>
      <SpmbClient 
        categories={mappedCategories} 
        products={mappedProducts}
        botNumber={botNumber}
        spmbStartTime={storeSettings?.spmbStartTime || "08:00"}
        spmbEndTime={storeSettings?.spmbEndTime || "13:00"}
        spmbCloseTime={storeSettings?.spmbCloseTime || "16:00"}
        operationalDays={storeSettings?.operationalDays || "[0,1,2,3,4,5,6]"}
        disabledDates={storeSettings?.disabledDates || "[]"}
        initialTables={tables}
      />
    </Suspense>
  )
}
