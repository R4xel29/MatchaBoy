import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const session = await auth();
    const body = await request.json();
    const { phone, email } = body;

    // Check product existence
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let userId: string | null = null;
    let subscribePhone: string | null = phone || null;
    let subscribeEmail: string | null = email || null;

    if (session?.user?.id) {
      userId = session.user.id;
      // Fetch user details to get phone/email
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (dbUser) {
        if (!subscribePhone) subscribePhone = dbUser.phone;
        if (!subscribeEmail) subscribeEmail = dbUser.email;
      }
    }

    if (!subscribePhone && !subscribeEmail) {
      return NextResponse.json(
        { error: 'WhatsApp number or Email is required to subscribe' },
        { status: 400 }
      );
    }

    // Standardize phone if present
    if (subscribePhone) {
      let std = subscribePhone.replace(/[^0-9]/g, '');
      if (std.startsWith('08')) {
        std = '62' + std.substring(1);
      } else if (std.startsWith('8')) {
        std = '62' + std;
      }
      subscribePhone = std;
    }

    // Upsert subscription
    const existing = await prisma.stockNotificationSubscription.findFirst({
      where: {
        productId,
        phone: subscribePhone,
      },
    });

    if (existing) {
      // Reactivate it if it was sent
      const subscription = await prisma.stockNotificationSubscription.update({
        where: { id: existing.id },
        data: {
          isSent: false,
          userId: userId || undefined,
          email: subscribeEmail || undefined,
        },
      });
      return NextResponse.json({ success: true, subscription });
    }

    const subscription = await prisma.stockNotificationSubscription.create({
      data: {
        productId,
        userId: userId || undefined,
        phone: subscribePhone,
        email: subscribeEmail,
        isSent: false,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
