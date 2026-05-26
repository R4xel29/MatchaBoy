import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { phone } = body;

    let standardizedPhone = null;
    if (phone && phone.trim() !== '') {
      // Standardize phone number format (remove non-digits, replace leading 0 with 62)
      standardizedPhone = phone.replace(/[^0-9]/g, '');
      if (standardizedPhone.startsWith('08')) {
        standardizedPhone = '62' + standardizedPhone.substring(1);
      } else if (standardizedPhone.startsWith('8')) {
        standardizedPhone = '62' + standardizedPhone;
      }

      if (standardizedPhone.length < 9 || standardizedPhone.length > 15) {
        return NextResponse.json({ error: 'Nomor WhatsApp tidak valid!' }, { status: 400 });
      }

      // Check if the phone number is already verified by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: standardizedPhone,
          phoneVerified: true,
          NOT: { id: session.user.id }
        }
      });

      if (existingUser) {
        return NextResponse.json({ 
          error: 'Nomor WhatsApp ini sudah terdaftar dan terverifikasi pada akun lain. Silakan gunakan nomor lain.' 
        }, { status: 400 });
      }
    }

    // Clean up any existing phone verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: {
          startsWith: `verify-phone:${session.user.id}`
        }
      }
    });

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save token with 15 minutes expiry
    const identifier = standardizedPhone ? `verify-phone:${session.user.id}:${standardizedPhone}` : `verify-phone:${session.user.id}`;
    await prisma.verificationToken.create({
      data: {
        identifier,
        token: code,
        expires: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
      }
    });

    return NextResponse.json({ 
      success: true, 
      code, 
      phone: standardizedPhone 
    });

  } catch (error) {
    console.error('Error requesting phone verification:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
