import AdminWalletClient from './AdminWalletClient';

export const revalidate = 0;

export default function AdminWalletPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Wallet Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola saldo wallet pelanggan, lihat riwayat transaksi, dan lakukan penyesuaian manual.</p>
      </div>
      <AdminWalletClient />
    </div>
  );
}
