import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';
import { invalidateCategoryCache } from '@/lib/redis-cache';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Tidak ada ID kategori yang dipilih' }, { status: 400 });
    }

    if (action === 'delete') {
      let deletedCount = 0;
      let skippedCount = 0;
      const skippedNames: string[] = [];

      for (const id of ids) {
        // Cek apakah kategori masih memiliki produk terdaftar
        const category = await prisma.category.findUnique({
          where: { id },
          select: { name: true, _count: { select: { products: true } } },
        });

        if (!category) continue;

        if (category._count.products > 0) {
          skippedCount++;
          skippedNames.push(`${category.name} (${category._count.products} menu)`);
        } else {
          await prisma.category.delete({ where: { id } });
          deletedCount++;
        }
      }

      await logAdminAction({
        userId: session.user.id,
        action: 'DELETE',
        entity: 'CATEGORY',
        details: `Bulk action: Menghapus ${deletedCount} kategori kosong. Dilewati: ${skippedCount} kategori (${skippedNames.join(', ')}).`,
      });

      await invalidateCategoryCache();

      let message = `Berhasil menghapus ${deletedCount} kategori kosong.`;
      if (skippedCount > 0) {
        message += ` ${skippedCount} kategori dilewati karena masih memiliki menu terdaftar (${skippedNames.slice(0, 3).join(', ')}${skippedNames.length > 3 ? '...' : ''}).`;
      }

      return NextResponse.json({
        success: true,
        deletedCount,
        skippedCount,
        message,
      });
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error) {
    console.error('Error handling bulk category action:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
