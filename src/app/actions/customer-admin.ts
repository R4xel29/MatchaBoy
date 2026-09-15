'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/admin-logger';
import bcrypt from 'bcryptjs';

/**
 * Helper untuk menormalisasi string menjadi slug yang aman untuk URL
 */
export async function sanitizeSlug(input: string): Promise<string> {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Server Action: Memperbarui data profil pelanggan oleh Admin
 */
export async function updateCustomerDetailsAction(data: {
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  slug?: string | null;
  referralCode?: string | null;
  arusLevel?: string | null;
  points?: number;
  walletBalance?: number;
  tumblerCount?: number;
  gender?: string | null;
  birthDate?: string | null;
  password?: string | null;
  pin?: string | null;
  adminNote?: string | null;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Hanya Admin Utama yang berhak memperbarui data pelanggan' };
  }

  const { userId, name } = data;

  if (!userId) {
    return { success: false, error: 'Customer ID tidak valid' };
  }

  const existingCustomer = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingCustomer) {
    return { success: false, error: 'Data pelanggan tidak ditemukan' };
  }

  const trimmedName = name?.trim();
  if (!trimmedName) {
    return { success: false, error: 'Nama pelanggan wajib diisi' };
  }

  const updatePayload: any = {
    name: trimmedName,
  };

  // Validasi Email
  if (data.email !== undefined) {
    const rawEmail = data.email?.trim().toLowerCase() || null;
    if (rawEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawEmail)) {
        return { success: false, error: 'Format email tidak valid' };
      }
      if (rawEmail !== existingCustomer.email) {
        const conflict = await prisma.user.findUnique({ where: { email: rawEmail } });
        if (conflict && conflict.id !== userId) {
          return { success: false, error: 'Email tersebut sudah digunakan oleh akun lain' };
        }
      }
      updatePayload.email = rawEmail;
    } else {
      updatePayload.email = null;
    }
  }

  // Validasi Nomor WhatsApp / Phone
  if (data.phone !== undefined) {
    const rawPhone = data.phone?.trim() || null;
    if (rawPhone) {
      let stdPhone = rawPhone.replace(/[^0-9]/g, '');
      if (stdPhone.startsWith('08')) {
        stdPhone = '62' + stdPhone.substring(1);
      } else if (stdPhone.startsWith('8')) {
        stdPhone = '62' + stdPhone;
      }
      if (stdPhone.length < 10) {
        return { success: false, error: 'Nomor WhatsApp / HP tidak valid (minimal 10 digit)' };
      }
      if (stdPhone !== existingCustomer.phone) {
        const conflict = await prisma.user.findUnique({ where: { phone: stdPhone } });
        if (conflict && conflict.id !== userId) {
          return { success: false, error: 'Nomor WhatsApp tersebut sudah terdaftar pada akun lain' };
        }
      }
      updatePayload.phone = stdPhone;
      updatePayload.phoneVerified = true;
    } else {
      updatePayload.phone = null;
      updatePayload.phoneVerified = false;
    }
  }

  // Validasi Slug Kustom
  if (data.slug !== undefined) {
    const rawSlug = data.slug?.trim().toLowerCase() || null;
    if (rawSlug) {
      const cleanSlug = await sanitizeSlug(rawSlug);
      if (cleanSlug.length < 3) {
        return { success: false, error: 'Slug pelanggan minimal 3 karakter (huruf, angka, atau tanda minus)' };
      }
      if (cleanSlug !== existingCustomer.slug) {
        const conflict = await prisma.user.findUnique({ where: { slug: cleanSlug } });
        if (conflict && conflict.id !== userId) {
          return { success: false, error: `Slug "@${cleanSlug}" sudah dipakai pengguna lain. Silakan pilih slug yang lain.` };
        }
      }
      updatePayload.slug = cleanSlug;
    } else {
      updatePayload.slug = null;
    }
  }

  // Validasi Kode Referral
  if (data.referralCode !== undefined) {
    const rawRef = data.referralCode?.trim().toUpperCase() || null;
    if (rawRef) {
      if (rawRef.length < 4) {
        return { success: false, error: 'Kode referral minimal 4 karakter' };
      }
      if (rawRef !== existingCustomer.referralCode) {
        const conflict = await prisma.user.findUnique({ where: { referralCode: rawRef } });
        if (conflict && conflict.id !== userId) {
          return { success: false, error: `Kode referral "${rawRef}" sudah terdaftar.` };
        }
      }
      updatePayload.referralCode = rawRef;
    }
  }

  // Arus Level & Tumbler
  if (data.arusLevel !== undefined && data.arusLevel) {
    updatePayload.arusLevel = data.arusLevel;
  }
  if (typeof data.tumblerCount === 'number' && data.tumblerCount >= 0) {
    updatePayload.tumblerCount = Math.floor(data.tumblerCount);
  }

  // Gender & Tanggal Lahir
  if (data.gender !== undefined) {
    updatePayload.gender = data.gender || null;
  }
  if (data.birthDate !== undefined) {
    updatePayload.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  }

  // Poin Loyalitas (dengan audit log PointHistory jika berubah)
  let pointDiff = 0;
  if (typeof data.points === 'number' && data.points >= 0) {
    const newPoints = Math.floor(data.points);
    pointDiff = newPoints - existingCustomer.points;
    updatePayload.points = newPoints;
  }

  // Saldo Dompet (dengan audit log WalletTransaction jika berubah)
  let walletDiff = 0;
  if (typeof data.walletBalance === 'number' && data.walletBalance >= 0) {
    const newBalance = Math.floor(data.walletBalance);
    walletDiff = newBalance - existingCustomer.walletBalance;
    updatePayload.walletBalance = newBalance;
  }

  // Reset Password jika diisi
  let passwordReset = false;
  if (data.password && data.password.trim()) {
    const cleanPwd = data.password.trim();
    if (cleanPwd.length < 6) {
      return { success: false, error: 'Password baru minimal 6 karakter' };
    }
    updatePayload.password = await bcrypt.hash(cleanPwd, 10);
    passwordReset = true;
  }

  // Reset PIN Keamanan jika diisi
  let pinReset = false;
  if (data.pin !== undefined) {
    const cleanPin = data.pin?.trim() || null;
    if (cleanPin) {
      if (!/^\d{6}$/.test(cleanPin)) {
        return { success: false, error: 'PIN keamanan harus terdiri dari 6 digit angka' };
      }
      updatePayload.pin = cleanPin;
      pinReset = true;
    } else {
      updatePayload.pin = null;
    }
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
    });

    // Catat mutasi poin jika berubah
    if (pointDiff !== 0) {
      await prisma.pointHistory.create({
        data: {
          userId,
          amount: pointDiff,
          type: 'ADMIN_ADJUST',
          description: `Penyesuaian oleh Admin (${pointDiff > 0 ? '+' : ''}${pointDiff} poin)${data.adminNote ? `: ${data.adminNote}` : ''}`,
        },
      });
    }

    // Catat mutasi saldo dompet jika berubah
    if (walletDiff !== 0) {
      await prisma.walletTransaction.create({
        data: {
          userId,
          amount: walletDiff,
          type: walletDiff > 0 ? 'TOP_UP' : 'TRANSFER_OUT',
          status: 'COMPLETED',
          description: `Penyesuaian saldo dompet oleh Admin (${walletDiff > 0 ? '+' : ''}Rp ${Math.abs(walletDiff).toLocaleString('id-ID')})${data.adminNote ? `: ${data.adminNote}` : ''}`,
        },
      });
    }

    // Catat ke Log Aktivitas Admin
    const logDetails = [
      `Mengubah profil pelanggan "${updatedUser.name}"`,
      updatedUser.slug ? `Slug: @${updatedUser.slug}` : null,
      pointDiff !== 0 ? `Poin: ${existingCustomer.points} → ${updatedUser.points}` : null,
      walletDiff !== 0 ? `Saldo: Rp ${existingCustomer.walletBalance.toLocaleString('id-ID')} → Rp ${updatedUser.walletBalance.toLocaleString('id-ID')}` : null,
      passwordReset ? 'Password di-reset' : null,
      pinReset ? 'PIN 6-digit di-reset' : null,
    ].filter(Boolean).join(' | ');

    await logAdminAction({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'USER',
      entityId: userId,
      details: logDetails,
    });

    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${userId}`);
    if (updatedUser.slug) {
      revalidatePath(`/admin/customers/${updatedUser.slug}`);
    }

    return {
      success: true,
      message: 'Data profil pelanggan berhasil diperbarui',
      customer: updatedUser,
    };
  } catch (error: any) {
    console.error('[ADMIN_UPDATE_CUSTOMER_ERROR]', error);
    return { success: false, error: error.message || 'Gagal memperbarui data pelanggan' };
  }
}

/**
 * Server Action: Menambahkan Akun Pelanggan Baru oleh Admin
 */
export async function createCustomerAction(data: {
  name: string;
  phone?: string;
  email?: string;
  slug?: string;
  password?: string;
  pin?: string;
  initialPoints?: number;
  initialWallet?: number;
  arusLevel?: string;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Hanya Admin Utama yang berhak mendaftarkan pelanggan baru' };
  }

  const name = data.name?.trim();
  if (!name) {
    return { success: false, error: 'Nama pelanggan wajib diisi' };
  }

  const rawPhone = data.phone?.trim() || '';
  const rawEmail = data.email?.trim().toLowerCase() || '';

  if (!rawPhone && !rawEmail) {
    return { success: false, error: 'Nomor WhatsApp atau Email wajib diisi minimal salah satu' };
  }

  let cleanPhone: string | null = null;
  if (rawPhone) {
    let stdPhone = rawPhone.replace(/[^0-9]/g, '');
    if (stdPhone.startsWith('08')) {
      stdPhone = '62' + stdPhone.substring(1);
    } else if (stdPhone.startsWith('8')) {
      stdPhone = '62' + stdPhone;
    }
    if (stdPhone.length < 10) {
      return { success: false, error: 'Nomor WhatsApp / HP tidak valid' };
    }
    const exists = await prisma.user.findUnique({ where: { phone: stdPhone } });
    if (exists) {
      return { success: false, error: 'Nomor WhatsApp tersebut sudah terdaftar' };
    }
    cleanPhone = stdPhone;
  }

  let cleanEmail: string | null = null;
  if (rawEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      return { success: false, error: 'Format email tidak valid' };
    }
    const exists = await prisma.user.findUnique({ where: { email: rawEmail } });
    if (exists) {
      return { success: false, error: 'Email tersebut sudah terdaftar' };
    }
    cleanEmail = rawEmail;
  }

  // Slug
  let cleanSlug: string | null = null;
  if (data.slug && data.slug.trim()) {
    cleanSlug = await sanitizeSlug(data.slug);
    const exists = await prisma.user.findUnique({ where: { slug: cleanSlug } });
    if (exists) {
      return { success: false, error: `Slug "@${cleanSlug}" sudah dipakai akun lain.` };
    }
  }

  // Password & PIN
  const password = data.password?.trim() || 'seduh123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const pin = data.pin?.trim() || null;
  if (pin && !/^\d{6}$/.test(pin)) {
    return { success: false, error: 'PIN keamanan harus berupa 6 digit angka' };
  }

  const initialPoints = Math.max(0, Math.floor(Number(data.initialPoints) || 0));
  const initialWallet = Math.max(0, Math.floor(Number(data.initialWallet) || 0));
  const arusLevel = data.arusLevel || 'Tunas Arus';

  try {
    const newCustomer = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        phone: cleanPhone,
        phoneVerified: !!cleanPhone,
        slug: cleanSlug,
        password: hashedPassword,
        pin,
        role: 'CUSTOMER',
        points: initialPoints,
        walletBalance: initialWallet,
        arusLevel,
      },
    });

    // Catat bonus awal jika ada
    if (initialPoints > 0) {
      await prisma.pointHistory.create({
        data: {
          userId: newCustomer.id,
          amount: initialPoints,
          type: 'ADMIN_ADJUST',
          description: 'Poin awal saat pendaftaran oleh Admin',
        },
      });
    }

    if (initialWallet > 0) {
      await prisma.walletTransaction.create({
        data: {
          userId: newCustomer.id,
          amount: initialWallet,
          type: 'TOP_UP',
          status: 'COMPLETED',
          description: 'Saldo awal saat pendaftaran oleh Admin',
        },
      });
    }

    await logAdminAction({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'USER',
      entityId: newCustomer.id,
      details: `Menambahkan pelanggan baru: ${newCustomer.name}${newCustomer.slug ? ` (@${newCustomer.slug})` : ''}`,
    });

    revalidatePath('/admin/customers');

    return {
      success: true,
      message: `Pelanggan "${newCustomer.name}" berhasil didaftarkan`,
      customer: newCustomer,
    };
  } catch (error: any) {
    console.error('[ADMIN_CREATE_CUSTOMER_ERROR]', error);
    return { success: false, error: error.message || 'Gagal mendaftarkan pelanggan' };
  }
}

/**
 * Server Action: Memberikan Voucher Manual kepada Pelanggan
 */
export async function grantCustomerVoucherAction(data: {
  userId: string;
  templateId?: string;
  customCode?: string;
  type?: string;
  description?: string;
  discountAmount?: number;
  minPurchase?: number;
  expiresInDays?: number;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Hanya Admin Utama yang berhak memberikan voucher manual' };
  }

  const { userId } = data;
  if (!userId) {
    return { success: false, error: 'Customer ID tidak valid' };
  }

  const targetCustomer = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!targetCustomer) {
    return { success: false, error: 'Pelanggan tidak ditemukan' };
  }

  try {
    let newVoucher;

    if (data.templateId) {
      const template = await prisma.voucherTemplate.findUnique({
        where: { id: data.templateId },
      });

      if (!template) {
        return { success: false, error: 'Template voucher tidak ditemukan' };
      }

      // Generate random unique voucher code
      const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code = `${template.code}-${uniqueSuffix}`;

      let expiresAt: Date | null = null;
      if (template.expiresAt) {
        expiresAt = template.expiresAt;
      } else if (data.expiresInDays && data.expiresInDays > 0) {
        expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);
      }

      newVoucher = await prisma.voucher.create({
        data: {
          userId,
          templateId: template.id,
          code,
          type: template.type,
          description: template.title,
          discountAmount: template.discountValue,
          minPurchase: template.minPurchase,
          expiresAt,
        },
      });

      // Update template usage count
      await prisma.voucherTemplate.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
      });
    } else {
      // Custom voucher
      const type = data.type || 'DISCOUNT_RP';
      const description = data.description?.trim() || 'Hadiah Spesial Arum Seduh';
      const discountAmount = Math.max(0, Math.floor(Number(data.discountAmount) || 0));
      const minPurchase = Math.max(0, Math.floor(Number(data.minPurchase) || 0));
      const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code = (data.customCode?.trim().toUpperCase() || 'HADIAH') + '-' + uniqueSuffix;

      let expiresAt: Date | null = null;
      if (data.expiresInDays && data.expiresInDays > 0) {
        expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);
      }

      newVoucher = await prisma.voucher.create({
        data: {
          userId,
          code,
          type,
          description,
          discountAmount,
          minPurchase,
          expiresAt,
        },
      });
    }

    await logAdminAction({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'VOUCHER',
      entityId: newVoucher.id,
      details: `Memberikan voucher "${newVoucher.description}" (Kode: ${newVoucher.code}) kepada ${targetCustomer.name}`,
    });

    revalidatePath(`/admin/customers/${userId}`);

    return {
      success: true,
      message: `Voucher "${newVoucher.description}" berhasil diberikan kepada ${targetCustomer.name}`,
      voucher: newVoucher,
    };
  } catch (error: any) {
    console.error('[ADMIN_GRANT_VOUCHER_ERROR]', error);
    return { success: false, error: error.message || 'Gagal memberikan voucher' };
  }
}
