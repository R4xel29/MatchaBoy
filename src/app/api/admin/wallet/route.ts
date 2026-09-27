import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { incrementQuestProgress } from '@/lib/loyalty-utils';
import {
  QRIS_EXPIRE_MINUTES,
  QRIS_EXPIRE_MS,
  getQrisExpiresAt,
  isQrisTransactionExpired,
  parsePromoPackages,
} from '@/lib/wallet-utils';

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const qrisCutoff = new Date(Date.now() - QRIS_EXPIRE_MS);

    // Auto-expire stale QRIS PENDING transactions (> 15 minutes) before fetching pending list
    await prisma.walletTransaction.updateMany({
      where: {
        type: 'TOP_UP',
        paymentMethod: 'QRIS',
        status: 'PENDING',
        createdAt: { lt: qrisCutoff },
      },
      data: { status: 'REJECTED' },
    });

    // Execute all admin wallet queries in parallel so API responds rapidly
    const [users, rawPendingTransactions, totalBalance, totalTopUps, totalPayments, settings, banks] =
      await Promise.all([
        prisma.user.findMany({
          where: {
            OR: [
              { walletBalance: { gt: 0 } },
              { walletTransactions: { some: {} } },
              { role: 'CUSTOMER' },
            ],
          },
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
        }),
        prisma.walletTransaction.findMany({
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
        }),
        prisma.user.aggregate({
          _sum: { walletBalance: true },
        }),
        prisma.walletTransaction.aggregate({
          where: { amount: { gt: 0 }, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.walletTransaction.aggregate({
          where: { amount: { lt: 0 }, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.paymentSettings.findFirst(),
        prisma.bankAccount.findMany({
          where: { isActive: true },
          orderBy: { order: 'asc' },
        }),
      ]);

    const pendingTransactions = rawPendingTransactions.map((tx) => ({
      ...tx,
      expiresAt:
        String(tx.paymentMethod || '').toUpperCase() === 'QRIS'
          ? getQrisExpiresAt(tx.createdAt)
          : null,
    }));

    const parsedPromoPackages = parsePromoPackages(settings?.walletFirstTimePromoPackages);

    return NextResponse.json({
      users,
      pendingTransactions,
      banks,
      walletSettings: {
        topUpEnabled: settings?.walletTopUpEnabled ?? true,
        minTopUp: settings?.walletMinTopUp ?? 10000,
        bonusMinAmount: settings?.walletBonusMinAmount ?? 100000,
        bonusPercent: settings?.walletBonusPercent ?? 10,
        bonusMode: settings?.walletBonusMode ?? 'BOTH',
        firstTimePromoEnabled: settings?.walletFirstTimePromoEnabled ?? true,
        firstTimePromoPackages: parsedPromoPackages,
        transferEnabled: (settings?.transferEnabled ?? true) && banks.length > 0,
        qrisExpireMinutes: QRIS_EXPIRE_MINUTES,
      },
      stats: {
        totalBalance: totalBalance._sum.walletBalance ?? 0,
        totalTopUps: totalTopUps._sum.amount ?? 0,
        totalTopUpCount: totalTopUps._count,
        totalPayments: Math.abs(totalPayments._sum.amount ?? 0),
        totalPaymentCount: totalPayments._count,
        totalUsers: users.filter((u) => u.walletBalance > 0).length,
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newBalance = user.walletBalance + adjustAmount;
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Saldo tidak mencukupi untuk pengurangan ini' }, { status: 400 });
    }

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
          paymentMethod: 'ADMIN',
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
      // Enforce 15-minute expiration check for PENDING QRIS transactions
      if (isQrisTransactionExpired(tx)) {
        await prisma.walletTransaction.update({
          where: { id: transactionId },
          data: { status: 'REJECTED' },
        });
        return NextResponse.json(
          {
            error:
              'Transaksi QRIS sudah melewati batas waktu 15 menit dan otomatis dibatalkan.',
          },
          { status: 400 }
        );
      }

      const amount = tx.amount;
      const settings = await prisma.paymentSettings.findFirst();
      const bonusMinAmount = settings?.walletBonusMinAmount ?? 100000;
      const bonusPercent = settings?.walletBonusPercent ?? 10;
      const bonusMode = settings?.walletBonusMode ?? 'BOTH';

      const isPromoActiveMode = bonusMode === 'FIRST_TIME' || bonusMode === 'BOTH';
      const isRegularActiveMode = bonusMode === 'REGULAR' || bonusMode === 'BOTH';

      const hasStoredBonus =
        tx.promoBonus !== null && tx.promoBonus !== undefined && tx.promoBonus > 0;
      const isPromoApplied = isPromoActiveMode && hasStoredBonus;
      const hasRegularBonus =
        !hasStoredBonus && isRegularActiveMode && bonusPercent > 0 && amount >= bonusMinAmount;
      const bonusAmount = hasStoredBonus
        ? tx.promoBonus!
        : hasRegularBonus
        ? Math.floor(amount * (bonusPercent / 100))
        : 0;
      const totalTopUp = amount + bonusAmount;

      const [updatedUser, updatedTx] = await prisma.$transaction(async (prismaTx) => {
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

        const completedTx = await prismaTx.walletTransaction.update({
          where: { id: transactionId },
          data: {
            status: 'COMPLETED',
            promoBonus: bonusAmount > 0 ? bonusAmount : tx.promoBonus,
          },
        });

        if (bonusAmount > 0) {
          await prismaTx.walletTransaction.create({
            data: {
              userId: tx.userId,
              amount: bonusAmount,
              type: 'TOP_UP_BONUS',
              description: isPromoApplied
                ? `Bonus Top-Up Pertama Arus Pay +Rp${bonusAmount.toLocaleString('id-ID')}`
                : `Bonus Top-Up Arus Pay (${bonusPercent}%) +Rp${bonusAmount.toLocaleString('id-ID')}`,
              status: 'COMPLETED',
              paymentMethod: tx.paymentMethod,
              referenceId: tx.referenceId,
            },
          });
        }

        await incrementQuestProgress(tx.userId, 'TOP_UP_COUNT', 1, prismaTx);

        return [user, completedTx];
      });

      // Fire-and-forget customer notification
      Promise.resolve().then(async () => {
        try {
          const { sendNotification } = await import('@/lib/notification-service');
          await sendNotification({
            userId: tx.userId,
            type: 'system',
            title: 'Top Up Arus Pay Berhasil!',
            message:
              bonusAmount > 0
                ? `Top up Rp${amount.toLocaleString('id-ID')} + Bonus Rp${bonusAmount.toLocaleString('id-ID')} (Total Rp${totalTopUp.toLocaleString('id-ID')}) telah masuk ke saldo Arus Pay Anda.`
                : `Top up sebesar Rp${amount.toLocaleString('id-ID')} telah masuk ke saldo Arus Pay Anda.`,
            linkUrl: '/profile',
            data: { transactionId: tx.id },
          });
        } catch (err) {
          console.error('[ADMIN_WALLET_APPROVE_NOTIF_ERROR]', err);
        }
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
