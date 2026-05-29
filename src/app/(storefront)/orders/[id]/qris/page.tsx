import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import QrisClient from "./QrisClient"

export const dynamic = 'force-dynamic'

export default async function OrderQrisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const order = await prisma.order.findUnique({
    where: { id },
  })

  if (!order) {
    notFound()
  }

  // Security check
  if (order.userId !== session.user.id && session.user.role === 'CUSTOMER') {
    notFound()
  }

  // Check if QRIS is available
  if (!order.paymentQrContent) {
    // If not generated, redirect back to payment selection
    redirect(`/orders/${order.id}/payment`)
  }

  // If already paid
  if (order.status !== 'PENDING_PAYMENT') {
    redirect(`/orders/${order.id}`)
  }

  const mappedOrder = {
    id: order.id,
    total: order.total,
    paymentExpiredAt: order.paymentExpiredAt ? order.paymentExpiredAt.toISOString() : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    createdAt: order.createdAt.toISOString(),
    paymentQrContent: order.paymentQrContent,
  }

  return (
    <QrisClient 
      order={mappedOrder}
    />
  )
}
