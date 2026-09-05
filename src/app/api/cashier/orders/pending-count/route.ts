import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export async function GET() {
  const [count, settings] = await Promise.all([
    prisma.order.count({
      where: {
        status: { in: ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'ASSIGNED'] },
      },
    }),
    prisma.storeSettings.findFirst({
      select: { alarmSoundUrl: true, alarmVolumeBoost: true },
    }),
  ]);

  return NextResponse.json({
    count,
    alarmSoundUrl: settings?.alarmSoundUrl ?? '',
    alarmVolumeBoost: settings?.alarmVolumeBoost ?? 350,
  });
}
