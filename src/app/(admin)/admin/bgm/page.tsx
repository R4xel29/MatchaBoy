import { prisma } from '@/lib/prisma';
import AdminBgmClient from './AdminBgmClient';

export const revalidate = 0;

export default async function AdminBgmPage() {
  const songs = await prisma.bgmSong.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Matcha Vibes BGM</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola lagu background musik lofi untuk diputar di storefront pelanggan</p>
      </div>
      <AdminBgmClient initialSongs={songs} />
    </div>
  );
}
