import { prisma } from '@/lib/prisma';
import AdminBirthdayClient from './AdminBirthdayClient';

export const revalidate = 0;

export default async function AdminBirthdayPage() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Fetch all users with birthDate
  const usersWithBirthday = await prisma.user.findMany({
    where: {
      birthDate: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      birthDate: true,
    },
    orderBy: { birthDate: 'asc' },
  });

  // Calculate upcoming birthdays (next 7 days)
  const upcomingBirthdays = usersWithBirthday
    .map(u => {
      if (!u.birthDate) return null;
      const bday = new Date(u.birthDate);
      const thisYearBday = new Date(currentYear, bday.getMonth(), bday.getDate());
      if (thisYearBday < now) {
        thisYearBday.setFullYear(currentYear + 1);
      }
      const daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const age = currentYear - bday.getFullYear();
      return { ...u, birthDate: u.birthDate.toISOString(), nextBirthday: thisYearBday.toISOString(), daysUntil, age };
    })
    .filter((u): u is NonNullable<typeof u> => u !== null && u.daysUntil >= 0 && u.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Get birthdays this month
  const birthdaysThisMonth = usersWithBirthday
    .filter(u => u.birthDate && new Date(u.birthDate).getMonth() === currentMonth)
    .map(u => ({
      ...u,
      birthDate: u.birthDate!.toISOString(),
      dayOfMonth: new Date(u.birthDate!).getDate(),
    }));

  // Get recent birthday vouchers
  const birthdayVouchers = await prisma.voucher.findMany({
    where: {
      description: { contains: 'Birthday', mode: 'insensitive' },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const totalRewardsSent = birthdayVouchers.length;
  const avgVoucherValue = totalRewardsSent > 0
    ? Math.round(birthdayVouchers.reduce((sum, v) => sum + v.discountAmount, 0) / totalRewardsSent)
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Birthday Program</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola program ulang tahun pelanggan dan kirim reward otomatis.</p>
      </div>
      <AdminBirthdayClient
        initialUpcomingBirthdays={upcomingBirthdays}
        initialBirthdaysThisMonth={birthdaysThisMonth}
        initialBirthdayVouchers={birthdayVouchers.map(v => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
          usedAt: v.usedAt?.toISOString() || null,
          expiresAt: v.expiresAt?.toISOString() || null,
        }))}
        initialStats={{
          totalBirthdaysThisMonth: birthdaysThisMonth.length,
          totalRewardsSent,
          avgVoucherValue,
          totalUsersWithBirthday: usersWithBirthday.length,
        }}
      />
    </div>
  );
}
