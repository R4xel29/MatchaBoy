import AdminNotifyMeClient from './AdminNotifyMeClient';

export const revalidate = 0;

export default async function AdminNotifyMePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Notify Me / Stock Alerts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Lihat daftar produk yang dinantikan pelanggan dan kelola notifikasi restock.</p>
      </div>
      <AdminNotifyMeClient />
    </div>
  );
}
