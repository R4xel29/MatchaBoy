import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Helper to check admin authorization
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 };
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (dbUser?.role !== 'ADMIN') return { error: 'Forbidden', status: 403 };
  return { success: true };
}

// Default definitions for system vouchers
const SYSTEM_VOUCHERS = [
  {
    key: 'welcomeVoucherCode',
    defaultCode: 'WELCOME',
    label: 'Voucher Selamat Datang (Welcome)',
    icon: '🎁',
    description: 'Diberikan otomatis ke setiap pengguna baru yang mendaftar via WhatsApp atau memasukkan kode referral teman.',
    defaultData: {
      code: 'WELCOME',
      title: 'Diskon Pengguna Baru',
      description: 'Diskon Rp3.000 untuk pesanan pertama Anda!',
      type: 'DISCOUNT_RP',
      discountValue: 3000,
      minPurchase: 30000,
      terms: 'Minimum transaksi Rp30.000\nBerlaku 7 hari sejak diterima\nHanya untuk pengguna baru',
      targetNewUserOnly: true,
      hideFromVoucherPack: true,
      usageLimit: 0,
    },
  },
  {
    key: 'referralVoucherCode',
    defaultCode: 'REFERRAL_REWARD',
    label: 'Reward Referral (Untuk Pengajak)',
    icon: '🤝',
    description: 'Diberikan ke pengguna yang mengajak teman, setelah teman tersebut berhasil menyelesaikan pesanan pertama.',
    defaultData: {
      code: 'REFERRAL_REWARD',
      title: 'Reward Ajak Teman',
      description: 'Terima kasih sudah mengajak teman! Nikmati reward spesial ini.',
      type: 'DISCOUNT_RP',
      discountValue: 5000,
      minPurchase: 0,
      terms: 'Reward otomatis setelah teman menyelesaikan pesanan pertama\nBerlaku 30 hari',
      targetNewUserOnly: false,
      hideFromVoucherPack: true,
      usageLimit: 0,
    },
  },
  {
    key: 'tumblerVoucherCode2',
    defaultCode: 'TUMBLER_REWARD',
    label: 'Eco Tumbler Reward',
    icon: '🌿',
    description: 'Diberikan ke pelanggan yang membawa tumbler/wadah sendiri saat memesan.',
    defaultData: {
      code: 'TUMBLER_REWARD',
      title: 'Eco Reward - Bawa Tumbler',
      description: 'Terima kasih sudah ramah lingkungan! Dapatkan reward spesial.',
      type: 'UPGRADE_SIZE',
      discountValue: 5000,
      minPurchase: 0,
      terms: 'Berlaku saat membawa tumbler/wadah sendiri\nBerlaku 30 hari sejak diterima',
      targetNewUserOnly: false,
      hideFromVoucherPack: true,
      usageLimit: 0,
    },
  },
];

// GET: Get all system voucher templates status
export async function GET() {
  try {
    const authResult = await checkAdmin();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get loyalty settings to find active codes
    const settings = await prisma.loyaltySettings.findFirst();

    // Get all system voucher templates
    const result = await Promise.all(
      SYSTEM_VOUCHERS.map(async (sv) => {
        const activeCode = settings
          ? (settings as any)[sv.key] || sv.defaultCode
          : sv.defaultCode;

        const template = await prisma.voucherTemplate.findUnique({
          where: { code: activeCode },
          include: { _count: { select: { vouchers: true } } },
        });

        return {
          key: sv.key,
          label: sv.label,
          icon: sv.icon,
          description: sv.description,
          activeCode,
          template: template || null,
          isCreated: !!template,
          defaultData: sv.defaultData,
        };
      })
    );

    return NextResponse.json({ systemVouchers: result, settings });
  } catch (error) {
    console.error('[SYSTEM_VOUCHER_GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Initialize a missing system voucher template with defaults
export async function POST(req: Request) {
  try {
    const authResult = await checkAdmin();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { key } = await req.json();
    const sv = SYSTEM_VOUCHERS.find((v) => v.key === key);
    if (!sv) {
      return NextResponse.json({ error: 'Kunci voucher sistem tidak valid' }, { status: 400 });
    }

    // Check if already exists
    const existing = await prisma.voucherTemplate.findUnique({
      where: { code: sv.defaultCode },
    });
    if (existing) {
      return NextResponse.json({ success: true, template: existing, message: 'Template sudah ada' });
    }

    // Create with defaults
    const template = await prisma.voucherTemplate.create({
      data: {
        ...sv.defaultData,
        expiresAt: null,
      },
    });

    return NextResponse.json({ success: true, template, message: `Template ${sv.label} berhasil dibuat` });
  } catch (error) {
    console.error('[SYSTEM_VOUCHER_POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update which template code is used for a system voucher key
export async function PUT(req: Request) {
  try {
    const authResult = await checkAdmin();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { key, code } = await req.json();

    if (!key || !code) {
      return NextResponse.json({ error: 'key dan code wajib diisi' }, { status: 400 });
    }

    // Validate the key is a known system voucher field
    const validKeys = SYSTEM_VOUCHERS.map((sv) => sv.key);
    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: 'Kunci tidak valid' }, { status: 400 });
    }

    // Verify the template code exists
    const template = await prisma.voucherTemplate.findUnique({ where: { code } });
    if (!template) {
      return NextResponse.json({ error: `Template dengan kode "${code}" tidak ditemukan` }, { status: 404 });
    }

    // Upsert loyalty settings
    let settings = await prisma.loyaltySettings.findFirst();
    if (!settings) {
      settings = await prisma.loyaltySettings.create({ data: { id: 'default-loyalty-settings' } });
    }

    await prisma.loyaltySettings.update({
      where: { id: settings.id },
      data: { [key]: code },
    });

    return NextResponse.json({ success: true, message: `Voucher sistem "${key}" berhasil diperbarui ke kode "${code}"` });
  } catch (error) {
    console.error('[SYSTEM_VOUCHER_PUT]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
