import AdminWalletClient from './AdminWalletClient';

export const revalidate = 0;

export default function AdminWalletPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">
          Manajemen Arus Pay
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Verifikasi top up pelanggan (QRIS 15 menit, Bukti Transfer Bank, & Kode Tiket Kasir Booth), pantau skema bonus perdana, dan kelola saldo Arus Pay.
        </p>
      </div>
      <AdminWalletClient />
    </div>
  );
}
