import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Rate limiting helper
const referralAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userAttempts = referralAttempts.get(userId)
  
  if (!userAttempts || now > userAttempts.resetAt) {
    referralAttempts.set(userId, { count: 1, resetAt: now + 60000 })
    return true
  }
  
  if (userAttempts.count >= 5) { // Max 5 attempts per minute
    return false
  }
  
  userAttempts.count++
  return true
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 });
    }

    // SECURITY FIX #4: Rate limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Tunggu 1 menit.' }, { status: 429 })
    }

    const { referralCode } = await req.json();
    if (!referralCode?.trim()) {
      return NextResponse.json({ error: 'Kode referral tidak boleh kosong' }, { status: 400 });
    }

    let cleanedCode = referralCode.trim();
    if (cleanedCode.includes('ref=')) {
      try {
        const url = new URL(cleanedCode);
        const refParam = url.searchParams.get('ref');
        if (refParam) cleanedCode = refParam;
      } catch (e) {
        const match = cleanedCode.match(/(?:[?&]|^)ref=([^&]+)/);
        if (match) {
          cleanedCode = match[1];
        }
      }
    }

    // SECURITY FIX #3: Normalize to uppercase untuk prevent duplicate
    cleanedCode = cleanedCode.toUpperCase()

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

    // SECURITY FIX #9: Check apakah user sudah pernah dapat welcome voucher
    const loyaltySettings = await prisma.loyaltySettings.findFirst();
    const welcomeCode = (loyaltySettings as any)?.welcomeVoucherCode || 'WELCOME';
    
    const existingWelcomeVoucher = await prisma.voucher.findFirst({
      where: {
        userId,
        code: { startsWith: welcomeCode }
      }
    })

    if (existingWelcomeVoucher) {
      return NextResponse.json({ error: 'Anda sudah pernah mendapat voucher selamat datang' }, { status: 400 })
    }

    // Cegah self-referral (case-insensitive comparison)
    if (currentUser.referralCode.toUpperCase() === cleanedCode) {
      return NextResponse.json({ error: 'Anda tidak dapat menggunakan kode referral milik sendiri' }, { status: 400 });
    }

    // Cari referrer berdasarkan kode (case-insensitive)
    const referrer = await prisma.user.findFirst({
      where: {
        referralCode: {
          equals: cleanedCode,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: 'Kode referral tidak ditemukan atau tidak valid' }, { status: 404 });
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Hubungkan user ke referrer
      await tx.user.update({
        where: { id: userId },
        data: { referredById: referrer.id },
      });

      // Cari atau buat template WELCOME
      let welcomeTemplate = await tx.voucherTemplate.findUnique({
        where: { code: welcomeCode },
      });
      
      if (!welcomeTemplate) {
        try {
          welcomeTemplate = await tx.voucherTemplate.create({
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

      // Berikan voucher kepada user
      const generatedCode = `${welcomeCode}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const discountAmount = welcomeTemplate?.discountValue ?? 3000;
      const minPurchaseVal = welcomeTemplate?.minPurchase ?? 30000;
      const expiresDays = 7;
      
      await tx.voucher.create({
        data: {
          userId,
          code: generatedCode,
          type: welcomeTemplate?.type ?? 'DISCOUNT_RP',
          description: welcomeTemplate?.description ?? 'Diskon Rp3.000 (Hadiah Pengguna Baru)',
          discountAmount,
          minPurchase: minPurchaseVal,
          templateId: welcomeTemplate?.id || null,
          expiresAt: new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000),
        },
      });

      if (welcomeTemplate) {
        await tx.voucherTemplate.update({
          where: { id: welcomeTemplate.id },
          data: { usageCount: { increment: 1 } }
        }).catch(() => {});
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Kode referral berhasil diterapkan! Voucher diskon Rp3.000 (min. belanja Rp30.000) telah ditambahkan ke akun Anda.',
    });
  } catch (error) {
    console.error('[APPLY_REFERRAL] Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
