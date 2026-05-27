import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 });
    }

    const { referralCode } = await req.json();
    if (!referralCode?.trim()) {
      return NextResponse.json({ error: 'Kode referral tidak boleh kosong' }, { status: 400 });
    }

    const userId = session.user.id;

    // Cek apakah user sudah punya referrer
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredById: true, referralCode: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    if (currentUser.referredById) {
      return NextResponse.json({ error: 'Akun Anda sudah terhubung dengan kode referral sebelumnya' }, { status: 400 });
    }

    // Cegah self-referral
    if (currentUser.referralCode === referralCode.trim()) {
      return NextResponse.json({ error: 'Anda tidak dapat menggunakan kode referral milik sendiri' }, { status: 400 });
    }

    // Cari referrer berdasarkan kode
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.trim() },
      select: { id: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: 'Kode referral tidak ditemukan atau tidak valid' }, { status: 404 });
    }

    // Hubungkan user ke referrer
    await prisma.user.update({
      where: { id: userId },
      data: { referredById: referrer.id },
    });

    // Cari atau buat template WELCOME berdasarkan konfigurasi admin di LoyaltySettings
    const loyaltySettings = await prisma.loyaltySettings.findFirst();
    const welcomeCode = (loyaltySettings as any)?.welcomeVoucherCode || 'WELCOME';

    let welcomeTemplate = await prisma.voucherTemplate.findUnique({
      where: { code: welcomeCode },
    });
    if (!welcomeTemplate) {
      try {
        welcomeTemplate = await prisma.voucherTemplate.create({
          data: {
            code: welcomeCode,
            title: 'Diskon Pengguna Baru',
            description: 'Diskon Rp3.000 (Hadiah Pengguna Baru)',
            type: 'DISCOUNT_RP',
            discountValue: 3000,
            minPurchase: 30000,
            terms: 'Minimum transaksi Rp30.000\nBerlaku 7 hari sejak klaim',
            targetNewUserOnly: true,
            hideFromVoucherPack: true,
          },
        });
      } catch (e) {
        console.error('[APPLY_REFERRAL] Gagal membuat voucher template welcome:', e);
      }
    }

    // Berikan voucher kepada user yang baru memasukkan kode menggunakan template value
    const generatedCode = `${welcomeCode}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const discountAmount = welcomeTemplate?.discountValue ?? 3000;
    const minPurchaseVal = welcomeTemplate?.minPurchase ?? 30000;
    const expiresDays = 7;
    await prisma.voucher.create({
      data: {
        userId,
        code: generatedCode,
        type: welcomeTemplate?.type ?? 'DISCOUNT_RP',
        description: welcomeTemplate?.description ?? 'Diskon Rp3.000 (Hadiah Pengguna Baru)',
        discountAmount,
        minPurchase: minPurchaseVal,
        templateId: welcomeTemplate?.id || null,
        expiresAt: new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000), // 7 hari
      },
    });

    if (welcomeTemplate) {
      await prisma.voucherTemplate.update({
        where: { id: welcomeTemplate.id },
        data: { usageCount: { increment: 1 } }
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Kode referral berhasil diterapkan! Voucher diskon Rp3.000 (min. belanja Rp30.000) telah ditambahkan ke akun Anda.',
    });
  } catch (error) {
    console.error('[APPLY_REFERRAL] Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
