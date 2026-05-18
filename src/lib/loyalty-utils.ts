import { prisma } from './prisma';

// =============================================================================
// LOYALTY UTILITIES
// Fungsi terpusat untuk menangani logika poin, milestone, dan referral.
// Digunakan oleh API kasir (offline) maupun order online.
// =============================================================================

/**
 * Ambil settings loyalty dari database (singleton).
 * Jika belum ada, buat default.
 */
export async function getLoyaltySettings() {
  let settings = await prisma.loyaltySettings.findFirst();
  if (!settings) {
    settings = await prisma.loyaltySettings.create({
      data: { id: 'default-loyalty-settings' },
    });
  }
  return settings;
}

/**
 * Hitung total cup dari order items.
 * Setiap qty dihitung sebagai 1 cup per unit.
 */
export function calculateCupsFromItems(items: { qty: number }[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

/**
 * Fungsi utama: Tambah poin ke user dan cek milestone.
 * Mengembalikan daftar voucher yang baru di-generate.
 */
export async function awardPoints({
  userId,
  pointsToAdd,
  type,
  description,
  orderId,
}: {
  userId: string;
  pointsToAdd: number;
  type: string; // EARN_ORDER, EARN_CASHIER, EARN_TUMBLER, EARN_REFERRAL, ADMIN_ADJUST
  description: string;
  orderId?: string;
}) {
  const settings = await getLoyaltySettings();

  // 1. Tambah poin ke user
  const user = await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: pointsToAdd } },
  });

  // 2. Catat ke history
  await prisma.pointHistory.create({
    data: {
      userId,
      amount: pointsToAdd,
      type,
      description,
      orderId,
    },
  });

  // 3. Cek milestone & generate voucher
  const newVouchers = await checkAndAwardMilestones(userId, user.points, settings);

  return { newPoints: user.points, newVouchers };
}

/**
 * Cek apakah user telah melewati milestone dan berikan voucher.
 * Logika: Setelah milestone 3 tercapai, poin dikurangi (reset).
 */
