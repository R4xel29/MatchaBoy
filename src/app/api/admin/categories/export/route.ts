import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/admin/categories/export — Export all categories as CSV
export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    const rows: string[][] = [
      ['ID', 'Nama Kategori', 'Slug', 'Jumlah Menu Terdaftar', 'Status', 'Tanggal Dibuat'],
    ];

    const escapeCsv = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    for (const c of categories) {
      const productCount = c._count.products;
      const status = productCount > 0 ? 'Aktif (Ada Menu)' : 'Kosong (0 Menu)';
      const createdAt = c.createdAt ? new Date(c.createdAt).toLocaleDateString('id-ID') : '-';

      rows.push([
        escapeCsv(c.id),
        escapeCsv(c.name),
        escapeCsv(c.slug),
        escapeCsv(productCount),
        escapeCsv(status),
        escapeCsv(createdAt),
      ]);
    }

    const csvContent = rows.map((r) => r.join(',')).join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kategori-menu-arum-seduh-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting categories CSV:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
