import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import PaymentFailedClient from "./PaymentFailedClient"

export const dynamic = 'force-dynamic'

export default async function OrderPaymentFailedPage({ params }: { params: Promise<{ id: string }> }) {
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

  const paymentSettings = await prisma.paymentSettings.findFirst()

  // If already paid, redirect straight to tracking
  if (order.status === 'PREPARING' || order.status === 'READY' || order.status === 'COMPLETED') {
    redirect(`/orders/${order.id}`)
  }

  const mappedOrder = {
    id: order.id,
    total: order.total,
    status: order.status,
    paymentMethod: order.paymentMethod,
  }

  return (
    <PaymentFailedClient 
      order={mappedOrder}
    />
  )
}
