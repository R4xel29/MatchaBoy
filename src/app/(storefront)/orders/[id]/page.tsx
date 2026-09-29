import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { expireOrder } from "@/lib/order-utils"
import { buildFallbackQrisString } from "@/lib/doku"
import OrderTrackingClient from "./OrderTrackingClient"
import { notFound, redirect } from "next/navigation"

export const revalidate = 0 // always fetch fresh order data

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth()
  
  // Auto-expire order if past payment deadline
  await expireOrder(id);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } }
  })

  // Security: only owner, cashier, or admin can view this order
  if (!order) {
    notFound()
  }

  const isPublicSource = order.source === 'SPMB' || order.source === 'WA';

  if (!isPublicSource) {
    if (!session?.user?.id) {
      redirect('/login')
    }
    const role = session.user.role
    if (order.userId !== session.user.id && role === 'CUSTOMER') {
      notFound() // Hide from unauthorized customers
    }
  }

  // Fetch reviews already submitted for this order by this user (only if logged in)
  let reviewedProductIds = new Set<string>();
  if (session?.user?.id) {
    const existingReviews = await prisma.review.findMany({
      where: {
        userId: session.user.id,
        orderId: id,
      },
      select: {
        productId: true,
      }
    })
    reviewedProductIds = new Set(existingReviews.map(r => r.productId))
  }

  const [settings, paymentSettings, loyaltySettings, redeemPointRecord] = await Promise.all([
    prisma.storeSettings.findFirst(),
    prisma.paymentSettings.findFirst(),
    prisma.loyaltySettings.findFirst(),
    prisma.pointHistory.findFirst({
      where: {
        orderId: id,
        type: 'REDEEM_ORDER',
      },
      select: {
        amount: true,
      },
    }),
  ])
  const cancellationTimeLimit = settings?.cancellationTimeLimit ?? 15
  const adminWhatsApp = paymentSettings?.codWhatsApp || ''
  const pointValue = loyaltySettings?.pointValue ?? 1000
  const pointsUsed = redeemPointRecord ? Math.abs(redeemPointRecord.amount) : 0
  const pointsDiscount = pointsUsed * pointValue
  const tumblerDiscount =
    order.hasTumbler && loyaltySettings?.tumblerBonusEnabled && loyaltySettings.tumblerDiscountPct > 0
      ? Math.round(order.subtotal * (loyaltySettings.tumblerDiscountPct / 100))
      : 0

  // Map to the shape expected by the frontend
  const mappedOrder = {
    id: order.id,
    status: order.status, // Keep UPPERCASE to match client-side comparisons
    cancelReason: order.cancelReason || null,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: order.address,
    paymentMethod: order.paymentMethod,
    items: order.items.map((item: any) => ({
      productId: item.productId,
      name: item.product.name,
      qty: item.qty,
      price: item.price,
      originalPrice: item.product.price,
      image: item.product.image || undefined,
      mods: item.modifiers || undefined,
      reviewed: reviewedProductIds.has(item.productId),
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    voucherCode: order.voucherCode || undefined,
    tumblerDiscount,
    pointsDiscount,
    pointsEarned: order.pointsEarned || 0,
    tableNumber: order.tableNumber || null,
    notes: order.notes || undefined,
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
    paymentQrContent:
      order.paymentQrContent ||
      ((order.paymentMethod === 'QRIS' || order.paymentMethod === 'QRIS_INSTAN' || order.notes?.includes('[CHANNEL: QRIS]'))
        ? buildFallbackQrisString(order.total)
        : undefined),
    queueNumber: order.queueNumber || null,
  }

  return <OrderTrackingClient order={mappedOrder as any} />
}
