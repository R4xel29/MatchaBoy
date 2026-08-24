import { prisma } from '@/lib/prisma';
import AdminTablesClient from './AdminTablesClient';

export const revalidate = 0;

export default async function AdminTablesPage() {
  const [tables, floorElements] = await Promise.all([
    prisma.diningTable.findMany({
      orderBy: { number: 'asc' },
    }),
    prisma.floorElement.findMany({
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Table Floor Plan Designer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage dining tables, design the floor plan layout, add room markers (doors, tv, shelves), and generate QR Codes</p>
      </div>
      <AdminTablesClient initialTables={tables} initialElements={floorElements} />
    </div>
  );
}
