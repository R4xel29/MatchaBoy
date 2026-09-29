import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { buildFallbackQrisString } from "@/lib/doku"
import QrisClient from "./QrisClient"

export const dynamic = 'force-dynamic'

export default async function OrderQrisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const order = await prisma.order.findUnique({
    where: { id },
  })

  if (!order) {
    notFound()
  }

  const isPublicSource = order.source === 'SPMB' || order.source === 'WA';

  if (!isPublicSource) {
    if (!session?.user?.id) {
      redirect('/login')
    }
    // Security check
    if (order.userId !== session.user.id && session.user.role === 'CUSTOMER') {
      notFound()
    }
  }

  // If already paid
  if (order.status !== 'PENDING_PAYMENT') {
    redirect(`/orders/${order.id}`)
  }

  const resolvedQrContent = order.paymentQrContent || buildFallbackQrisString(order.total)

  const mappedOrder = {
    id: order.id,
    total: order.total,
    paymentExpiredAt: order.paymentExpiredAt
      ? order.paymentExpiredAt.toISOString()
      : new Date(order.createdAt.getTime() + 15 * 60 * 1000).toISOString(),
    createdAt: order.createdAt.toISOString(),
    paymentQrContent: resolvedQrContent,
  }

  return (
    <QrisClient 
      order={mappedOrder}
    />
  )
}
