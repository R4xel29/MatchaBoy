import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await auth();

    // Dashboard karyawan hanya untuk sesi dan role karyawan (bukan admin)
    const isKaryawan = session?.user && (session.user.role === 'CASHIER' || session.user.role === 'KARYAWAN');
    if (!isKaryawan) {
      return NextResponse.json({ error: 'Forbidden: Endpoint ini khusus untuk sesi dan role karyawan' }, { status: 403 });
    }

    const userId = session.user.id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // 1. Fetch active cashier shift for current user
    const activeShift = await prisma.cashierShift.findFirst({
      where: {
        cashierId: userId,
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
      const totalOrders = shiftOrders.length;

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

    // 2. Fetch live kitchen/bar queue orders for today
    const liveOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: { in: ['PENDING', 'PREPARING', 'READY'] },
        NOT: {
          source: 'SPMB',
          customerPhone: { startsWith: 'SPMB-PENDING' },
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Oldest first (FIFO kitchen queue)
    });

    // 3. Fetch SOP template items & today's submissions for this user
    const [sopTemplates, userTodaySubmissions] = await Promise.all([
      prisma.sopTemplateItem.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.sopSubmission.findMany({
        where: {
          userId,
          createdAt: { gte: todayStart },
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 4. Critical Ingredients (Stock <= 10)
    const criticalIngredients = await prisma.ingredient.findMany({
      where: { stock: { lte: 10 } },
      select: { id: true, name: true, stock: true, unit: true },
      orderBy: { stock: 'asc' },
      take: 8,
    });

    // 5. Active co-workers on duty today
    const activeStaff = await prisma.cashierShift.findMany({
      where: { closedAt: null },
      include: {
        cashier: {
          select: {
            id: true,
            name: true,
            image: true,
            jobdeskCode: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    // 6. User's recent shifts
    const recentShifts = await prisma.cashierShift.findMany({
      where: { cashierId: userId },
      orderBy: { openedAt: 'desc' },
      take: 5,
    });

    // 7. Store settings for greeting / announcement
    const storeSettings = await prisma.storeSettings.findFirst({
      select: {
        storeName: true,
        announcementText: true,
        isOpen: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          jobdeskCode: (session.user as any).jobdeskCode || null,
        },
        activeShift,
        reconciliation,
        recentShifts,
        liveOrders,
        sopTemplates,
        userTodaySubmissions,
        criticalIngredients,
        activeStaff,
        storeSettings,
      },
    });
  } catch (error) {
    console.error('Error fetching karyawan dashboard data:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dashboard karyawan' }, { status: 500 });
  }
}
