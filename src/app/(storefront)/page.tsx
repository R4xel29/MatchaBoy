import { prisma } from "@/lib/prisma"
import StorefrontClient from "./StorefrontClient"
import { PRODUCTS } from "@/lib/constants"

export const revalidate = 60 // Revalidate every 60 seconds

export default async function StorefrontPage() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      orderBy: { createdAt: 'asc' }
    }),
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' } // Newest first
    })
  ])

  // Map Prisma 'Category' to the frontend 'Category' type format
  // For the 'all' category, we construct it virtually.
  const mappedCategories = [
    { id: 'all', name: 'All', slug: 'all' },
    ...categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug
    }))
  ]

  // The database returns Decimal/Int for prices. Map Prisma Product to frontend Product 
  const mappedProducts = products.map((p: any) => {
    // Find matching local product to steal its modifiers configurations
    const localRef = PRODUCTS.find(localP => localP.id === p.id)

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      image: p.image || undefined,
      category: p.categoryId,
      badge: p.badge as "new" | "best-seller" | "sold-out" | undefined,
      modifiers: localRef?.modifiers
    }
  })

  return (
    <StorefrontClient 
      categories={mappedCategories} 
      products={mappedProducts} 
    />
  )
}
