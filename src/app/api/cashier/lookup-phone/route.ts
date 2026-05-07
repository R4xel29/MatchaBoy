import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone || phone.length < 8) {
    return NextResponse.json({ found: false });
  }

  // Normalize phone: strip leading 0, +62, 62
  let normalized = phone.replace(/\s+/g, '');
  if (normalized.startsWith('+62')) normalized = '0' + normalized.slice(3);
  else if (normalized.startsWith('62')) normalized = '0' + normalized.slice(2);

  // Search with multiple patterns
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: normalized },
        { phone: phone },
        { phone: { startsWith: normalized.slice(-8) } }, // Last 8 digits match
      ],
      role: 'CUSTOMER',
    },
    select: {
      id: true,
      name: true,
      phone: true,
      points: true,
      referralCode: true,
      email: true,
    },
  });

  if (!user) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    user: {
      id: user.id,
      name: user.name || user.email?.split('@')[0] || 'Pelanggan',
      phone: user.phone,
      points: user.points,
      referralCode: user.referralCode,
    },
  });
}
