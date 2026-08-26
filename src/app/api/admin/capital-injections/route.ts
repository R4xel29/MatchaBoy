import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const method = searchParams.get('method');
    const category = searchParams.get('category');

    const where: any = {};
    if (method && method !== 'ALL') {
      where.paymentMethod = method.toUpperCase();
    }
    if (category && category !== 'ALL') {
      where.category = category.toUpperCase();
    }

    const items = await prisma.capitalInjection.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    const cashSum = items
      .filter((i) => i.paymentMethod === 'CASH')
      .reduce((sum, i) => sum + i.amount, 0);

    const qrisSum = items
      .filter((i) => i.paymentMethod === 'QRIS')
      .reduce((sum, i) => sum + i.amount, 0);

    return NextResponse.json({
      success: true,
      items,
      totals: {
        cash: cashSum,
        qris: qrisSum,
        total: cashSum + qrisSum,
        count: items.length,
      },
    });
  } catch (error) {
    console.error('Error fetching capital injections:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { name, amount, paymentMethod, category, notes, date } = body;

    if (!name || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Nama dan nominal wajib diisi' }, { status: 400 });
    }

    const numericAmount = parseInt(amount, 10);
    if (isNaN(numericAmount) || numericAmount === 0) {
      return NextResponse.json({ error: 'Nominal harus berupa angka valid bukan nol' }, { status: 400 });
    }

    const validMethod = (paymentMethod || 'CASH').toUpperCase() === 'QRIS' ? 'QRIS' : 'CASH';
    const validCategory = category || 'CAPITAL_INJECTION';
    const targetDate = date ? new Date(date) : new Date();

    const created = await prisma.capitalInjection.create({
      data: {
        name,
        amount: numericAmount,
        paymentMethod: validMethod,
        category: validCategory,
        notes: notes || null,
        date: targetDate,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, item: created });
  } catch (error) {
    console.error('Error creating capital injection:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
