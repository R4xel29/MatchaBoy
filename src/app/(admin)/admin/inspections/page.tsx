import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import InspectionsClient from './InspectionsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminInspectionsPage() {
  const session = await auth();
  const userRole = session?.user?.role || 'CASHIER';
  const userName = session?.user?.name || 'Staf';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Fetch data secara paralel
  const [
    shifts,
    ingredients,
    recentMovements,
    recentLogs,
    todayChecklistLogs,
  ] = await Promise.all([
    prisma.cashierShift.findMany({
      include: {
        cashier: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { openedAt: 'desc' },
      take: 40,
    }),
    prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.stockMovement.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: {
        ingredient: {
          select: { name: true, unit: true },
        },
      },
    }),
    prisma.activityLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        entity: { in: ['CHECKLIST_OPENING', 'CHECKLIST_CLOSING'] },
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        user: {
          select: { name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Enrich recent shifts dengan rincian pembayaran & kas kecil
  const enrichedShifts = await Promise.all(
    shifts.slice(0, 15).map(async (shift) => {
      const endTime = shift.closedAt || new Date();
      const [shiftOrders, shiftExpenses] = await Promise.all([
        prisma.order.findMany({
          where: {
            createdAt: { gte: shift.openedAt, lte: endTime },
            status: { in: ['COMPLETED', 'DELIVERED'] },
          },
          select: { total: true, paymentMethod: true },
        }),
        prisma.expense.findMany({
          where: {
            date: { gte: shift.openedAt, lte: endTime },
            notes: { contains: '[Kas Laci' },
          },
          select: { amount: true },
        }),
      ]);

      let cashIn = 0;
      let qrisIn = 0;
      shiftOrders.forEach((o) => {
        const pm = (o.paymentMethod || '').toUpperCase();
        if (pm === 'CASH' || pm === 'TUNAI' || pm === 'COD') {
          cashIn += o.total;
        } else if (pm.includes('QRIS')) {
          qrisIn += o.total;
        }
      });

      const cashOut = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
      const expectedCash = shift.openingCash + cashIn - cashOut;
      const actualCash = shift.closingCash ?? null;
      const variance = actualCash !== null ? actualCash - expectedCash : null;

      return {
        ...shift,
        cashIn,
        qrisIn,
        cashOut,
        expectedCash,
        actualCash,
        variance,
      };
    })
  );

  const finalShifts = [
    ...enrichedShifts,
    ...shifts.slice(15).map((s) => ({
      ...s,
      cashIn: 0,
      qrisIn: 0,
      cashOut: 0,
      expectedCash: s.openingCash,
      actualCash: s.closingCash,
      variance: null,
    })),
  ];

  return (
    <div className="space-y-6">
      <InspectionsClient
        userRole={userRole}
        userName={userName}
        initialShifts={finalShifts}
        initialIngredients={ingredients}
        initialMovements={recentMovements}
        initialLogs={recentLogs}
        initialTodayChecklists={todayChecklistLogs}
      />
    </div>
  );
}
