import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { incrementQuestProgress } from '@/lib/loyalty-utils';

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
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

    // Get pending top-up requests
    const pendingTransactions = await prisma.walletTransaction.findMany({
      where: {
        status: { in: ['PENDING', 'VERIFYING'] },
        type: 'TOP_UP',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Total wallet balance across all users
    const totalBalance = await prisma.user.aggregate({
      _sum: { walletBalance: true },
    });

    // Transaction stats (completed topups)
    const totalTopUps = await prisma.walletTransaction.aggregate({
      where: { amount: { gt: 0 }, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });

    const totalPayments = await prisma.walletTransaction.aggregate({
      where: { amount: { lt: 0 }, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      users,
      pendingTransactions,
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
          status: 'COMPLETED',
          paymentMethod: 'DIRECT',
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

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId, action } = await req.json();

    if (!transactionId || !action) {
      return NextResponse.json({ error: 'transactionId and action are required' }, { status: 400 });
    }

    const tx = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    if (tx.status !== 'PENDING' && tx.status !== 'VERIFYING') {
      return NextResponse.json({ error: 'Transaksi sudah tidak berstatus pending' }, { status: 400 });
    }

    if (action === 'reject') {
      const updatedTx = await prisma.walletTransaction.update({
        where: { id: transactionId },
        data: { status: 'REJECTED' },
      });
      return NextResponse.json({ success: true, transaction: updatedTx });
    }

    if (action === 'approve') {
      const amount = tx.amount;
      
      const settings = await prisma.paymentSettings.findFirst();
      const bonusMinAmount = settings?.walletBonusMinAmount ?? 100000;
      const bonusPercent = settings?.walletBonusPercent ?? 10;

      const isPromoApplied = tx.promoBonus !== null && tx.promoBonus > 0;
      const hasBonus = isPromoApplied || amount >= bonusMinAmount;
      const bonusAmount = isPromoApplied ? tx.promoBonus! : (hasBonus ? Math.floor(amount * (bonusPercent / 100)) : 0);
      const totalTopUp = amount + bonusAmount;

      const [updatedUser, updatedTx] = await prisma.$transaction(async (prismaTx) => {
        // Increment user's wallet balance
        const user = await prismaTx.user.update({
          where: { id: tx.userId },
          data: { walletBalance: { increment: totalTopUp } },
          select: {
            id: true,
            name: true,
            walletBalance: true,
            walletTransactions: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        });

        // Mark transaction as COMPLETED
        const completedTx = await prismaTx.walletTransaction.update({
          where: { id: transactionId },
          data: { status: 'COMPLETED' },
        });

        // If there's a bonus, create a COMPLETED TOP_UP_BONUS transaction
        if (bonusAmount > 0) {
          await prismaTx.walletTransaction.create({
            data: {
              userId: tx.userId,
              amount: bonusAmount,
              type: 'TOP_UP_BONUS',
              description: isPromoApplied
                ? `Bonus Top-up Pertama sebesar Rp${bonusAmount.toLocaleString('id-ID')}`
                : `Bonus Top-up ${bonusPercent}% sebesar Rp${bonusAmount.toLocaleString('id-ID')}`,
              status: 'COMPLETED',
              paymentMethod: tx.paymentMethod,
              referenceId: tx.referenceId
            },
          });
        }

        // C1 Gamification Quests: Atomically increment top-up count quest progress
        await incrementQuestProgress(tx.userId, 'TOP_UP_COUNT', 1, prismaTx);

        return [user, completedTx];
      });

      return NextResponse.json({ success: true, user: updatedUser, transaction: updatedTx });
    }

    return NextResponse.json({ error: 'Action not supported' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[ADMIN_WALLET_POST_ERROR]', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
