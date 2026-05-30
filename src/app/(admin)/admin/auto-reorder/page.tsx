import AdminAutoReorderClient from './AdminAutoReorderClient';

export const revalidate = 0;

export default async function AdminAutoReorderPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Auto-Reorder Monitoring</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pantau dan kelola semua jadwal auto-reorder pelanggan.</p>
      </div>
      <AdminAutoReorderClient />
    </div>
  );
}
