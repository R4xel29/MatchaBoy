import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all subscriptions grouped by product
    const subscriptions = await prisma.stockNotificationSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, image: true, badge: true, price: true },
        },
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    // Group by product
    const productMap = new Map<string, {
      productId: string;
      productName: string;
      productImage: string | null;
      productBadge: string | null;
      productPrice: number;
      subscriberCount: number;
      sentCount: number;
      subscribers: Array<{
        id: string;
        userName: string | null;
        userEmail: string | null;
        userPhone: string | null;
        phone: string | null;
        email: string | null;
        isSent: boolean;
        createdAt: string;
      }>;
    }>();

    for (const sub of subscriptions) {
      const key = sub.productId;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: sub.product.id,
          productName: sub.product.name,
          productImage: sub.product.image,
          productBadge: sub.product.badge,
          productPrice: sub.product.price,
          subscriberCount: 0,
          sentCount: 0,
          subscribers: [],
        });
      }
      const group = productMap.get(key)!;
      group.subscriberCount++;
      if (sub.isSent) group.sentCount++;
      group.subscribers.push({
        id: sub.id,
        userName: sub.user?.name || null,
        userEmail: sub.user?.email || null,
        userPhone: sub.user?.phone || null,
        phone: sub.phone,
        email: sub.email,
        isSent: sub.isSent,
        createdAt: sub.createdAt.toISOString(),
      });
    }

    // Sort by subscriber count descending (demand ranking)
    const grouped = Array.from(productMap.values()).sort(
      (a, b) => b.subscriberCount - a.subscriberCount
    );

    return NextResponse.json({ products: grouped, totalSubscriptions: subscriptions.length });
  } catch (error) {
    console.error('Admin notify-me GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body as { productId: string };

    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Mark all unsent subscriptions for this product as sent
    const result = await prisma.stockNotificationSubscription.updateMany({
      where: { productId, isSent: false },
      data: { isSent: true },
    });

    // Also update product badge to remove sold-out
    if (product.badge === 'sold-out') {
      await prisma.product.update({
        where: { id: productId },
        data: { badge: null },
      });
    }

    // Create notifications for subscribed users
    const unsentSubs = await prisma.stockNotificationSubscription.findMany({
      where: { productId, isSent: true, userId: { not: null } },
      select: { userId: true },
    });

    const uniqueUserIds = [...new Set(unsentSubs.map(s => s.userId).filter(Boolean))] as string[];
    
    if (uniqueUserIds.length > 0) {
      await prisma.notification.createMany({
        data: uniqueUserIds.map(userId => ({
          userId,
          type: 'promo',
          title: `${product.name} Sudah Tersedia!`,
          message: `Kabar baik! ${product.name} yang kamu tunggu sudah restock. Pesan sekarang sebelum habis lagi! 🎉`,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      notifiedCount: result.count,
      productName: product.name,
    });
  } catch (error) {
    console.error('Admin notify-me POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
