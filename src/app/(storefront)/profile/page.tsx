import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ProfileClient from "./ProfileClient"
import { redirect } from "next/navigation"

export const revalidate = 0 // always fetch fresh user data

export default async function ProfilePage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    // Return Guest profile
    return (
      <ProfileClient 
        user={{
          name: "Guest",
          email: "",
          phone: "-",
          points: 0,
          totalOrders: 0,
          memberSince: "-",
          referralCode: "",
          gender: "SECRET",
          birthDate: "",
          isGoogleConnected: false,
          isGuest: true, // We will add this to ProfileClient types
        }}
        orders={[]}
        vouchers={[]}
        milestones={null}
        initialUnreadCount={0}
      />
    )
  }

  try {
    const [user, orders, vouchers, loyaltySettings, unreadCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: { accounts: true }
      }),
      prisma.order.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true } } },
        take: 10 // Show last 10 orders
      }),
      prisma.voucher.findMany({
        where: { 
          userId: session.user.id, 
          isUsed: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        include: { template: true },
        take: 10,
      }),
      prisma.loyaltySettings.findFirst(),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false }
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
          email: user.email || "",
          phone: user.phone || "-",
          points: user.points,
          tumblerCount: (user as any).tumblerCount || 0,
          currentTumblerGoal: (user as any).currentTumblerGoal || 10,
          arusLevel: (user as any).arusLevel || "Tunas Arus",
          totalOrders: orders.length,
          memberSince: new Date(user.createdAt).toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
          referralCode: user.referralCode,
          gender: user.gender || "SECRET",
          birthDate: user.birthDate?.toISOString() || "",
          isGoogleConnected: user.accounts.some((acc: any) => acc.provider === 'google'),
          isGuest: false,
          image: user.image,
        }}
        orders={formattedOrders}
        vouchers={vouchers.map(v => ({
          id: v.id,
          code: v.code,
          type: v.type,
          description: v.description,
          isUsed: v.isUsed,
          expiresAt: v.expiresAt?.toISOString() || null,
          template: v.template ? {
            bannerImage: v.template.bannerImage,
            validProductIds: v.template.validProductIds,
          } : null,
        }))}
        milestones={loyaltySettings ? {
          milestone1: { target: loyaltySettings.milestone1Points, reward: loyaltySettings.milestone1Desc, enabled: loyaltySettings.milestone1Enabled },
          milestone2: { target: loyaltySettings.milestone2Points, reward: loyaltySettings.milestone2Desc, enabled: loyaltySettings.milestone2Enabled },
          milestone3: { target: loyaltySettings.milestone3Points, reward: loyaltySettings.milestone3Desc, enabled: loyaltySettings.milestone3Enabled },
        } : null}
        initialUnreadCount={unreadCount}
      />
    )
  } catch (error) {
    console.error("[PROFILE] Error loading profile data:", error)
    // Return a minimal profile if data fetching fails
    return (
      <ProfileClient 
        user={{
          name: session.user.name || "Matcha Lover",
          email: session.user.email || "",
          phone: "-",
          points: 0,
          totalOrders: 0,
          memberSince: "-",
          referralCode: "",
          gender: "SECRET",
          birthDate: "",
          isGoogleConnected: false,
          isGuest: false,
          image: session.user.image || null,
        }}
        orders={[]}
        vouchers={[]}
        milestones={null}
        initialUnreadCount={0}
      />
    )
  }
}

