import { ReactNode } from 'react';
import { prisma } from '@/lib/prisma';
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const storeSettings = await prisma.storeSettings.findFirst({
    select: {
      alarmSoundUrl: true,
      alarmVolumeBoost: true,
      pickupAlarmLeadTime: true,
    },
  });

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

