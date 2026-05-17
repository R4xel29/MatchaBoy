import { prisma } from '@/lib/prisma';
import ExpensesClient from './ExpensesClient';

export const revalidate = 0;

export default async function AdminExpensesPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: { date: 'desc' },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Expenses</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage operational costs, rent, utilities, and other expenses</p>
      </div>
      <ExpensesClient initialExpenses={expenses} />
    </div>
  );
}
