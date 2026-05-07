import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    
    if (!phone || phone.length < 8) {
      return NextResponse.json({ available: false, message: 'Nomor HP tidak valid' });
    }

    // Normalize phone
    let normalized = phone.replace(/\s+/g, '');
    if (normalized.startsWith('+62')) normalized = '0' + normalized.slice(3);
    else if (normalized.startsWith('62')) normalized = '0' + normalized.slice(2);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalized },
          { phone: phone },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ 
        available: false, 
        message: 'Nomor HP sudah terdaftar di akun lain' 
      });
    }

    return NextResponse.json({ available: true });
  } catch {
    return NextResponse.json({ available: false, message: 'Terjadi kesalahan' }, { status: 500 });
  }
}
