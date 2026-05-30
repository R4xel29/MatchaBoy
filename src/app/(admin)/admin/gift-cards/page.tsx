import AdminGiftCardsClient from './AdminGiftCardsClient';

export const revalidate = 0;

export default function AdminGiftCardsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Gift Card Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Buat dan kelola gift card, lacak status klaim dan penggunaan.</p>
      </div>
      <AdminGiftCardsClient />
    </div>
  );
}
