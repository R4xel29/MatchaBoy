import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users with wallet balance > 0, include latest transactions
    const users = await prisma.user.findMany({
      where: { walletBalance: { gt: 0 } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        walletBalance: true,
        walletTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
      orderBy: { walletBalance: 'desc' },
    });

    // Total wallet balance across all users
    const totalBalance = await prisma.user.aggregate({
      _sum: { walletBalance: true },
    });

    // Transaction stats
    const totalTopUps = await prisma.walletTransaction.aggregate({
      where: { amount: { gt: 0 } },
      _sum: { amount: true },
      _count: true,
    });

    const totalPayments = await prisma.walletTransaction.aggregate({
      where: { amount: { lt: 0 } },
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      users,
      stats: {
        totalBalance: totalBalance._sum.walletBalance ?? 0,
        totalTopUps: totalTopUps._sum.amount ?? 0,
        totalTopUpCount: totalTopUps._count,
        totalPayments: Math.abs(totalPayments._sum.amount ?? 0),
        totalPaymentCount: totalPayments._count,
        totalUsers: users.length,
      },
    });
  } catch (error: unknown) {
    console.error('[ADMIN_WALLET_GET_ERROR]', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, amount, reason } = await req.json();

    if (!userId || !amount || !reason) {
      return NextResponse.json({ error: 'userId, amount, and reason are required' }, { status: 400 });
    }

    const adjustAmount = Number(amount);
    if (isNaN(adjustAmount) || adjustAmount === 0) {
      return NextResponse.json({ error: 'Amount must be a non-zero number' }, { status: 400 });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newBalance = user.walletBalance + adjustAmount;
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient balance for deduction' }, { status: 400 });
    }

    // Update balance and create transaction in a transaction
    const [updatedUser, transaction] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { walletBalance: newBalance },
        select: {
          id: true,
          name: true,
          walletBalance: true,
          walletTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          userId,
          amount: adjustAmount,
          type: adjustAmount > 0 ? 'ADMIN_TOPUP' : 'ADMIN_DEDUCT',
          description: `[Admin] ${reason}`,
        },
      }),
    ]);

    return NextResponse.json({ user: updatedUser, transaction });
  } catch (error: unknown) {
    console.error('[ADMIN_WALLET_PATCH_ERROR]', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
