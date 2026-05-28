import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import VoucherDetailClient from "./VoucherDetailClient"

export const dynamic = 'force-dynamic'

export default async function VoucherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const voucher = await prisma.voucher.findUnique({
    where: { id },
    include: { template: true }
  })

  if (!voucher) {
    notFound()
  }

  // Fetch all products to match against applicable voucher product IDs
  const dbProducts = await prisma.product.findMany({
    where: {
      OR: [
        { badge: null },
        { badge: { not: 'archived' } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  })

  // Parse valid product IDs from template
  let validProductIds: string[] | null = null
  if (voucher.template && voucher.template.validProductIds) {
    try {
      const parsed = JSON.parse(voucher.template.validProductIds)
      if (Array.isArray(parsed)) {
        validProductIds = parsed
      }
    } catch (e) {
      console.error("Error parsing validProductIds JSON", e)
    }
  }

  // Filter products that are valid for this voucher
  const validProducts = dbProducts.filter(p => {
    if (!validProductIds) return true // null means valid for all products
    return validProductIds.includes(p.id)
  }).map((p: any) => {
    let modifiers = undefined
    if (p.modifiers) {
      try {
        modifiers = JSON.parse(p.modifiers)
      } catch {
        modifiers = undefined
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
    <VoucherDetailClient 
      voucher={JSON.parse(JSON.stringify(voucher))}
      products={validProducts}
    />
  )
}
