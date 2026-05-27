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
  const newVouchers = await checkAndAwardMilestones(userId, user.points - pointsToAdd, pointsToAdd, settings);

  return { newPoints: user.points, newVouchers };
}

/**
 * Helper to create a personal voucher cloned from a template (if exists) or fallback to legacy settings.
 */
async function createVoucherForUser(
  userId: string,
  rewardTypeOrCode: string,
  fallbackDesc: string,
  defaultExpiryDays = 30,
  extraFields: any = {}
) {
  const template = await prisma.voucherTemplate.findFirst({
    where: {
      OR: [
        { id: rewardTypeOrCode },
        { code: rewardTypeOrCode }
      ]
    }
  });

  if (template) {
    const userVoucherCode = `${template.code}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    let expiresAt = template.expiresAt;
    if (!expiresAt) {
      const d = new Date();
      d.setDate(d.getDate() + defaultExpiryDays);
      expiresAt = d;
    }
    let discountAmount = template.discountValue;
    if (template.type === 'FREE_DRINK' && !discountAmount) {
      discountAmount = 25000;
    } else if (template.type === 'FREE_TOPPING' && !discountAmount) {
      discountAmount = 3000;
    } else if (template.type === 'UPGRADE_SIZE' && !discountAmount) {
      discountAmount = 5000;
    }

    return prisma.voucher.create({
      data: {
        userId,
        code: userVoucherCode,
        type: template.type,
        description: template.description,
        discountAmount,
        expiresAt,
        templateId: template.id,
        isUsed: false,
        ...extraFields
      }
    });
  } else {
    let discountAmount = 10000;
    if (rewardTypeOrCode === 'FREE_DRINK' || rewardTypeOrCode === 'REFERRAL_REWARD') discountAmount = 25000;
    else if (rewardTypeOrCode === 'FREE_TOPPING') discountAmount = 3000;
    else if (rewardTypeOrCode === 'UPGRADE_SIZE') discountAmount = 5000;

    const legacyCode = `${rewardTypeOrCode}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return prisma.voucher.create({
      data: {
        userId,
        code: legacyCode,
        type: rewardTypeOrCode,
        description: fallbackDesc,
        discountAmount,
        expiresAt: new Date(Date.now() + defaultExpiryDays * 24 * 60 * 60 * 1000),
        isUsed: false,
        ...extraFields
      },
    });
  }
}

/**
 * Cek apakah user telah melewati milestone dan berikan voucher.
 * Logika: Setelah milestone 3 tercapai, poin dikurangi (reset) jika diaktifkan.
 */
async function checkAndAwardMilestones(
  userId: string,
  oldPoints: number,
  pointsToAdd: number,
  settings: Awaited<ReturnType<typeof getLoyaltySettings>>
) {
  const vouchersCreated: { type: string; description: string }[] = [];
  let pointsToDeduct = 0;

  let currentP = oldPoints;

  for (let i = 1; i <= pointsToAdd; i++) {
    currentP++;

    // Check Milestone 1
    if (settings.milestone1Enabled) {
      const isHit = settings.milestone3ResetPoints 
        ? currentP === settings.milestone1Points
        : (currentP % settings.milestone3Points) === settings.milestone1Points;
      
      if (isHit) {
        const v = await createVoucherForUser(userId, settings.milestone1Reward, settings.milestone1Desc);
        vouchersCreated.push({ type: v.type, description: v.description });
      }
    }

    // Check Milestone 2
    if (settings.milestone2Enabled) {
      const isHit = settings.milestone3ResetPoints
        ? currentP === settings.milestone2Points
        : (currentP % settings.milestone3Points) === settings.milestone2Points;
      
      if (isHit) {
        const v = await createVoucherForUser(userId, settings.milestone2Reward, settings.milestone2Desc);
        vouchersCreated.push({ type: v.type, description: v.description });
      }
    }

    // Check Milestone 3
    if (settings.milestone3Enabled) {
      const isHit = settings.milestone3ResetPoints
        ? currentP === settings.milestone3Points
        : (currentP % settings.milestone3Points) === 0;
      
      if (isHit) {
        const v = await createVoucherForUser(userId, settings.milestone3Reward, settings.milestone3Desc);
        vouchersCreated.push({ type: v.type, description: v.description });

        if (settings.milestone3ResetPoints) {
          pointsToDeduct += settings.milestone3Points;
          currentP -= settings.milestone3Points;
        }
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
        description: `Poin direset setelah mencapai kelipatan ${settings.milestone3Points} poin`,
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
  // Menggunakan kode template yang dikonfigurasi admin (tumblerVoucherCode2 → TUMBLER_REWARD)
  let voucherRes = null;
  if ((settings as any).tumblerVoucherEnabled) {
    const tumblerCode = (settings as any).tumblerVoucherCode2 || (settings as any).tumblerVoucherType || 'TUMBLER_REWARD';
    const voucherDesc = (settings as any).tumblerVoucherDesc || 'Eco-Reward: Free Upgrade Size (Bawa Tumbler)';
    voucherRes = await createVoucherForUser(userId, tumblerCode, voucherDesc, 14);
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

  // Cek order pertama referee yang sukses (COMPLETED)
  const firstCompletedOrder = await prisma.order.findFirst({
    where: { userId: refereeUserId, status: 'COMPLETED' },
    orderBy: { createdAt: 'asc' },
  });

  if (!firstCompletedOrder) return null;

  // Tandai bonus sudah diberikan
  await prisma.user.update({
    where: { id: refereeUserId },
    data: { referralBonusPaid: true },
  });

  const referrerId = referee.referredById;

  // Gunakan kode template yang dikonfigurasi admin di Pengaturan Loyalty
  // Field: referralVoucherCode (default: 'REFERRAL_REWARD')
  const referralVoucherCode = (settings as any).referralVoucherCode || 'REFERRAL_REWARD';
  const referralRewardType = settings.referralRewardType || 'VOUCHER';
  const referralRewardPoints = settings.referralRewardPoints || 5;

  if (referralRewardType === 'POINTS') {
    await awardPoints({
      userId: referrerId,
      pointsToAdd: referralRewardPoints,
      type: 'EARN_REFERRAL',
      description: `Bonus referral: teman melakukan pembelian pertama (+${referralRewardPoints} poin)`,
    });
    return { type: 'points', reward: `${referralRewardPoints} Poin` };
  } else {
    // Berikan voucher dari template yang dikonfigurasi admin
    const rewardDesc = settings.referralRewardDesc || 'Reward Referral (Ajak Teman)';
    const v = await createVoucherForUser(
      referrerId,
      referralVoucherCode,
      rewardDesc,
      30,
      { fromReferralUserId: refereeUserId }
    );
    return { type: 'voucher', reward: v.description };
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

  // 3. Cek referral (sekarang diklaim manual oleh referrer di profil)
  const referralResult = null;

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

