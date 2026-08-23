import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/admin/products/export — Export all products as CSV
export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const products = await prisma.product.findMany({
      include: {
        category: true,
        productIngredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });

    const rows: string[][] = [
      [
        'ID',
        'Nama Produk',
        'Kategori',
        'Tipe Produk',
        'Harga Jual (Rp)',
        'Harga Promo (Rp)',
        'Status Stok / Badge',
        'Total HPP (Rp)',
        'Gross Margin (%)',
        'Kelengkapan Resep',
        'Jumlah Bahan Baku',
      ],
    ];

    const escapeCsv = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    for (const p of products) {
      let productType = 'Minuman';
      let promoPrice: number | string = '-';

      if (p.modifiers) {
        try {
          const parsed = JSON.parse(p.modifiers);
          if (parsed.productType) {
            productType = parsed.productType === 'makanan' ? 'Makanan' : 'Minuman';
          } else if (parsed.isBundle) {
            productType = 'Paket Combo';
          }

          if (parsed.promo?.isActive && parsed.promo?.promoPrice) {
            promoPrice = parsed.promo.promoPrice;
          }
        } catch {}
      }

      // Calculate HPP
      let totalHpp = 0;
      const hasRecipe = p.productIngredients.length > 0;
      if (hasRecipe) {
        totalHpp = p.productIngredients.reduce((sum, pi) => {
          return sum + (pi.quantity * (pi.ingredient?.costPerUnit || 0));
        }, 0);
      }

      const grossMarginPct = p.price > 0 && totalHpp > 0
        ? Math.round(((p.price - totalHpp) / p.price) * 100)
        : '-';

      const statusBadge = p.badge === 'archived'
        ? 'Diarsipkan'
        : p.badge === 'sold-out'
        ? 'Habis (Sold Out)'
        : p.badge === 'best-seller'
        ? 'Best Seller'
        : p.badge === 'new'
        ? 'Menu Baru'
        : 'Tersedia';

      rows.push([
        escapeCsv(p.id),
        escapeCsv(p.name),
        escapeCsv(p.category.name),
        escapeCsv(productType),
        escapeCsv(p.price),
        escapeCsv(promoPrice),
        escapeCsv(statusBadge),
        escapeCsv(hasRecipe ? Math.round(totalHpp) : '-'),
        escapeCsv(grossMarginPct !== '-' ? `${grossMarginPct}%` : '-'),
        escapeCsv(hasRecipe ? 'Lengkap' : 'Belum Ada Resep'),
        escapeCsv(p.productIngredients.length),
      ]);
    }

    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
    const now = new Date().toISOString().split('T')[0];

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="produk-arum-seduh-${now}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting products CSV:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
