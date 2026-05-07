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

  try {
    const [user, orders, vouchers, loyaltySettings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id }
      }),
      prisma.order.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true } } },
        take: 10 // Show last 10 orders
      }),
      prisma.voucher.findMany({
        where: { userId: session.user.id, isUsed: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.loyaltySettings.findFirst(),
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
          points: user.points,
          totalOrders: orders.length,
          memberSince: new Date(user.createdAt).toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
          referralCode: user.referralCode,
        }}
        orders={formattedOrders}
        vouchers={vouchers.map(v => ({
          id: v.id,
          code: v.code,
          type: v.type,
          description: v.description,
          isUsed: v.isUsed,
          expiresAt: v.expiresAt?.toISOString() || null,
        }))}
        milestones={loyaltySettings ? {
          milestone1: { target: loyaltySettings.milestone1Points, reward: loyaltySettings.milestone1Desc, enabled: loyaltySettings.milestone1Enabled },
          milestone2: { target: loyaltySettings.milestone2Points, reward: loyaltySettings.milestone2Desc, enabled: loyaltySettings.milestone2Enabled },
          milestone3: { target: loyaltySettings.milestone3Points, reward: loyaltySettings.milestone3Desc, enabled: loyaltySettings.milestone3Enabled },
        } : null}
      />
    )
  } catch (error) {
    console.error("[PROFILE] Error loading profile data:", error)
    // Return a minimal profile if data fetching fails
    return (
      <ProfileClient 
        user={{
          name: session.user.name || "Matcha Lover",
          phone: "-",
          points: 0,
          totalOrders: 0,
          memberSince: "-",
          referralCode: "",
        }}
        orders={[]}
        vouchers={[]}
        milestones={null}
      />
    )
  }
}

