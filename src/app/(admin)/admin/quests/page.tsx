import AdminQuestsClient from './AdminQuestsClient';

export const revalidate = 0;

export default function AdminQuestsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Quest Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola quest dan tantangan gamifikasi untuk pelanggan.</p>
      </div>
      <AdminQuestsClient />
    </div>
  );
}
