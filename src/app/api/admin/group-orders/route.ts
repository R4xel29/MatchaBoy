import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupCarts = await prisma.groupCart.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true, phone: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, image: true, price: true },
            },
          },
        },
      },
    });

    const mapped = groupCarts.map((gc) => {
      const participants = [...new Set(gc.items.map((i) => i.memberName))];
      const totalPrice = gc.items.reduce((sum, i) => sum + i.price * i.qty, 0);

      return {
        id: gc.id,
        creatorId: gc.creatorId,
        creatorName: gc.creator.name || 'Unknown',
        creatorPhone: gc.creator.phone || '-',
        creatorEmail: gc.creator.email || '-',
        status: gc.status,
        itemsCount: gc.items.length,
        totalParticipants: participants.length,
        participants,
        totalPrice,
        items: gc.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productImage: item.product.image,
          memberName: item.memberName,
          qty: item.qty,
          price: item.price,
          modifiers: item.modifiers,
          createdAt: item.createdAt.toISOString(),
        })),
        createdAt: gc.createdAt.toISOString(),
        updatedAt: gc.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ groupOrders: mapped });
  } catch (error) {
    console.error('Admin group-orders GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, action } = body as { id: string; action: 'close' | 'cancel' };

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const existing = await prisma.groupCart.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Group order not found' }, { status: 404 });
    }

    let newStatus: string;
    switch (action) {
      case 'close':
        newStatus = 'CHECKED_OUT';
        break;
      case 'cancel':
        newStatus = 'CANCELLED';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.groupCart.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json({
      success: true,
      groupOrder: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Admin group-orders PATCH error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
