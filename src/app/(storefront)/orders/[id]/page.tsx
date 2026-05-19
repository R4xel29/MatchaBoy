import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import OrderTrackingClient from "./OrderTrackingClient"
import { notFound, redirect } from "next/navigation"

export const revalidate = 0 // always fetch fresh order data

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } }
  })

  // Security: only owner, cashier, or admin can view this order
  if (!order) {
    notFound()
  }

  const role = session.user.role
  if (order.userId !== session.user.id && role === 'CUSTOMER') {
    notFound() // Hide from unauthorized customers
  }

  const settings = await prisma.storeSettings.findFirst()
  const cancellationTimeLimit = settings?.cancellationTimeLimit ?? 15

  const paymentSettings = await prisma.paymentSettings.findFirst()
  const adminWhatsApp = paymentSettings?.codWhatsApp || ''

  // Map to the shape expected by the frontend
  const mappedOrder = {
    id: order.id,
    status: order.status, // Keep UPPERCASE to match client-side comparisons
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: order.address,
    paymentMethod: order.paymentMethod,
    items: order.items.map((item: any) => ({
      name: item.product.name,
      qty: item.qty,
      price: item.price,
      mods: item.modifiers || undefined
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    createdAt: new Date(order.createdAt).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    createdAtRaw: order.createdAt.toISOString(),
    cancellationTimeLimit,
    estimatedArrival: 'TBD', // In real life, calculate based on pickup time + distance
    orderType: (order as any).orderType || 'DELIVERY',
    hasTumbler: order.hasTumbler || false,
    adminWhatsApp,
    paymentUrl: order.paymentUrl || undefined,
  }

  return <OrderTrackingClient order={mappedOrder as any} />
}
