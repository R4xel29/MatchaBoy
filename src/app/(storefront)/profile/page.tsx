import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ProfileClient from "./ProfileClient"
import { redirect } from "next/navigation"

export const revalidate = 0 // always fetch fresh user data

export default async function ProfilePage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id }
    }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: true } } },
      take: 10 // Show last 10 orders
    })
  ])

  if (!user) {
    redirect('/login')
  }

  // Format orders for the client
  const formattedOrders = orders.map((order: any) => ({
    id: order.id,
    date: new Date(order.createdAt).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    // Create a string like "2x Matcha Signature, 1x Dirty Matcha"
    items: order.items.map((i: any) => `${i.qty}× ${i.product.name}`).join(', '),
    total: order.total,
    status: order.status.toLowerCase(),
  }))

  return (
    <ProfileClient 
      user={{
        name: user.name || "Matcha Lover",
        phone: user.phone || "-",
        points: Math.floor(orders.reduce((acc: any, o: any) => acc + o.total, 0) / 10000), // 1 point per Rp10.000 spent
        totalOrders: orders.length,
        memberSince: new Date(user.createdAt).toLocaleString('id-ID', { month: 'long', year: 'numeric' })
      }}
      orders={formattedOrders}
    />
  )
}
