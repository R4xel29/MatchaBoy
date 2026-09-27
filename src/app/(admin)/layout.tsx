import { ReactNode } from 'react';
import { prisma } from '@/lib/prisma';
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let storeSettings: {
    alarmSoundUrl: string | null;
    alarmVolumeBoost: number | null;
    pickupAlarmLeadTime: number | null;
  } | null = null;

  try {
    storeSettings = await prisma.storeSettings.findFirst({
      select: {
        alarmSoundUrl: true,
        alarmVolumeBoost: true,
        pickupAlarmLeadTime: true,
      },
    });
  } catch {
    storeSettings = null;
  }

  return (
    <AdminLayoutClient
      initialAlarmSoundUrl={storeSettings?.alarmSoundUrl || ''}
      initialAlarmVolumeBoost={storeSettings?.alarmVolumeBoost ?? 100}
      initialPickupAlarmLeadTime={storeSettings?.pickupAlarmLeadTime ?? 30}
    >
      {children}
    </AdminLayoutClient>
  );
}


