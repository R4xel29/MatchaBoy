import AdminSubscriptionsClient from './AdminSubscriptionsClient';

export const revalidate = 0;

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Subscription Club</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola langganan member, perpanjang, jeda, atau batalkan berlangganan.</p>
      </div>
      <AdminSubscriptionsClient />
    </div>
  );
}
