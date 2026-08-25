import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET: Get current active shift with full real-time cash reconciliation details + history
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== 'CASHIER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeShift = await prisma.cashierShift.findFirst({
      where: {
        cashierId: session.user.id,
        closedAt: null,
      },
    });

    let reconciliation = null;

    if (activeShift) {
      // Find orders completed during this active shift
      const shiftOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: activeShift.openedAt },
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
        select: {
          id: true,
          total: true,
          paymentMethod: true,
        },
      });

      let cashIn = 0;
      let qrisIn = 0;
      let otherIn = 0;
      let totalOrders = shiftOrders.length;

      shiftOrders.forEach((o) => {
        const pm = (o.paymentMethod || '').toUpperCase();
        if (pm === 'CASH' || pm === 'TUNAI' || pm === 'COD') {
          cashIn += o.total;
        } else if (pm.includes('QRIS')) {
          qrisIn += o.total;
        } else {
          otherIn += o.total;
        }
      });

      // Find petty cash expenses during this active shift
      const shiftExpenses = await prisma.expense.findMany({
        where: {
          date: { gte: activeShift.openedAt },
          notes: { contains: '[Kas Laci' },
        },
        select: {
          id: true,
          name: true,
          amount: true,
          date: true,
        },
      });

      const cashOut = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
      const expectedCash = activeShift.openingCash + cashIn - cashOut;

      reconciliation = {
        openingCash: activeShift.openingCash,
        cashIn,
        qrisIn,
        otherIn,
        cashOut,
        expectedCash,
        totalOrders,
        totalRevenue: cashIn + qrisIn + otherIn,
        expensesList: shiftExpenses,
      };
    }

    const history = await prisma.cashierShift.findMany({
      where: { cashierId: session.user.id },
      orderBy: { openedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ activeShift, reconciliation, history });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}

// POST: Open new shift
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== 'CASHIER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if there's already an active shift
    const existing = await prisma.cashierShift.findFirst({
      where: {
        cashierId: session.user.id,
        closedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Sudah ada shift yang aktif. Tutup shift terlebih dahulu.' },
        { status: 400 }
      );
    }

    const body = await req.json();

    const shift = await prisma.cashierShift.create({
      data: {
        cashierId: session.user.id,
        openingCash: parseInt(body.openingCash) || 0,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ success: true, shift });
  } catch (error) {
    console.error('Error opening shift:', error);
    return NextResponse.json({ error: 'Failed to open shift' }, { status: 500 });
  }
}

// PATCH: Close shift with actual cash counting & variance recording
export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== 'CASHIER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const actualCash = parseInt(body.actualCash ?? body.closingCash) || 0;
    const closingNotes = body.notes || '';

    const activeShift = await prisma.cashierShift.findFirst({
      where: {
        cashierId: session.user.id,
        closedAt: null,
      },
    });

    if (!activeShift) {
      return NextResponse.json({ error: 'Tidak ada shift yang aktif' }, { status: 400 });
    }

    // Calculate actual shift stats
    const shiftOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: activeShift.openedAt },
        status: { in: ['COMPLETED', 'DELIVERED'] },
      },
      select: {
        total: true,
        paymentMethod: true,
      },
    });

    let cashIn = 0;
    let totalRevenue = 0;
    shiftOrders.forEach((o) => {
      totalRevenue += o.total;
      const pm = (o.paymentMethod || '').toUpperCase();
      if (pm === 'CASH' || pm === 'TUNAI' || pm === 'COD') {
        cashIn += o.total;
      }
    });

    const shiftExpenses = await prisma.expense.findMany({
      where: {
        date: { gte: activeShift.openedAt },
        notes: { contains: '[Kas Laci' },
      },
      select: { amount: true },
    });

    const cashOut = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedCash = activeShift.openingCash + cashIn - cashOut;
    const variance = actualCash - expectedCash;

    let varianceStatus = 'PAS';
    if (variance > 0) varianceStatus = `LEBIH +Rp ${variance.toLocaleString('id-ID')}`;
    else if (variance < 0) varianceStatus = `KURANG -Rp ${Math.abs(variance).toLocaleString('id-ID')}`;

    const finalNotes = closingNotes
      ? `${closingNotes} | [Rekonsiliasi: Seharusnya Rp ${expectedCash.toLocaleString('id-ID')}, Nyata Rp ${actualCash.toLocaleString('id-ID')}, Selisih: ${varianceStatus}]`
      : `[Rekonsiliasi: Seharusnya Rp ${expectedCash.toLocaleString('id-ID')}, Nyata Rp ${actualCash.toLocaleString('id-ID')}, Selisih: ${varianceStatus}]`;

    const shift = await prisma.cashierShift.update({
      where: { id: activeShift.id },
      data: {
        closedAt: new Date(),
        closingCash: actualCash,
        totalOrders: shiftOrders.length,
        totalRevenue,
        notes: finalNotes,
      },
    });

    return NextResponse.json({
      success: true,
      shift,
      reconciliation: {
        expectedCash,
        actualCash,
        variance,
        varianceStatus,
      },
    });
  } catch (error) {
    console.error('Error closing shift:', error);
    return NextResponse.json({ error: 'Failed to close shift' }, { status: 500 });
  }
}
