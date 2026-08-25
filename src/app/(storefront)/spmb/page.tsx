import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import SpmbClient from "./SpmbClient"

export const dynamic = 'force-dynamic'

export default async function SpmbPage() {
  const [categories, products, storeSettings, tables, floorElements, packagingIngredients] = await Promise.all([
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
    }),
    prisma.floorElement.findMany({
      orderBy: { createdAt: 'asc' }
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
      categoryName: p.category?.name,
      categorySlug: p.category?.slug,
      badge: p.badge as "new" | "best-seller" | "sold-out" | undefined,
      modifiers
    }
  })

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-serif text-sm text-stone-500">Memuat Menu Arum Seduh...</div>}>
      <SpmbClient
        categories={mappedCategories}
        products={mappedProducts}
        botNumber={(storeSettings as any)?.botNumber || storeSettings?.adminWaNumbers || ''}
        spmbStartTime={(storeSettings as any)?.spmbStartTime || storeSettings?.openTime || '08:00'}
        spmbEndTime={(storeSettings as any)?.spmbEndTime || storeSettings?.closeTime || '22:00'}
        spmbCloseTime={(storeSettings as any)?.spmbCloseTime || storeSettings?.closeTime || '21:30'}
        operationalDays={(storeSettings as any)?.operationalDays || 'ALL'}
        disabledDates={(storeSettings as any)?.disabledDates || ''}
        initialTables={tables.map((t: any) => ({
          id: t.id,
          number: t.number.toString(),
          capacity: t.capacity,
          shape: t.shape,
          x: t.x,
          y: t.y,
          rotation: t.rotation,
          status: t.status,
          chairsJson: t.chairsJson
        }))}
        initialFloorElements={floorElements.map((el: any) => ({
          id: el.id,
          name: el.label || el.type || 'Landmark',
          type: el.type,
          label: el.label,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          metadata: el.metadata
        }))}
        packagingStock={{ cupRegular: cupRegularStock, cupJumbo: cupJumboStock }}
      />
    </Suspense>
  )
}
