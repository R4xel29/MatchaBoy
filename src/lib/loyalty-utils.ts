import { prisma } from './prisma';
import { sendTemplatedNotification } from './notification-service';
import { sendDigitalReceipt } from './receipt-service';

// =============================================================================
// LOYALTY UTILITIES
// Fungsi terpusat untuk menangani logika poin, milestone, dan referral.
// Digunakan oleh API kasir (offline) maupun order online.
// =============================================================================

/**
 * Ambil settings loyalty dari database (singleton).
 * Jika belum ada, buat default.
 */
export async function getLoyaltySettings(tx?: any) {
  const client = tx || prisma;
  let settings = await client.loyaltySettings.findFirst();
  if (!settings) {
    settings = await client.loyaltySettings.create({
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
}, tx?: any) {
  const client = tx || prisma;
  const settings = await getLoyaltySettings(tx);

  // 1. Tambah poin ke user
  const user = await client.user.update({
    where: { id: userId },
    data: { points: { increment: pointsToAdd } },
  });

  // 2. Catat ke history
  await client.pointHistory.create({
    data: {
      userId,
      amount: pointsToAdd,
      type,
      description,
      orderId,
    },
  });

  // 3. Cek milestone & generate voucher
  const newVouchers = await checkAndAwardMilestones(userId, user.points - pointsToAdd, pointsToAdd, settings, tx);

  return { newPoints: user.points, newVouchers };
}

/**
 * Helper to create a personal voucher cloned from a template (if exists) or fallback to legacy settings.
 */
export async function createVoucherForUser(
  userId: string,
  rewardTypeOrCode: string,
  fallbackDesc: string,
  defaultExpiryDays = 30,
  extraFields: any = {},
  tx?: any
) {
  const client = tx || prisma;
  const template = await client.voucherTemplate.findFirst({
    where: {
      OR: [
        { id: rewardTypeOrCode },
        { code: rewardTypeOrCode }
      ]
    }
  });

  if (template) {
    // SECURITY FIX #M9: Extend unique suffix length to 10 characters to prevent collisions
    const userVoucherCode = `${template.code}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
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

    return client.voucher.create({
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

    // SECURITY FIX #M9: Extend unique suffix length to 10 characters to prevent collisions
    const legacyCode = `${rewardTypeOrCode}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

    return client.voucher.create({
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
  settings: Awaited<ReturnType<typeof getLoyaltySettings>>,
  tx?: any
) {
  const client = tx || prisma;
  const vouchersCreated: { type: string; description: string }[] = [];
  let pointsToDeduct = 0;

  let currentP = oldPoints;
  const m3Points = settings.milestone3Points || 10; // Fallback to 10 to avoid division by zero / NaN

  for (let i = 1; i <= pointsToAdd; i++) {
    currentP++;

    // Check Milestone 1
    if (settings.milestone1Enabled) {
      const isHit = settings.milestone3ResetPoints 
        ? currentP === settings.milestone1Points
        : (currentP % m3Points) === settings.milestone1Points;
      
      if (isHit) {
        const v = await createVoucherForUser(userId, settings.milestone1Reward, settings.milestone1Desc, 30, {}, tx);
        vouchersCreated.push({ type: v.type, description: v.description });
      }
    }

    // Check Milestone 2
    if (settings.milestone2Enabled) {
      const isHit = settings.milestone3ResetPoints
        ? currentP === settings.milestone2Points
        : (currentP % m3Points) === settings.milestone2Points;
      
      if (isHit) {
        const v = await createVoucherForUser(userId, settings.milestone2Reward, settings.milestone2Desc, 30, {}, tx);
        vouchersCreated.push({ type: v.type, description: v.description });
      }
    }

    // Check Milestone 3
    if (settings.milestone3Enabled) {
      const isHit = settings.milestone3ResetPoints
        ? currentP === m3Points
        : (currentP % m3Points) === 0;
      
      if (isHit) {
        const v = await createVoucherForUser(userId, settings.milestone3Reward, settings.milestone3Desc, 30, {}, tx);
        vouchersCreated.push({ type: v.type, description: v.description });

        if (settings.milestone3ResetPoints) {
          pointsToDeduct += m3Points;
          currentP -= m3Points;
        }
      }
    }
  }

  // Deduct poin jika milestone 3 tercapai
  if (pointsToDeduct > 0) {
    await client.user.update({
      where: { id: userId },
      data: { points: { decrement: pointsToDeduct } },
    });

    await client.pointHistory.create({
      data: {
        userId,
        amount: -pointsToDeduct,
        type: 'REDEEM_MILESTONE',
        description: `Poin direset setelah mencapai kelipatan ${m3Points} poin`,
      },
    });
  }

  return vouchersCreated;
}

/**
 * Proses bonus tumbler: tambah poin extra jika pelanggan bawa tumbler,
 * dan lacak kemajuan Milestone Progresif Tumbler serta Sistem Level Arus.
 */
export async function awardTumblerBonus(userId: string, orderId?: string, tx?: any) {
  const client = tx || prisma;
  const settings = await getLoyaltySettings(client);
  if (!settings.tumblerBonusEnabled || settings.tumblerBonusPoints <= 0) {
    return null;
  }

  // 1. Tambah poin loyalitas ramah lingkungan
  const pointsRes = await awardPoints({
    userId,
    pointsToAdd: settings.tumblerBonusPoints,
    type: 'EARN_TUMBLER',
    description: `Bonus tumbler/wadah sendiri (+${settings.tumblerBonusPoints} poin)`,
    orderId,
  }, client);

  // 2. Increment tumblerCount dan dapatkan info goal/level saat ini
  const user = await client.user.update({
    where: { id: userId },
    data: { tumblerCount: { increment: 1 } },
    select: { tumblerCount: true, currentTumblerGoal: true, arusLevel: true }
  });

  let voucherRes = null;
  let ecoRewardEarned = false;
  let nextGoal = user.currentTumblerGoal;
  let nextLevel = user.arusLevel;

  // 3. Cek apakah pengguna mencapai target milestonenya
  if (user.tumblerCount >= user.currentTumblerGoal) {
    ecoRewardEarned = true;
    const tumblerCode = (settings as any).tumblerVoucherCode2 || 'TUMBLER_REWARD';
    const voucherDesc = `Eco-Milestone: Hadiah bawa tumbler ke-${user.currentTumblerGoal}x! (Free Drink Pilihan)`;
    
    voucherRes = await createVoucherForUser(userId, tumblerCode, voucherDesc, 30, {}, client);

    // Tentukan target milestone berikutnya & naik Level Arus
    if (user.currentTumblerGoal === 10) {
      nextGoal = 25;
      nextLevel = 'Ksatria Hijau';
    } else if (user.currentTumblerGoal === 25) {
      nextGoal = 45;
      nextLevel = 'Penjaga Arus';
    } else {
      nextGoal = user.currentTumblerGoal + 25;
    }

    // Update level dan target goal baru di database
    await client.user.update({
      where: { id: userId },
      data: {
        currentTumblerGoal: nextGoal,
        arusLevel: nextLevel
      }
    });

    // Catat log aktivitas pencapaian ramah lingkungan
    await client.activityLog.create({
      data: {
        userId,
        action: 'ECO_MILESTONE',
        entity: 'USER',
        entityId: userId,
        details: `Pelanggan mencapai Milestone Ramah Lingkungan ke-${user.currentTumblerGoal}x bawa tumbler. Level naik ke: ${nextLevel}.`
      }
    });
  }

  return { 
    pointsRes, 
    voucherRes,
    tumblerCount: user.tumblerCount,
    currentGoal: user.currentTumblerGoal,
    nextGoal,
    arusLevel: nextLevel,
    ecoRewardEarned
  };
}

/**
 * Proses referral bonus: berikan reward ke referrer saat referee melakukan pembelian pertama.
 */
export async function processReferralBonus(refereeUserId: string, tx?: any) {
  const client = tx || prisma;
  const settings = await getLoyaltySettings(client);
  if (!settings.referralEnabled) return null;

  // Cek apakah referee punya referrer
  const referee = await client.user.findUnique({
    where: { id: refereeUserId },
    select: { id: true, referredById: true, referralBonusPaid: true },
  });

  if (!referee?.referredById || referee.referralBonusPaid) return null;

  // Cek order pertama referee yang sukses (COMPLETED)
  const firstCompletedOrder = await client.order.findFirst({
    where: { userId: refereeUserId, status: 'COMPLETED' },
    orderBy: { createdAt: 'asc' },
  });

  if (!firstCompletedOrder) return null;

  // Cek syarat minimal belanja teman yang diajak
  const minPurchaseNeeded = (settings as any).referralMinPurchase ?? 0;
  if (firstCompletedOrder.total < minPurchaseNeeded) {
    return { error: `Pesanan pertama teman Anda (Rp${firstCompletedOrder.total.toLocaleString('id-ID')}) belum memenuhi syarat minimal belanja Rp${minPurchaseNeeded.toLocaleString('id-ID')}` };
  }

  const referrerId = referee.referredById;

  // Cek batas maksimum klaim jika diaktifkan (referralMaxClaims > 0)
  const maxClaims = (settings as any).referralMaxClaims ?? 0;
  if (maxClaims > 0) {
    const claimedCount = await client.voucher.count({
      where: {
        userId: referrerId,
        fromReferralUserId: { not: null },
      },
    });
    if (claimedCount >= maxClaims) {
      return { error: `Batas maksimum klaim bonus referral Anda (${maxClaims}x) telah tercapai.` };
    }
  }

  // Tandai bonus sudah diberikan
  await client.user.update({
    where: { id: refereeUserId },
    data: { referralBonusPaid: true },
  });

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
    }, client);
    return { type: 'points', reward: `${referralRewardPoints} Poin` };
  } else {
    // Berikan voucher dari template yang dikonfigurasi admin
    const rewardDesc = settings.referralRewardDesc || 'Reward Referral (Ajak Teman)';
    const v = await createVoucherForUser(
      referrerId,
      referralVoucherCode,
      rewardDesc,
      30,
      { fromReferralUserId: refereeUserId },
      client
    );
    return { type: 'voucher', reward: v.description };
  }
}

/**
 * Proses lengkap saat order selesai (COMPLETED):
 * 1. Hitung poin dari jumlah cup
 * 2. Bonus tumbler jika ada
 * 3. Cek referral bonus
 * Wrap semuanya dalam Prisma $transaction untuk keamanan integritas data.
 */
export async function processOrderCompletion(orderId: string) {
  // SECURITY FIX #L4: wrap database writes inside a single Prisma $transaction
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || !order.userId || order.pointsAwarded) return null;

    const settings = await getLoyaltySettings(tx);
    const cups = calculateCupsFromItems(order.items);

    // Calculate points based on configured mode
    let pointsToAdd = cups; // default: 1 point per cup
    
    if ((settings as any).pointMode === 'PER_TRANSACTION') {
      pointsToAdd = (settings as any).pointPerTransaction || 1;
    } else if ((settings as any).pointMode === 'PER_AMOUNT') {
      const perAmount = (settings as any).pointPerAmount || 10000;
      pointsToAdd = Math.floor(order.total / perAmount);
    }

    if (pointsToAdd <= 0) pointsToAdd = 1; // minimum 1 poin

    // Check subscription tier for multipliers (A1)
    const userSubscription = await tx.memberSubscription.findUnique({
      where: { userId: order.userId }
    });
    const isSubscriptionActive = userSubscription && 
      userSubscription.status === 'ACTIVE' && 
      userSubscription.expiresAt > new Date();

    if (isSubscriptionActive) {
      if (userSubscription.tier === 'MATCHA_LATTE') {
        pointsToAdd = pointsToAdd * 2;
      } else if (userSubscription.tier === 'GOLDEN_MATCHA') {
        pointsToAdd = pointsToAdd * 3;
      }
    }

    // 1. Award poin
    const awardResult = await awardPoints({
      userId: order.userId,
      pointsToAdd,
      type: 'EARN_ORDER',
      description: `Pesanan selesai: ${pointsToAdd} poin${cups > 1 ? ` (${cups} cup)` : ''}`,
      orderId,
    }, tx);

    // 2. Bonus tumbler
    let tumblerResult = null;
    if (order.hasTumbler) {
      tumblerResult = await awardTumblerBonus(order.userId, orderId, tx);
    }

    // 3. Cek referral (sekarang diklaim manual oleh referrer di profil)
    const referralResult = null;

    // 4. Increment Gacha chances if order total is >= 25K (Rp 25.000)
    let gachaChanceEarned = false;
    if (order.total >= 25000) {
      gachaChanceEarned = true;
      await tx.user.update({
        where: { id: order.userId },
        data: { gachaChances: { increment: 1 } },
      });
    }

    // 5. C1 Gamification Quests: Atomically increment quest progress
    await incrementQuestProgress(order.userId, 'TRANSACTION_COUNT', 1, tx);
    if (order.orderType === 'DINE_IN') {
      await incrementQuestProgress(order.userId, 'DINE_IN_COUNT', 1, tx);
    }
    if (order.hasTumbler) {
      await incrementQuestProgress(order.userId, 'TUMBLER_COUNT', 1, tx);
    }

    // 6. Tandai order sudah diberi poin
    const tumblerBonus = order.hasTumbler ? settings.tumblerBonusPoints : 0;
    await tx.order.update({
      where: { id: orderId },
      data: {
        pointsAwarded: true,
        pointsEarned: pointsToAdd + tumblerBonus,
      },
    });

    return { 
      cups, 
      pointsToAdd, 
      newPoints: awardResult.newPoints, 
      tumblerResult, 
      referralResult, 
      gachaChanceEarned,
      customerName: order.customerName, 
      userId: order.userId,
      orderShortId: order.id.slice(0, 8).toUpperCase()
    };
  });

  // Kirim notifikasi secara asynchronous di luar transaksi agar tidak memblokir commit DB
  if (result) {
    try {
      await sendTemplatedNotification({
        userId: result.userId,
        trigger: 'POINTS_EARNED',
        variables: {
          name: result.customerName,
          points: result.pointsToAdd.toString(),
          orderNo: result.orderShortId,
        },
        linkUrl: '/profile',
      });
    } catch (err) {
      console.error('Failed to send points notification after order completion:', err);
    }

    sendDigitalReceipt(orderId).catch((err) => {
      console.error('Failed to send digital receipt:', err);
    });
  }

  return result;
}

