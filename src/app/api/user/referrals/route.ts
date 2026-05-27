import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { processReferralBonus } from '@/lib/loyalty-utils';

// GET: Ambil daftar teman yang diajak beserta progress mereka
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 });
    }

    const userId = session.user.id;

    // Ambil data user yang diajak (referee)
    const referees = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        referralBonusPaid: true,
        _count: {
          select: {
            orders: {
              where: { status: 'COMPLETED' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedReferees = referees.map((ref) => ({
      id: ref.id,
      name: ref.name || 'Pengguna Matchaboy',
      joinedAt: ref.createdAt,
      bonusClaimed: ref.referralBonusPaid,
      hasCompletedOrder: ref._count.orders > 0,
    }));

    return NextResponse.json({ success: true, referrals: formattedReferees });
  } catch (error) {
    console.error('[GET_REFERRALS] Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// POST: Klaim voucher hasil referral teman tertentu
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 });
    }

    const { refereeId } = await req.json();
    if (!refereeId) {
      return NextResponse.json({ error: 'ID referee tidak boleh kosong' }, { status: 400 });
    }

    const userId = session.user.id;

    // Cek apakah referee benar-benar diundang oleh user ini
    const referee = await prisma.user.findUnique({
      where: { id: refereeId },
      select: {
        id: true,
        referredById: true,
        referralBonusPaid: true,
        _count: {
          select: {
            orders: {
              where: { status: 'COMPLETED' },
            },
          },
        },
      },
    });

    if (!referee) {
      return NextResponse.json({ error: 'Data teman tidak ditemukan' }, { status: 450 });
    }

    if (referee.referredById !== userId) {
      return NextResponse.json({ error: 'Anda tidak memiliki hak untuk klaim referral ini' }, { status: 403 });
    }

    if (referee.referralBonusPaid) {
      return NextResponse.json({ error: 'Voucher untuk referral ini sudah diklaim sebelumnya' }, { status: 400 });
    }

    if (referee._count.orders === 0) {
      return NextResponse.json({ error: 'Teman Anda belum menyelesaikan pesanan pertamanya' }, { status: 400 });
    }

    // Jalankan utilitas proses bonus referral
    const rewardResult = await processReferralBonus(refereeId);

    if (!rewardResult) {
      return NextResponse.json({ error: 'Gagal memproses klaim voucher. Hubungi admin.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil klaim voucher! Hadiah berupa ${rewardResult.reward} telah ditambahkan ke akun Anda.`,
      reward: rewardResult,
    });
  } catch (error) {
    console.error('[CLAIM_REFERRAL] Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
