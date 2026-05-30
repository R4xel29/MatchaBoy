import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'all'; // 'week', 'month', 'all'
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 100);

    // Build date filter
    let dateFilter: { gte?: Date } = {};
    const now = new Date();
    if (range === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { gte: weekAgo };
    } else if (range === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { gte: monthAgo };
    }

    const orderDateWhere = dateFilter.gte ? { createdAt: { gte: dateFilter.gte } } : {};
    const completedOrderWhere = { ...orderDateWhere, status: { in: ['COMPLETED', 'DELIVERED'] } };

    // Top Spenders — aggregate total spending per user
    const topSpendersRaw = await prisma.order.groupBy({
      by: ['userId'],
      where: { ...completedOrderWhere, userId: { not: null } },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const spenderUserIds = topSpendersRaw.map((s) => s.userId).filter(Boolean) as string[];
    const spenderUsers = await prisma.user.findMany({
      where: { id: { in: spenderUserIds } },
      select: { id: true, name: true, phone: true, image: true },
    });
    const spenderMap = new Map(spenderUsers.map((u) => [u.id, u]));

    const topSpenders = topSpendersRaw.map((s, i) => {
      const user = spenderMap.get(s.userId!);
      return {
        rank: i + 1,
        userId: s.userId,
        name: user?.name || 'Unknown',
        phone: user?.phone || '-',
        image: user?.image || null,
        totalSpent: s._sum.total || 0,
        orderCount: s._count.id,
      };
    });

    // Most Orders — by order count
    const mostOrdersRaw = await prisma.order.groupBy({
      by: ['userId'],
      where: { ...completedOrderWhere, userId: { not: null } },
      _count: { id: true },
      _sum: { total: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const orderUserIds = mostOrdersRaw.map((o) => o.userId).filter(Boolean) as string[];
    const orderUsers = await prisma.user.findMany({
      where: { id: { in: orderUserIds } },
      select: { id: true, name: true, phone: true, image: true },
    });
    const orderMap = new Map(orderUsers.map((u) => [u.id, u]));

    const mostOrders = mostOrdersRaw.map((o, i) => {
      const user = orderMap.get(o.userId!);
      return {
        rank: i + 1,
        userId: o.userId,
        name: user?.name || 'Unknown',
        phone: user?.phone || '-',
        image: user?.image || null,
        orderCount: o._count.id,
        totalSpent: o._sum.total || 0,
      };
    });

    // Top Referrers — users with most referrals
    const referrersRaw = await prisma.user.findMany({
      where: { referrals: { some: {} } },
      select: {
        id: true,
        name: true,
        phone: true,
        image: true,
        _count: { select: { referrals: true } },
      },
      orderBy: { referrals: { _count: 'desc' } },
      take: limit,
    });

    const topReferrers = referrersRaw.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      name: u.name || 'Unknown',
      phone: u.phone || '-',
      image: u.image || null,
      referralCount: u._count.referrals,
    }));

    // Eco Champions — most tumbler uses
    const ecoChampions = await prisma.user.findMany({
      where: { tumblerCount: { gt: 0 } },
      select: {
        id: true,
        name: true,
        phone: true,
        image: true,
        tumblerCount: true,
        arusLevel: true,
      },
      orderBy: { tumblerCount: 'desc' },
      take: limit,
    });

    const ecoRanked = ecoChampions.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      name: u.name || 'Unknown',
      phone: u.phone || '-',
      image: u.image || null,
      tumblerCount: u.tumblerCount,
      arusLevel: u.arusLevel,
    }));

    return NextResponse.json({
      topSpenders,
      mostOrders,
      topReferrers,
      ecoChampions: ecoRanked,
      overview: {
        totalSpending: topSpenders.reduce((s, u) => s + u.totalSpent, 0),
        totalOrders: mostOrders.reduce((s, u) => s + u.orderCount, 0),
        totalReferrals: topReferrers.reduce((s, u) => s + u.referralCount, 0),
        totalTumblerUses: ecoRanked.reduce((s, u) => s + u.tumblerCount, 0),
      },
    });
  } catch (error) {
    console.error('Admin leaderboard GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
