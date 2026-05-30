import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Define the prize structure
interface GachaPrize {
  id: string;
  type: 'POINTS' | 'VOUCHER' | 'MERCH';
  value: string;
  label: string;
  description: string;
  probability: number; // weight for random drawing
}

const PRIZE_POOL: GachaPrize[] = [
  { id: 'p1', type: 'POINTS', value: '5', label: '5 Arus Poin', description: 'Bonus 5 Arus Poin langsung masuk ke akunmu!', probability: 0.35 },
  { id: 'p2', type: 'VOUCHER', value: 'FREE_TOPPING', label: 'Voucher Free Topping', description: 'Voucher Gratis Topping untuk minuman Matchaboy favoritmu!', probability: 0.25 },
  { id: 'p3', type: 'POINTS', value: '15', label: '15 Arus Poin', description: 'Bonus 15 Arus Poin ekstra!', probability: 0.15 },
  { id: 'p4', type: 'VOUCHER', value: 'UPGRADE_SIZE', label: 'Voucher Free Upgrade Size', description: 'Voucher Upgrade Ukuran Minuman gratis!', probability: 0.15 },
  { id: 'p5', type: 'POINTS', value: '50', label: '50 Arus Poin Super', description: 'Mendapatkan 50 Arus Poin!', probability: 0.07 },
  { id: 'p6', type: 'MERCH', value: 'STICKER_PACK', label: 'Matchaboy Sticker Pack', description: 'Klaim Sticker Pack Eksklusif Matchaboy di kasir terdekat!', probability: 0.03 },
];

// Helper to select a prize based on probability weights
function drawPrize(): GachaPrize {
  const totalWeight = PRIZE_POOL.reduce((sum, prize) => sum + prize.probability, 0);
  let random = Math.random() * totalWeight;
  
  for (const prize of PRIZE_POOL) {
    if (random < prize.probability) {
      return prize;
    }
    random -= prize.probability;
  }
  return PRIZE_POOL[0]; // fallback
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { gachaChances: true },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    return NextResponse.json({ gachaChances: user.gachaChances });
  } catch (error) {
    console.error('Error fetching gacha chances:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;

    // Run in a single transaction to prevent race conditions or double claims
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch user chances
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { gachaChances: true, points: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.gachaChances <= 0) {
        throw new Error('NO_CHANCES');
      }

      // 2. Select prize
      const prize = drawPrize();

      // 3. Decrement user's gacha chances by 1
      await tx.user.update({
        where: { id: userId },
        data: { gachaChances: { decrement: 1 } },
      });

      // 4. Award the prize based on its type
      if (prize.type === 'POINTS') {
        const pointsToAdd = parseInt(prize.value, 10);
        await tx.user.update({
          where: { id: userId },
          data: { points: { increment: pointsToAdd } },
        });

        // Add to point history
        await tx.pointHistory.create({
          data: {
            userId,
            amount: pointsToAdd,
            type: 'ADMIN_ADJUST', // fallback to valid history type schema
            description: `Hadiah Gacha Draw: +${pointsToAdd} Poin`,
          },
        });
      } else if (prize.type === 'VOUCHER') {
        const legacyCode = `GACHA-${prize.value}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
        
        let discountAmount = 5000;
        if (prize.value === 'FREE_TOPPING') discountAmount = 3000;
        
        await tx.voucher.create({
          data: {
            userId,
            code: legacyCode,
            type: prize.value,
            description: prize.label,
            discountAmount,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Valid for 30 days
            isUsed: false,
          },
        });
      }

      // 5. Create GachaDraw entry log
      const gachaDraw = await tx.gachaDraw.create({
        data: {
          userId,
          prizeType: prize.type,
          prizeValue: prize.value,
          description: prize.label,
        },
      });

      return {
        success: true,
        prize,
        drawId: gachaDraw.id,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error drawing gacha:', error);
    if (error.message === 'NO_CHANCES') {
      return NextResponse.json({ error: 'Kamu tidak memiliki kesempatan Lucky Draw tersisa.' }, { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
