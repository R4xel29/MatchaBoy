import AdminGroupOrdersClient from './AdminGroupOrdersClient';

export const revalidate = 0;

export default async function AdminGroupOrdersPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Group Order Monitoring</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pantau semua group order dan kelola statusnya.</p>
      </div>
      <AdminGroupOrdersClient />
    </div>
  );
}
