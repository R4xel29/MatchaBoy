import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya Admin Utama yang berwenang melakukan bulk action SOP.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids, action, payload } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Tidak ada butir SOP yang dipilih' }, { status: 400 });
    }

    const validActions = [
      'ACTIVATE',
      'DEACTIVATE',
      'SET_PHOTO_REQUIRED',
      'SET_PHOTO_OPTIONAL',
      'MOVE_CATEGORY',
      'DELETE',
    ];

    if (!action || !validActions.includes(action)) {
      return NextResponse.json({ error: 'Aksi massal tidak valid' }, { status: 400 });
    }

    let message = '';

    switch (action) {
      case 'ACTIVATE': {
        await prisma.sopTemplateItem.updateMany({
          where: { id: { in: ids } },
          data: { isActive: true },
        });
        message = `Berhasil mengaktifkan ${ids.length} butir SOP.`;
        break;
      }
      case 'DEACTIVATE': {
        await prisma.sopTemplateItem.updateMany({
          where: { id: { in: ids } },
          data: { isActive: false },
        });
        message = `Berhasil menonaktifkan ${ids.length} butir SOP.`;
        break;
      }
      case 'SET_PHOTO_REQUIRED': {
        await prisma.sopTemplateItem.updateMany({
          where: { id: { in: ids } },
          data: { isPhotoRequired: true },
        });
        message = `Berhasil mewajibkan foto bukti untuk ${ids.length} butir SOP.`;
        break;
      }
      case 'SET_PHOTO_OPTIONAL': {
        await prisma.sopTemplateItem.updateMany({
          where: { id: { in: ids } },
          data: { isPhotoRequired: false },
        });
        message = `Berhasil mengubah foto bukti menjadi opsional untuk ${ids.length} butir SOP.`;
        break;
      }
      case 'MOVE_CATEGORY': {
        const targetCategory = payload?.category;
        if (!['OPENING', 'CLOSING', 'ROUTINE'].includes(targetCategory)) {
          return NextResponse.json({ error: 'Kategori tujuan tidak valid' }, { status: 400 });
        }
        await prisma.sopTemplateItem.updateMany({
          where: { id: { in: ids } },
          data: { category: targetCategory },
        });
        const catLabels: Record<string, string> = {
          OPENING: 'Buka Toko',
          CLOSING: 'Tutup Toko',
          ROUTINE: 'Kebersihan & Rutin',
        };
        message = `Berhasil memindahkan ${ids.length} butir SOP ke kategori ${catLabels[targetCategory] || targetCategory}.`;
        break;
      }
      case 'DELETE': {
        await prisma.sopTemplateItem.deleteMany({
          where: { id: { in: ids } },
        });
        message = `Berhasil menghapus ${ids.length} butir SOP secara massal.`;
        break;
      }
    }

    // Catat log aktivitas admin
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'BULK_UPDATE',
        entity: 'SOP_TEMPLATE',
        details: JSON.stringify({
          action,
          affectedCount: ids.length,
          itemIds: ids,
          payload: payload || null,
        }),
      },
    });

    // Ambil daftar template terbaru
    const updatedTemplates = await prisma.sopTemplateItem.findMany({
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      message,
      items: updatedTemplates,
    });
  } catch (error: any) {
    console.error('[SOP_BULK_ACTION_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Gagal mengeksekusi aksi massal' }, { status: 500 });
  }
}
