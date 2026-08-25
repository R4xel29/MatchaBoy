import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !['ADMIN', 'CASHIER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const range = req.nextUrl.searchParams.get('range') || 'today';
    const now = new Date();

    let currentStart: Date;
    const currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (range === 'today') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (range === 'week') {
      currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      currentStart.setHours(0, 0, 0, 0);
    } else if (range === 'month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else {
      currentStart = new Date(0);
    }

    const isAll = range === 'all';
    const orderDateFilter = isAll
      ? {}
      : { createdAt: { gte: currentStart, lte: currentEnd } };
    const expenseDateFilter = isAll
      ? {}
      : { date: { gte: currentStart, lte: currentEnd } };

    const nonSpmbPendingFilter = {
      NOT: {
        source: 'SPMB',
        customerPhone: { startsWith: 'SPMB-PENDING' }
      }
    };

    // Parallel DB Queries
    const [
      orders,
      expensesAggregate,
      totalCustomers,
      totalProducts,
      soldOutProductsCount,
      activeCashierShifts,
      onlineDrivers,
      diningTables,
      criticalIngredients,
      soldOutProductsList,
      openTicketsCount,
      pendingTopupsCount,
      orderItems,
      recentOrders
    ] = await Promise.all([
      // Orders in range
      prisma.order.findMany({
        where: {
          ...orderDateFilter,
          ...nonSpmbPendingFilter,
        },
        select: {
          id: true,
          total: true,
          status: true,
          orderType: true,
          paymentMethod: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Expenses in range
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: expenseDateFilter,
      }),

      // Total registered customers
      prisma.user.count({
        where: { role: 'CUSTOMER' },
      }),

      // Products summary
      prisma.product.count(),
      prisma.product.count({ where: { badge: 'sold-out' } }),

      // Active Cashier Shifts (Live)
      prisma.cashierShift.findMany({
        where: { closedAt: null },
        include: {
          cashier: {
            select: { name: true, image: true },
          },
        },
        orderBy: { openedAt: 'desc' },
      }),

      // Online Drivers (Live)
      prisma.driverProfile.findMany({
        where: { isOnline: true },
        include: {
          user: {
            select: { name: true, phone: true },
          },
        },
      }),

      // Dining Tables (Live)
      prisma.diningTable.findMany({
        select: { id: true, number: true, status: true, capacity: true, occupiedSeats: true },
      }),

      // Critical Stock Ingredients (Stock <= 5)
      prisma.ingredient.findMany({
        where: { stock: { lte: 5 } },
        select: { id: true, name: true, stock: true, unit: true },
        orderBy: { stock: 'asc' },
        take: 5,
      }),

      // Sold out products
      prisma.product.findMany({
        where: { badge: 'sold-out' },
        select: { id: true, name: true, price: true, image: true },
        take: 5,
      }),

      // Open Support Tickets
      prisma.supportTicket.count({
        where: { status: 'OPEN' },
      }),

      // Pending Wallet Topups
      prisma.walletTransaction.count({
        where: {
          status: { in: ['PENDING', 'VERIFYING'] },
          type: 'TOP_UP',
        },
      }),

      // Order items for best-seller calculation
      prisma.orderItem.findMany({
        where: {
          order: {
            ...orderDateFilter,
            ...nonSpmbPendingFilter,
            status: { in: ['COMPLETED', 'DELIVERED'] },
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
              category: { select: { name: true } },
            },
          },
        },
      }),

      // Recent 8 orders with details
      prisma.order.findMany({
        take: 8,
        where: nonSpmbPendingFilter,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          total: true,
          status: true,
          orderType: true,
          paymentMethod: true,
          createdAt: true,
          queueNumber: true,
          items: {
            select: {
              id: true,
              qty: true,
              product: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    // Financial & Volume Calculations
    const completedOrders = orders.filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status));
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const completedCount = completedOrders.length;
    const avgOrderValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;
    const totalExpenses = expensesAggregate._sum.amount || 0;
    const netProfit = totalRevenue - totalExpenses;
    const activeProducts = totalProducts - soldOutProductsCount;

    // Operational Pipeline Distribution
    const pipeline = {
      PENDING: 0,
      PREPARING: 0,
      READY: 0,
      ON_DELIVERY: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    orders.forEach((o) => {
      const st = o.status.toUpperCase();
      if (['PENDING', 'ASSIGNED', 'TO_STORE'].includes(st)) pipeline.PENDING++;
      else if (st.includes('PREPARING')) pipeline.PREPARING++;
      else if (['READY', 'PICKED_UP'].includes(st)) pipeline.READY++;
      else if (st === 'ON_DELIVERY') pipeline.ON_DELIVERY++;
      else if (['COMPLETED', 'DELIVERED'].includes(st)) pipeline.COMPLETED++;
      else if (st.includes('CANCEL')) pipeline.CANCELLED++;
      else pipeline.PENDING++;
    });

    // Best Selling Products
    const productMap = new Map<string, { id: string; name: string; image: string | null; qty: number; revenue: number; categoryName: string }>();
    orderItems.forEach((item) => {
      if (item.product) {
        const prodId = item.product.id;
        const current = productMap.get(prodId) || {
          id: prodId,
          name: item.product.name,
          image: item.product.image,
          qty: 0,
          revenue: 0,
          categoryName: item.product.category?.name || 'Menu',
        };
        productMap.set(prodId, {
          ...current,
          qty: current.qty + item.qty,
          revenue: current.revenue + item.price * item.qty,
        });
      }
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Payment Methods Breakdown
    const paymentMap = new Map<string, number>();
    completedOrders.forEach((o) => {
      const pm = o.paymentMethod || 'OTHER';
      paymentMap.set(pm, (paymentMap.get(pm) || 0) + 1);
    });
    const paymentMethods = Array.from(paymentMap.entries()).map(([method, count]) => ({
      method,
      count,
      percentage: completedCount > 0 ? Math.round((count / completedCount) * 100) : 0,
    }));

    // Order Types Breakdown
    const typeMap = new Map<string, number>();
    orders.forEach((o) => {
      const ot = o.orderType || 'PICKUP';
      typeMap.set(ot, (typeMap.get(ot) || 0) + 1);
    });
    const orderTypes = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
    }));

    // Timeline Calculations for Interactive Chart
    let timeline: Array<{ label: string; revenue: number; orders: number }> = [];

    if (range === 'today') {
      const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      const hourMap = new Map<string, { revenue: number; orders: number }>();
      hours.forEach((h) => hourMap.set(h, { revenue: 0, orders: 0 }));

      completedOrders.forEach((o) => {
        const orderHour = new Date(o.createdAt).getHours();
        let slot = '22:00';
        if (orderHour < 10) slot = '08:00';
        else if (orderHour < 12) slot = '10:00';
        else if (orderHour < 14) slot = '12:00';
        else if (orderHour < 16) slot = '14:00';
        else if (orderHour < 18) slot = '16:00';
        else if (orderHour < 20) slot = '18:00';
        else if (orderHour < 22) slot = '20:00';

        const curr = hourMap.get(slot) || { revenue: 0, orders: 0 };
        hourMap.set(slot, { revenue: curr.revenue + o.total, orders: curr.orders + 1 });
      });

      timeline = hours.map((h) => ({
        label: h,
        revenue: hourMap.get(h)?.revenue || 0,
        orders: hourMap.get(h)?.orders || 0,
      }));
    } else if (range === 'week') {
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const dayMap = new Map<string, { revenue: number; orders: number }>();
      const last7Days: string[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayLabel = `${days[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`;
        last7Days.push(dayLabel);
        dayMap.set(dayLabel, { revenue: 0, orders: 0 });
      }

      completedOrders.forEach((o) => {
        const d = new Date(o.createdAt);
        const dayLabel = `${days[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`;
        if (dayMap.has(dayLabel)) {
          const curr = dayMap.get(dayLabel)!;
          dayMap.set(dayLabel, { revenue: curr.revenue + o.total, orders: curr.orders + 1 });
        }
      });

      timeline = last7Days.map((lbl) => ({
        label: lbl,
        revenue: dayMap.get(lbl)?.revenue || 0,
        orders: dayMap.get(lbl)?.orders || 0,
      }));
    } else if (range === 'month') {
      const weekBuckets = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
      const weekMap = new Map<string, { revenue: number; orders: number }>();
      weekBuckets.forEach((w) => weekMap.set(w, { revenue: 0, orders: 0 }));

      completedOrders.forEach((o) => {
        const dateNum = new Date(o.createdAt).getDate();
        let bucket = 'Minggu 4';
        if (dateNum <= 7) bucket = 'Minggu 1';
        else if (dateNum <= 14) bucket = 'Minggu 2';
        else if (dateNum <= 21) bucket = 'Minggu 3';

        const curr = weekMap.get(bucket)!;
        weekMap.set(bucket, { revenue: curr.revenue + o.total, orders: curr.orders + 1 });
      });

      timeline = weekBuckets.map((w) => ({
        label: w,
        revenue: weekMap.get(w)?.revenue || 0,
        orders: weekMap.get(w)?.orders || 0,
      }));
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthBuckets: string[] = [];
      const monthMap = new Map<string, { revenue: number; orders: number }>();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        monthBuckets.push(label);
        monthMap.set(label, { revenue: 0, orders: 0 });
      }

      completedOrders.forEach((o) => {
        const d = new Date(o.createdAt);
        const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        if (monthMap.has(label)) {
          const curr = monthMap.get(label)!;
          monthMap.set(label, { revenue: curr.revenue + o.total, orders: curr.orders + 1 });
        }
      });

      timeline = monthBuckets.map((lbl) => ({
        label: lbl,
        revenue: monthMap.get(lbl)?.revenue || 0,
        orders: monthMap.get(lbl)?.orders || 0,
      }));
    }

    // Tables Occupancy
    const occupiedTables = diningTables.filter((t) => t.status === 'OCCUPIED').length;

    return NextResponse.json(
      {
        kpis: {
          totalRevenue,
          totalExpenses,
          netProfit,
          avgOrderValue,
          totalOrders,
          completedCount,
          totalCustomers,
          activeProducts,
          soldOutProducts: soldOutProductsCount,
        },
        pipeline,
        liveOperations: {
          activeCashiers: activeCashierShifts.map((s) => ({
            id: s.id,
            cashierName: s.cashier.name || 'Kasir',
            openingCash: s.openingCash,
            totalOrders: s.totalOrders,
            totalRevenue: s.totalRevenue,
            openedAt: s.openedAt.toISOString(),
          })),
          onlineDrivers: onlineDrivers.map((d) => ({
            id: d.id,
            name: d.user.name || 'Kurir',
            phone: d.user.phone || '-',
            vehicleType: d.vehicleType,
            plateNumber: d.plateNumber,
          })),
          tables: {
            total: diningTables.length,
            occupied: occupiedTables,
            available: diningTables.length - occupiedTables,
          },
        },
        alerts: {
          criticalIngredients,
          soldOutProducts: soldOutProductsList,
          openTicketsCount,
          pendingTopupsCount,
        },
        topProducts,
        paymentMethods,
        orderTypes,
        timeline,
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          total: o.total,
          status: o.status,
          orderType: o.orderType,
          paymentMethod: o.paymentMethod,
          queueNumber: o.queueNumber,
          itemCount: o.items.reduce((s, i) => s + i.qty, 0),
          itemSummary: o.items.map((i) => `${i.qty}x ${i.product.name}`).join(', '),
          createdAt: o.createdAt.toISOString(),
        })),
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
