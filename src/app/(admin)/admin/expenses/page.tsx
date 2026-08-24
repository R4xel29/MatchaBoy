import { prisma } from '@/lib/prisma';
import ExpensesClient from './ExpensesClient';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminExpensesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const pageSize = 15;

  const [totalExpenses, totalAmountAgg, expenses] = await Promise.all([
    prisma.expense.count(),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.expense.findMany({
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(totalExpenses / pageSize) || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Expenses</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage operational costs, rent, utilities, and other expenses</p>
      </div>
      <ExpensesClient
        initialExpenses={expenses}
        currentPage={page}
        totalPages={totalPages}
        totalExpenses={totalExpenses}
        totalAmountSum={totalAmountAgg._sum.amount || 0}
        pageSize={pageSize}
      />
    </div>
  );
}
