import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [paymentSettings, storeSettings, banners] = await Promise.all([
      prisma.paymentSettings.findFirst({
        select: {
          qrisImage: true,
          qrisLabel: true,
          qrisNmid: true,
          qrisEnabled: true,
        },
      }),
      prisma.storeSettings.findFirst({
        select: {
          storeName: true,
          storeAddress: true,
        },
      }),
      prisma.heroBanner.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      qrisImage: paymentSettings?.qrisImage || null,
      qrisLabel: paymentSettings?.qrisLabel || 'QRIS',
      qrisNmid: paymentSettings?.qrisNmid || '',
      storeName: storeSettings?.storeName || 'Matchaboy',
      storeAddress: storeSettings?.storeAddress || '',
      banners: banners.map((b) => ({
        id: b.id,
        image: b.image,
        headline: b.headline,
        subheadline: b.subheadline,
      })),
    });
  } catch (error) {
    console.error('Display settings API error:', error);
    return NextResponse.json({ error: 'Failed to fetch display settings' }, { status: 500 });
  }
}
