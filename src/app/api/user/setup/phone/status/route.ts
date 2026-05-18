import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ verified: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phoneVerified: true, phone: true }
    });

    return NextResponse.json({
      verified: !!user?.phoneVerified,
      phone: user?.phone || null
    });

  } catch (error) {
    console.error('Error checking phone verification status:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
