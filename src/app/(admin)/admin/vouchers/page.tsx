import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import VoucherAdminClient from "./VoucherAdminClient"

export const dynamic = 'force-dynamic'

export default async function AdminVouchersPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  // Fetch all voucher templates
  const templates = await prisma.voucherTemplate.findMany({
    orderBy: { createdAt: 'desc' }
  })

  // Fetch all products for selector in the creation/editing form
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { badge: null },
        { badge: { not: 'archived' } }
      ]
    },
    select: {
      id: true,
      name: true,
      category: {
        select: {
          name: true
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  return (
    <VoucherAdminClient 
      initialTemplates={JSON.parse(JSON.stringify(templates))} 
      products={products} 
    />
  )
}