/**
 * C1 Gamification Quests: Atomically increment quest progress for a specific user and quest targetType.
 */
export async function incrementQuestProgress(
  userId: string,
  targetType: 'TRANSACTION_COUNT' | 'DINE_IN_COUNT' | 'TUMBLER_COUNT' | 'TOP_UP_COUNT',
  amount: number = 1,
  tx?: any
) {
  const client = tx || prisma;
  
  // Find all active quests matching the targetType
  const activeQuests = await client.quest.findMany({
    where: {
      isActive: true,
      targetType: targetType,
    },
  });

  for (const quest of activeQuests) {
    // Find or create UserQuest record
    const userQuest = await client.userQuest.upsert({
      where: {
        userId_questId: {
          userId,
          questId: quest.id,
        },
      },
      update: {},
      create: {
        userId,
        questId: quest.id,
        progress: 0,
        isCompleted: false,
        isClaimed: false,
      },
    });

    if (userQuest.isCompleted) {
      continue; // Already completed, no need to update
    }

    const newProgress = Math.min(userQuest.progress + amount, quest.targetValue);
    const isCompletedNow = newProgress >= quest.targetValue;

    await client.userQuest.update({
      where: {
        id: userQuest.id,
      },
      data: {
        progress: newProgress,
        isCompleted: isCompletedNow,
        completedAt: isCompletedNow ? new Date() : userQuest.completedAt,
      },
    });
  }
}

