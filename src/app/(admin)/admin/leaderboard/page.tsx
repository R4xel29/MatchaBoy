import AdminLeaderboardClient from './AdminLeaderboardClient';

export const revalidate = 0;

export default function AdminLeaderboardPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Lihat peringkat pelanggan terbaik di berbagai kategori.</p>
      </div>
      <AdminLeaderboardClient />
    </div>
  );
}
