import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedules = await prisma.autoReorder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    const mapped = schedules.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.name || 'Unknown',
      userPhone: s.user.phone || '-',
      userEmail: s.user.email || '-',
      productId: s.productId,
      productName: s.productName,
      price: s.price,
      quantity: s.quantity,
      size: s.size,
      iceLevel: s.iceLevel,
      sugarLevel: s.sugarLevel,
      addOns: s.addOns,
      frequency: s.frequency,
      dayOfWeek: s.dayOfWeek,
      dayOfMonth: s.dayOfMonth,
      timeSlot: s.timeSlot,
      deliveryAddress: s.deliveryAddress,
      paymentMethod: s.paymentMethod,
      isActive: s.isActive,
      lastTriggeredAt: s.lastTriggeredAt?.toISOString() || null,
      nextTriggeredAt: s.nextTriggeredAt?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ schedules: mapped });
  } catch (error) {
    console.error('Admin auto-reorder GET error:', error);
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
    const { id, action } = body as { id: string; action: 'pause' | 'resume' | 'cancel' };

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const existing = await prisma.autoReorder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'pause':
        updateData = { isActive: false };
        break;
      case 'resume':
        updateData = { isActive: true };
        break;
      case 'cancel':
        await prisma.autoReorder.delete({ where: { id } });
        return NextResponse.json({ success: true, deleted: true });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.autoReorder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, schedule: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } });
  } catch (error) {
    console.error('Admin auto-reorder PATCH error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
