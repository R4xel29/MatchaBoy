import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import PaymentClient from "./PaymentClient"

export const dynamic = 'force-dynamic'

export default async function OrderPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } }
  })

  if (!order) {
    notFound()
  }

  const isPublicSource = order.source === 'SPMB' || order.source === 'WA';

  if (!isPublicSource) {
    if (!session?.user?.id) {
      redirect('/login')
    }
    // Security: only owner or admin can view this page
    if (order.userId !== session.user.id && session.user.role === 'CUSTOMER') {
      notFound()
    }
  }

  // If already paid/processing, redirect straight to tracking
  if (order.status !== 'PENDING_PAYMENT') {
    redirect(`/orders/${order.id}`)
  }

  const [settings, paymentSettings, bankAccounts] = await Promise.all([
    prisma.storeSettings.findFirst(),
    prisma.paymentSettings.findFirst(),
    prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })
  ])
  const adminWhatsApp = paymentSettings?.codWhatsApp || ''

  const mappedOrder = {
    id: order.id,
    total: order.total,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    createdAt: order.createdAt.toISOString(),
    paymentExpiredAt: order.paymentExpiredAt ? order.paymentExpiredAt.toISOString() : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    paymentQrContent: order.paymentQrContent || '',
    paymentUrl: order.paymentUrl || '',
    paymentMethod: order.paymentMethod,
    notes: order.notes || '',
    items: order.items.map((i: any) => ({
      name: i.product.name,
      qty: i.qty,
      price: i.price,
      mods: i.modifiers || ''
    }))
  }

  // Serialisasikan bank logo dan properti opsional lainnya
  const serializedBanks = bankAccounts.map(b => ({
    id: b.id,
    bankName: b.bankName,
    bankLogo: b.bankLogo,
    accountNumber: b.accountNumber,
    accountName: b.accountName
  }))

  const qrisConfig = paymentSettings ? {
    enabled: paymentSettings.qrisEnabled,
    image: paymentSettings.qrisImage,
    label: paymentSettings.qrisLabel
  } : null;

  return (
    <PaymentClient 
      order={mappedOrder} 
      adminWhatsApp={adminWhatsApp}
      bankAccounts={serializedBanks}
      qrisConfig={qrisConfig}
    />
  )
}
