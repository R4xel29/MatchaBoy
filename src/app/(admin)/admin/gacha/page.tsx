import AdminGachaClient from './AdminGachaClient';

export const revalidate = 0;

export default function AdminGachaPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Gacha Configuration</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Atur hadiah gacha, probabilitas, dan riwayat undian pelanggan.</p>
      </div>
      <AdminGachaClient />
    </div>
  );
}