async function checkAndAwardMilestones(
  userId: string,
  currentPoints: number,
  settings: Awaited<ReturnType<typeof getLoyaltySettings>>
) {
  const vouchersCreated: { type: string; description: string }[] = [];
  let pointsToDeduct = 0;

  // Milestone 3 (target utama, misal 15 poin) — cek dulu karena mungkin langsung lewat
  if (settings.milestone3Enabled && currentPoints >= settings.milestone3Points) {
    // Berikan voucher milestone 3
    await prisma.voucher.create({
      data: {
        userId,
        type: settings.milestone3Reward,
        description: settings.milestone3Desc,
      },
    });
    vouchersCreated.push({ type: settings.milestone3Reward, description: settings.milestone3Desc });

    // Reset poin jika diaktifkan
    if (settings.milestone3ResetPoints) {
      pointsToDeduct = settings.milestone3Points;
    }
  } else {
    // Cek milestone 2 (kelipatan, misal 10)
    if (settings.milestone2Enabled && currentPoints >= settings.milestone2Points) {
      // Cek apakah sudah pernah dapat voucher milestone2 di siklus ini
      // Siklus = dari 0 sampai milestone3Points
      const cycleStart = Math.floor((currentPoints - 1) / settings.milestone3Points) * settings.milestone3Points;
      const milestone2Target = cycleStart + settings.milestone2Points;

      // Cek apakah sudah dapat voucher di titik ini
      const existing = await prisma.voucher.findFirst({
        where: {
          userId,
          type: settings.milestone2Reward,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Dalam 24 jam terakhir, simple check
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!existing && currentPoints >= milestone2Target && currentPoints < settings.milestone3Points) {
        await prisma.voucher.create({
          data: {
            userId,
            type: settings.milestone2Reward,
            description: settings.milestone2Desc,
          },
        });
        vouchersCreated.push({ type: settings.milestone2Reward, description: settings.milestone2Desc });
      }
    }

    // Cek milestone 1 (kelipatan, misal 5)
    if (settings.milestone1Enabled && currentPoints >= settings.milestone1Points) {
      const cycleStart = Math.floor((currentPoints - 1) / settings.milestone3Points) * settings.milestone3Points;
      const milestone1Target = cycleStart + settings.milestone1Points;

      const existing = await prisma.voucher.findFirst({
        where: {
          userId,
          type: settings.milestone1Reward,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (
        !existing &&
        currentPoints >= milestone1Target &&
        currentPoints < settings.milestone2Points &&
        currentPoints < settings.milestone3Points
      ) {
        await prisma.voucher.create({
          data: {
            userId,
            type: settings.milestone1Reward,
            description: settings.milestone1Desc,
          },
        });
        vouchersCreated.push({ type: settings.milestone1Reward, description: settings.milestone1Desc });
      }
    }
  }

  // Deduct poin jika milestone 3 tercapai
  if (pointsToDeduct > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { points: { decrement: pointsToDeduct } },
    });

    await prisma.pointHistory.create({
      data: {
        userId,
        amount: -pointsToDeduct,
        type: 'REDEEM_MILESTONE',
        description: `Poin direset setelah mencapai ${settings.milestone3Points} poin (Reward: ${settings.milestone3Desc})`,
      },
    });
  }

  return vouchersCreated;
}

/**
 * Proses bonus tumbler: tambah poin extra jika pelanggan bawa tumbler.
 */
export async function awardTumblerBonus(userId: string, orderId?: string) {
  const settings = await getLoyaltySettings();
  if (!settings.tumblerBonusEnabled || settings.tumblerBonusPoints <= 0) {
    return null;
  }

  // 1. Tambah poin
  const pointsRes = await awardPoints({
    userId,
    pointsToAdd: settings.tumblerBonusPoints,
    type: 'EARN_TUMBLER',
    description: `Bonus tumbler/wadah sendiri (+${settings.tumblerBonusPoints} poin)`,
    orderId,
  });

  // 2. Berikan voucher jika diaktifkan oleh admin
  let voucherRes = null;
  if ((settings as any).tumblerVoucherEnabled) {
    const voucherType = (settings as any).tumblerVoucherType || 'UPGRADE_SIZE';
    const voucherDesc = (settings as any).tumblerVoucherDesc || 'Eco-Reward: Free Upgrade Size (Bawa Tumbler)';

    let discountAmount = 5000;
    if (voucherType === 'FREE_DRINK') discountAmount = 25000;
    else if (voucherType === 'FREE_TOPPING') discountAmount = 3000;
    else if (voucherType === 'UPGRADE_SIZE') discountAmount = 5000;
    else discountAmount = 10000;

    const ecoCode = `ECO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    voucherRes = await prisma.voucher.create({
      data: {
        userId,
        code: ecoCode,
        type: voucherType,
        description: voucherDesc,
        discountAmount,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Berlaku 14 hari
      },
    });
  }

  return { pointsRes, voucherRes };
}

/**
 * Proses referral bonus: berikan reward ke referrer saat referee melakukan pembelian pertama.
 */
export async function processReferralBonus(refereeUserId: string) {
  const settings = await getLoyaltySettings();
  if (!settings.referralEnabled) return null;

  // Cek apakah referee punya referrer
  const referee = await prisma.user.findUnique({
    where: { id: refereeUserId },
    select: { id: true, referredById: true, referralBonusPaid: true },
  });

  if (!referee?.referredById || referee.referralBonusPaid) return null;

  // Cek apakah ini pembelian pertama referee
  const orderCount = await prisma.order.count({
    where: { userId: refereeUserId, status: 'COMPLETED' },
  });

  if (orderCount > 1) return null; // Bukan pembelian pertama (sudah > 1 termasuk yang baru)

  // Tandai bonus sudah diberikan
  await prisma.user.update({
    where: { id: refereeUserId },
    data: { referralBonusPaid: true },
  });

  const referrerId = referee.referredById;

  if (settings.referralRewardType === 'POINTS') {
    // Berikan poin ke referrer
    return awardPoints({
      userId: referrerId,
      pointsToAdd: settings.referralRewardPoints,
      type: 'EARN_REFERRAL',
      description: `Bonus referral: teman yang diajak telah melakukan pembelian pertama`,
    });
  } else {
    // Berikan voucher ke referrer
    await prisma.voucher.create({
      data: {
        userId: referrerId,
        type: settings.referralRewardVoucher,
        description: settings.referralRewardDesc,
        fromReferralUserId: refereeUserId,
      },
    });
    return { type: 'voucher', reward: settings.referralRewardDesc };
  }
}

/**
 * Proses lengkap saat order selesai (COMPLETED):
 * 1. Hitung poin dari jumlah cup
 * 2. Bonus tumbler jika ada
 * 3. Cek referral bonus
 */
export async function processOrderCompletion(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || !order.userId || order.pointsAwarded) return null;

  const settings = await getLoyaltySettings();
  const cups = calculateCupsFromItems(order.items);

  // Calculate points based on configured mode
  let pointsToAdd = cups; // default: 1 point per cup
  
  if ((settings as any).pointMode === 'PER_TRANSACTION') {
    pointsToAdd = (settings as any).pointPerTransaction || 1;
  } else if ((settings as any).pointMode === 'PER_AMOUNT') {
    const perAmount = (settings as any).pointPerAmount || 10000;
    pointsToAdd = Math.floor(order.total / perAmount);
  }
  // If pointMode is not set, fall back to cups

  if (pointsToAdd <= 0) pointsToAdd = 1; // minimum 1 poin

  // 1. Award poin
  const result = await awardPoints({
    userId: order.userId,
    pointsToAdd,
    type: 'EARN_ORDER',
    description: `Pesanan selesai: ${pointsToAdd} poin${cups > 1 ? ` (${cups} cup)` : ''}`,
    orderId,
  });

  // 2. Bonus tumbler
  let tumblerResult = null;
  if (order.hasTumbler) {
    tumblerResult = await awardTumblerBonus(order.userId, orderId);
  }

  // 3. Cek referral
  const referralResult = await processReferralBonus(order.userId);

  // 4. Tandai order sudah diberi poin
  const tumblerBonus = order.hasTumbler ? settings.tumblerBonusPoints : 0;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      pointsAwarded: true,
      pointsEarned: pointsToAdd + tumblerBonus,
    },
  });

  return { cups, pointsToAdd, result, tumblerResult, referralResult };
}

