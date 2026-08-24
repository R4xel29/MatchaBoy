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
    let prevStart: Date;
    let prevEnd: Date;
    const currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (range === 'today') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (range === 'week') {
      currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      currentStart.setHours(0, 0, 0, 0);
      prevStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = new Date(currentStart.getTime() - 1);
    } else if (range === 'month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else {
      // 'all'
      currentStart = new Date(0);
      prevStart = new Date(0);
      prevEnd = new Date(0);
    }

    const currentFilter = { createdAt: { gte: currentStart, lte: currentEnd } };
    const prevFilter = range !== 'all' ? { createdAt: { gte: prevStart, lte: prevEnd } } : null;

    // Parallel DB queries
    const [
      currentOrders,
      prevOrders,
      totalCustomers,
      orderItems,
      allCompletedOrdersTimeline
    ] = await Promise.all([
      prisma.order.findMany({
        where: currentFilter,
        orderBy: { createdAt: 'asc' },
      }),
      prevFilter
        ? prisma.order.findMany({
            where: prevFilter,
          })
        : Promise.resolve([]),
      prisma.user.count({
        where: { role: 'CUSTOMER' },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            ...currentFilter,
            status: { in: ['COMPLETED', 'DELIVERED'] },
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      }),
      range === 'today'
        ? Promise.resolve([])
        : prisma.order.findMany({
            where: {
              status: { in: ['COMPLETED', 'DELIVERED'] },
              createdAt: {
                gte: range === 'week'
                  ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                  : range === 'month'
                  ? new Date(now.getFullYear(), now.getMonth(), 1)
                  : new Date(now.getFullYear(), now.getMonth() - 5, 1),
              },
            },
            select: { total: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          }),
    ]);

    // 1. Current Period KPIs
    const completedOrders = currentOrders.filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status));
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = currentOrders.length;
    const completedCount = completedOrders.length;
    const avgOrderValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;

    // Prev Period KPIs for real growth
    const prevCompletedOrders = prevOrders.filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status));
    const prevRevenue = prevCompletedOrders.reduce((sum, o) => sum + o.total, 0);
    const prevTotalOrders = prevOrders.length;
    const prevAOV = prevCompletedOrders.length > 0 ? Math.round(prevRevenue / prevCompletedOrders.length) : 0;

    const calcGrowth = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    const revenueGrowth = range === 'all' ? 0 : calcGrowth(totalRevenue, prevRevenue);
    const ordersGrowth = range === 'all' ? 0 : calcGrowth(totalOrders, prevTotalOrders);
    const aovGrowth = range === 'all' ? 0 : calcGrowth(avgOrderValue, prevAOV);

    // 2. Status Distribution
    const statusDistribution: Record<string, number> = {
      PENDING: 0,
      PREPARING: 0,
      READY: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    currentOrders.forEach((o) => {
      const stat = o.status.toUpperCase();
      if (stat.includes('PENDING') || stat === 'ASSIGNED' || stat === 'TO_STORE') statusDistribution.PENDING++;
      else if (stat.includes('PREPARING')) statusDistribution.PREPARING++;
      else if (stat.includes('READY') || stat === 'PICKED_UP' || stat === 'ON_DELIVERY') statusDistribution.READY++;
      else if (stat.includes('COMPLETED') || stat.includes('DELIVERED')) statusDistribution.COMPLETED++;
      else if (stat.includes('CANCEL')) statusDistribution.CANCELLED++;
      else statusDistribution.PENDING++;
    });

    // 3. Category Revenue & Share
    const categoryMap = new Map<string, { value: number; count: number }>();
    const productSalesMap = new Map<string, { id: string; name: string; image: string | null; qty: number; revenue: number; categoryName: string }>();

    orderItems.forEach((item) => {
      const categoryName = item.product?.category?.name || 'Lainnya';
      const itemRevenue = item.price * item.qty;

      // Category aggregate
      const currentCat = categoryMap.get(categoryName) || { value: 0, count: 0 };
      categoryMap.set(categoryName, {
        value: currentCat.value + itemRevenue,
        count: currentCat.count + item.qty,
      });

      // Top Products aggregate
      if (item.product) {
        const prodId = item.product.id;
        const currentProd = productSalesMap.get(prodId) || {
          id: prodId,
          name: item.product.name,
          image: item.product.image,
          qty: 0,
          revenue: 0,
          categoryName,
        };
        productSalesMap.set(prodId, {
          ...currentProd,
          qty: currentProd.qty + item.qty,
          revenue: currentProd.revenue + itemRevenue,
        });
      }
    });

    const categoryRevenue = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.value,
        count: data.count,
        percentage: totalRevenue > 0 ? Math.round((data.value / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // 4. Timeline Graph Breakdown
    let timeline: Array<{ label: string; revenue: number; orders: number }> = [];

    if (range === 'today') {
      // Hourly intervals (08:00 - 22:00)
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
      // Last 7 days
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const dayMap = new Map<string, { revenue: number; orders: number }>();

      const last7Days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayLabel = `${days[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`;
        last7Days.push(dayLabel);
        dayMap.set(dayLabel, { revenue: 0, orders: 0 });
      }

      allCompletedOrdersTimeline.forEach((o) => {
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
      // 4 Weekly Buckets in Month
      const weekBuckets = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
      const weekMap = new Map<string, { revenue: number; orders: number }>();
      weekBuckets.forEach((w) => weekMap.set(w, { revenue: 0, orders: 0 }));

      allCompletedOrdersTimeline.forEach((o) => {
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
      // Last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthBuckets: string[] = [];
      const monthMap = new Map<string, { revenue: number; orders: number }>();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        monthBuckets.push(label);
        monthMap.set(label, { revenue: 0, orders: 0 });
      }

      allCompletedOrdersTimeline.forEach((o) => {
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

    // 5. Payment Methods Distribution
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

    // 6. Order Types Distribution (Dine In vs Pickup vs Delivery)
    const typeMap = new Map<string, number>();
    currentOrders.forEach((o) => {
      const t = o.orderType || 'PICKUP';
      typeMap.set(t, (typeMap.get(t) || 0) + 1);
    });
    const orderTypes = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
    }));

    return NextResponse.json(
      {
        success: true,
        kpis: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          totalCustomers,
          completedCount,
          revenueGrowth,
          ordersGrowth,
          aovGrowth,
        },
        statusDistribution,
        categoryRevenue,
        topProducts,
        timeline,
        paymentMethods,
        orderTypes,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Analytics aggregation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
