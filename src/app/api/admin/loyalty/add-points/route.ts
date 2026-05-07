import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { awardPoints, awardTumblerBonus } from '@/lib/loyalty-utils';

/**
 * POST: Kasir menambah poin pelanggan.
 * Bisa via scan QR (referralCode) atau input manual (phone/email).
 *
 * Body:
 * - referralCode?: string (dari QR scan)
 * - phone?: string (input manual)
 * - email?: string (input manual)
 * - cups: number (jumlah cup yang dibeli)
 * - hasTumbler?: boolean
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'CASHIER'].includes(session.user.role)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { referralCode, phone, email, cups = 1, hasTumbler = false } = body;

    if (!referralCode && !phone && !email) {
      return NextResponse.json(
        { error: 'Harus menyertakan referralCode (dari QR), atau phone/email pelanggan.' },
        { status: 400 }
      );
    }

    if (cups < 1) {
      return NextResponse.json({ error: 'Jumlah cup minimal 1.' }, { status: 400 });
    }

    // Cari user
    let user = null;
    if (referralCode) {
      user = await prisma.user.findUnique({ where: { referralCode } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email } });
    } else if (phone) {
      user = await prisma.user.findFirst({ where: { phone } });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Pelanggan tidak ditemukan. Pastikan kode QR, nomor HP, atau email benar.' },
        { status: 404 }
      );
    }

    // Award poin dari cups
    const result = await awardPoints({
      userId: user.id,
      pointsToAdd: cups,
      type: 'EARN_CASHIER',
      description: `Kasir: ${cups} cup (oleh ${session.user.name || session.user.email})`,
    });

    // Bonus tumbler
    let tumblerResult = null;
    if (hasTumbler) {
      tumblerResult = await awardTumblerBonus(user.id);
    }

    return NextResponse.json({
      success: true,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      pointsAdded: cups,
      tumblerBonus: tumblerResult ? true : false,
      newTotalPoints: result.newPoints,
      vouchersEarned: result.newVouchers,
    });
  } catch (error) {
    console.error('Error adding points:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
