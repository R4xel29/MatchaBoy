import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ available: false, error: 'Nomor WhatsApp wajib diisi' }, { status: 400 });
    }

    // Standardize phone number format
    let standardizedPhone = phone.replace(/[^0-9]/g, '');
    if (standardizedPhone.startsWith('08')) {
      standardizedPhone = '62' + standardizedPhone.substring(1);
    } else if (standardizedPhone.startsWith('8')) {
      standardizedPhone = '62' + standardizedPhone;
    }

    // Check if any user already has this phone number verified
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: standardizedPhone,
        phoneVerified: true
      }
    });

    return NextResponse.json({
      available: !existingUser
    });

  } catch (error) {
    console.error('Error checking phone availability:', error);
    return NextResponse.json({ available: false, error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
