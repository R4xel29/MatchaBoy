import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';
import { invalidateProductCache } from '@/lib/redis-cache';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { ids, action, value } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No product IDs provided' }, { status: 400 });
        }

        if (action === 'delete') {
            let deletedCount = 0;
            let archivedCount = 0;

            for (const id of ids) {
                // Check if product is referenced in order items
                const orderItemCount = await prisma.orderItem.count({
                    where: { productId: id }
                });

                if (orderItemCount > 0) {
                    // Soft-delete
                    await prisma.product.update({
                        where: { id },
                        data: { badge: 'archived' }
                    });
                    archivedCount++;
                } else {
                    await prisma.product.delete({ where: { id } });
                    deletedCount++;
                }
            }

            await logAdminAction({
                userId: session.user.id,
                action: 'DELETE',
                entity: 'PRODUCT',
                details: `Bulk action: Deleted ${deletedCount} products permanently, archived ${archivedCount} products with order history.`
            });

            await invalidateProductCache();

            return NextResponse.json({ 
                success: true, 
                message: `Berhasil memproses bulk delete. ${deletedCount} produk dihapus permanen, ${archivedCount} produk diarsipkan karena memiliki riwayat transaksi.`
            });
        }

        if (action === 'availability') {
            const badge = value === 'sold-out' ? 'sold-out' : null;
            await prisma.product.updateMany({
                where: { id: { in: ids } },
                data: { badge }
            });

            await logAdminAction({
                userId: session.user.id,
                action: 'UPDATE',
                entity: 'PRODUCT',
                details: `Bulk action: Mengubah status ketersediaan ${ids.length} produk menjadi ${value || 'Available'}`
            });

            await invalidateProductCache();

            return NextResponse.json({ success: true, message: 'Status ketersediaan berhasil diperbarui' });
        }

        if (action === 'category') {
            if (!value) {
                return NextResponse.json({ error: 'Category ID is required for moving' }, { status: 400 });
            }

            await prisma.product.updateMany({
                where: { id: { in: ids } },
                data: { categoryId: value }
            });

            await logAdminAction({
                userId: session.user.id,
                action: 'UPDATE',
                entity: 'PRODUCT',
                details: `Bulk action: Memindahkan ${ids.length} produk ke kategori ${value}`
            });

            await invalidateProductCache();

            return NextResponse.json({ success: true, message: 'Kategori produk berhasil diperbarui' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('[PRODUCTS BULK ACTION ERROR]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
