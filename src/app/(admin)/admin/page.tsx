import { prisma } from '@/lib/prisma';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_CASH_AVAILABLE = 320000; // Rp 320.000 modal kas tunai awal tersedia

export default async function AdminDashboardPage() {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const orderDateFilter = { createdAt: { gte: currentStart, lte: currentEnd } };
  const expenseDateFilter = { date: { gte: currentStart, lte: currentEnd } };

  const nonSpmbPendingFilter = {
    NOT: {
      source: 'SPMB',
      customerPhone: { startsWith: 'SPMB-PENDING' },
    },
  };

  const [
    orders,
    allCompletedOrders,
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
    recentOrders,
  ] = await Promise.all([
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
    prisma.order.findMany({
      where: {
        ...nonSpmbPendingFilter,
        status: { in: ['COMPLETED', 'DELIVERED'] },
      },
      select: {
        total: true,
        paymentMethod: true,
      },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: expenseDateFilter,
    }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count(),
    prisma.product.count({ where: { badge: 'sold-out' } }),
    prisma.cashierShift.findMany({
      where: { closedAt: null },
      include: {
        cashier: { select: { name: true, image: true } },
      },
      orderBy: { openedAt: 'desc' },
    }),
    prisma.driverProfile.findMany({
      where: { isOnline: true },
      include: {
        user: { select: { name: true, phone: true } },
      },
    }),
    prisma.diningTable.findMany({
      select: { id: true, number: true, status: true, capacity: true, occupiedSeats: true },
    }),
    prisma.ingredient.findMany({
      where: { stock: { lte: 5 } },
      select: { id: true, name: true, stock: true, unit: true },
      orderBy: { stock: 'asc' },
      take: 5,
    }),
    prisma.product.findMany({
      where: { badge: 'sold-out' },
      select: { id: true, name: true, price: true, image: true },
      take: 5,
    }),
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    prisma.walletTransaction.count({
      where: {
        status: { in: ['PENDING', 'VERIFYING'] },
        type: 'TOP_UP',
      },
    }),
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

  const completedOrders = orders.filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status));
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const completedCount = completedOrders.length;
  const avgOrderValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;
  const totalExpenses = expensesAggregate._sum.amount || 0;
  const netProfit = totalRevenue - totalExpenses;
  const activeProducts = totalProducts - soldOutProductsCount;

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

  // Global All-Time Balance Position
  let allTimeCash = 0;
  let allTimeQris = 0;
  let allTimeWallet = 0;
  let allTimeTransfer = 0;
  let allTimeOther = 0;
  let allTimeQrisCount = 0;
  let allTimeCashCount = 0;

  allCompletedOrders.forEach((o) => {
    const pmUpper = (o.paymentMethod || '').trim().toUpperCase();
    if (pmUpper === 'CASH' || pmUpper === 'TUNAI' || pmUpper === 'COD') {
      allTimeCash += o.total;
      allTimeCashCount += 1;
    } else if (pmUpper.includes('QRIS')) {
      allTimeQris += o.total;
      allTimeQrisCount += 1;
    } else if (pmUpper.includes('WALLET') || pmUpper.includes('SALDO')) {
      allTimeWallet += o.total;
    } else if (
      pmUpper.includes('TRANSFER') ||
      pmUpper.includes('MIDTRANS') ||
      pmUpper.includes('DOKU') ||
      pmUpper.includes('BANK')
    ) {
      allTimeTransfer += o.total;
    } else {
      allTimeOther += o.total;
    }
  });

  const totalCashOnHand = BASE_CASH_AVAILABLE + allTimeCash;
  const totalFundsAvailable =
    totalCashOnHand + allTimeQris + allTimeWallet + allTimeTransfer + allTimeOther;

  const balancePosition = {
    baseCashFloat: BASE_CASH_AVAILABLE,
    cashOnHand: totalCashOnHand,
    cashOrdersTotal: allTimeCash,
    cashCount: allTimeCashCount,
    qrisBalance: allTimeQris,
    qrisCount: allTimeQrisCount,
    walletBalance: allTimeWallet,
    transferBalance: allTimeTransfer,
    otherBalance: allTimeOther,
    totalFunds: totalFundsAvailable,
    totalCompletedOrders: allCompletedOrders.length,
  };

  // Filtered payment methods
  const paymentMap = new Map<string, { count: number; amount: number }>();
  completedOrders.forEach((o) => {
    const pmRaw = (o.paymentMethod || 'OTHER').trim();
    const existing = paymentMap.get(pmRaw) || { count: 0, amount: 0 };
    paymentMap.set(pmRaw, {
      count: existing.count + 1,
      amount: existing.amount + o.total,
    });
  });

  const paymentMethods = Array.from(paymentMap.entries()).map(([method, data]) => ({
    method,
    count: data.count,
    amount: data.amount,
    percentage: completedCount > 0 ? Math.round((data.count / completedCount) * 100) : 0,
    amountPercentage: totalRevenue > 0 ? Math.round((data.amount / totalRevenue) * 100) : 0,
  }));

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

  const timeline = hours.map((h) => ({
    label: h,
    revenue: hourMap.get(h)?.revenue || 0,
    orders: hourMap.get(h)?.orders || 0,
  }));

  const occupiedTables = diningTables.filter((t) => t.status === 'OCCUPIED').length;

  const initialData = {
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
    balancePosition,
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
  };

  return <AdminDashboardClient initialData={initialData} />;
}
