import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/admin/products/[id]/stats
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        productIngredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    // Current Time & Timezone Boundary (WIB = UTC+7)
    const now = new Date();
    const wibDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const year = wibDate.getUTCFullYear();
    const month = wibDate.getUTCMonth();
    const date = wibDate.getUTCDate();

    // 00:00:00 WIB in UTC
    const startOfTodayUtc = new Date(Date.UTC(year, month, date, -7, 0, 0, 0));
    // 7 days ago start (6 days back + today)
    const startOf7DaysAgoUtc = new Date(startOfTodayUtc.getTime() - 6 * 24 * 60 * 60 * 1000);
    // 14 days ago start (previous 7-day period)
    const startOf14DaysAgoUtc = new Date(startOfTodayUtc.getTime() - 13 * 24 * 60 * 60 * 1000);

    const [orderItems14Days, recentOrderItems, allTimeAgg] = await Promise.all([
      prisma.orderItem.findMany({
        where: {
          productId: id,
          order: {
            status: { notIn: ['CANCELLED'] },
            createdAt: { gte: startOf14DaysAgoUtc },
          },
        },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.orderItem.findMany({
        where: {
          productId: id,
          order: {
            status: { notIn: ['CANCELLED'] },
          },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              queueNumber: true,
              customerName: true,
              source: true,
              orderType: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.orderItem.aggregate({
        where: {
          productId: id,
          order: {
            status: { notIn: ['CANCELLED'] },
          },
        },
        _sum: {
          qty: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // 1. Today's stats
    const todayItems = orderItems14Days.filter((i) => i.order.createdAt >= startOfTodayUtc);
    const todayQty = todayItems.reduce((acc, i) => acc + i.qty, 0);
    const todayRevenue = todayItems.reduce((acc, i) => acc + i.qty * i.price, 0);
    const todayOrderCount = new Set(todayItems.map((i) => i.order.id)).size;

    // 2. 7-Day breakdown
    const indonesianDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const dailyBreakdown = [];
    for (let d = 0; d < 7; d++) {
      const dayStart = new Date(startOf7DaysAgoUtc.getTime() + d * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayWib = new Date(dayStart.getTime() + 7 * 60 * 60 * 1000);
      const dayLabel = indonesianDays[dayWib.getUTCDay()];
      const dateStr = `${dayWib.getUTCDate()}/${dayWib.getUTCMonth() + 1}`;

      const dayItems = orderItems14Days.filter(
        (i) => i.order.createdAt >= dayStart && i.order.createdAt < dayEnd
      );
      const qty = dayItems.reduce((acc, i) => acc + i.qty, 0);
      const revenue = dayItems.reduce((acc, i) => acc + i.qty * i.price, 0);

      dailyBreakdown.push({
        date: dateStr,
        dayLabel,
        qty,
        revenue,
        isToday: d === 6,
      });
    }

    // 3. 7-Day totals & growth vs previous 7 days
    const current7DaysItems = orderItems14Days.filter((i) => i.order.createdAt >= startOf7DaysAgoUtc);
    const total7DayQty = current7DaysItems.reduce((acc, i) => acc + i.qty, 0);
    const total7DayRevenue = current7DaysItems.reduce((acc, i) => acc + i.qty * i.price, 0);

    const prev7DaysItems = orderItems14Days.filter(
      (i) => i.order.createdAt >= startOf14DaysAgoUtc && i.order.createdAt < startOf7DaysAgoUtc
    );
    const prev7DayQty = prev7DaysItems.reduce((acc, i) => acc + i.qty, 0);

    let growthPercent: number | null = null;
    if (prev7DayQty > 0) {
      growthPercent = Math.round(((total7DayQty - prev7DayQty) / prev7DayQty) * 1000) / 10;
    } else if (total7DayQty > 0) {
      growthPercent = 100;
    } else {
      growthPercent = 0;
    }

    // 4. Inventory capacity & bottleneck
    const recipes = product.productIngredients || [];
    let maxPortions: number | null = null;
    let bottleneck: {
      name: string;
      stock: number;
      unit: string;
      needed: number;
      possiblePortions: number;
    } | null = null;

    const ingredientsStatus = recipes.map((r) => {
      const ing = r.ingredient;
      const stock = ing.stock ?? 0;
      const needed = r.quantity;
      const possiblePortions = needed > 0 ? Math.floor(stock / needed) : 999999;

      return {
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        stock,
        needed,
        costPerUnit: ing.costPerUnit,
        isPackaging: ing.isPackaging,
        possiblePortions,
        isLow: possiblePortions < 10,
        isEmpty: stock <= 0 || possiblePortions <= 0,
      };
    });

    if (recipes.length > 0) {
      const sorted = [...ingredientsStatus].sort((a, b) => a.possiblePortions - b.possiblePortions);
      const lowest = sorted[0];
      maxPortions = Math.max(0, lowest.possiblePortions);
      bottleneck = {
        name: lowest.name,
        stock: lowest.stock,
        unit: lowest.unit,
        needed: lowest.needed,
        possiblePortions: maxPortions,
      };
    }

    // 5. Recent orders list
    const recentOrders = recentOrderItems.map((item) => ({
      orderId: item.order.id,
      queueNumber: item.order.queueNumber,
      customerName: item.order.customerName,
      qty: item.qty,
      price: item.price,
      source: item.order.source,
      orderType: item.order.orderType,
      status: item.order.status,
      createdAt: item.order.createdAt.toISOString(),
    }));

    return NextResponse.json({
      productId: id,
      today: {
        qty: todayQty,
        revenue: todayRevenue,
        orderCount: todayOrderCount,
      },
      last7Days: {
        days: dailyBreakdown,
        totalQty: total7DayQty,
        totalRevenue: total7DayRevenue,
        growthPercent,
        prev7DayQty,
      },
      allTime: {
        totalQty: allTimeAgg._sum.qty || 0,
        orderCount: allTimeAgg._count.id || 0,
      },
      inventory: {
        hasRecipe: recipes.length > 0,
        maxPortions,
        bottleneck,
        ingredients: ingredientsStatus,
      },
      recentOrders,
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching product realtime stats:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
