import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getOrSeedSopTemplates } from '@/lib/sop-defaults';

// GET: Ambil daftar template SOP (dengan auto-seed bila belum ada)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'ADMIN';
    const items = await getOrSeedSopTemplates(isAdmin);

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('[SOP_TEMPLATES_GET_ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil data template SOP' }, { status: 500 });
  }
}

// POST: Tambah butir SOP baru (Hanya Admin Utama)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin Utama yang dapat mengatur SOP.' }, { status: 403 });
    }

    const body = await req.json();
    const { category, jobdeskCode, title, description, isPhotoRequired, sortOrder } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Judul / Butir SOP wajib diisi' }, { status: 400 });
    }

    const validCategory = ['OPENING', 'CLOSING', 'ROUTINE'].includes(category) ? category : 'ROUTINE';

    // Cari sortOrder tertinggi jika tidak ditentukan
    let order = typeof sortOrder === 'number' ? sortOrder : 0;
    if (order === 0) {
      const highest = await prisma.sopTemplateItem.findFirst({
        where: { category: validCategory },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      order = (highest?.sortOrder || 0) + 1;
    }

    const newItem = await prisma.sopTemplateItem.create({
      data: {
        category: validCategory,
        jobdeskCode: jobdeskCode?.trim() ? jobdeskCode.trim().toUpperCase() : 'GENERAL',
        title: title.trim(),
        description: description?.trim() || null,
        isPhotoRequired: Boolean(isPhotoRequired),
        sortOrder: order,
        isActive: true,
      },
    });

    // Catat ke activity log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'SOP_TEMPLATE',
        details: JSON.stringify({
          itemId: newItem.id,
          title: newItem.title,
          category: newItem.category,
          jobdeskCode: newItem.jobdeskCode,
        }),
      },
    });

    return NextResponse.json({ success: true, item: newItem, message: 'Butir SOP baru berhasil ditambahkan' });
  } catch (error: any) {
    console.error('[SOP_TEMPLATES_POST_ERROR]', error);
    return NextResponse.json({ error: 'Gagal menambahkan butir SOP' }, { status: 500 });
  }
}

// PUT: Perbarui butir SOP (Hanya Admin Utama)
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin Utama yang dapat mengatur SOP.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, category, jobdeskCode, title, description, isPhotoRequired, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID butir SOP wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.sopTemplateItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Butir SOP tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.sopTemplateItem.update({
      where: { id },
      data: {
        category: category !== undefined ? category : existing.category,
        jobdeskCode: jobdeskCode !== undefined ? (jobdeskCode?.trim() ? jobdeskCode.trim().toUpperCase() : 'GENERAL') : existing.jobdeskCode,
        title: title !== undefined ? title.trim() : existing.title,
        description: description !== undefined ? description?.trim() : existing.description,
        isPhotoRequired: isPhotoRequired !== undefined ? Boolean(isPhotoRequired) : existing.isPhotoRequired,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    // Catat log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'SOP_TEMPLATE',
        details: JSON.stringify({
          itemId: updated.id,
          title: updated.title,
          category: updated.category,
          isActive: updated.isActive,
        }),
      },
    });

    return NextResponse.json({ success: true, item: updated, message: 'Butir SOP berhasil diperbarui' });
  } catch (error: any) {
    console.error('[SOP_TEMPLATES_PUT_ERROR]', error);
    return NextResponse.json({ error: 'Gagal memperbarui butir SOP' }, { status: 500 });
  }
}

// DELETE: Hapus butir SOP (Hanya Admin Utama)
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin Utama yang dapat mengatur SOP.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID butir SOP wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.sopTemplateItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Butir SOP tidak ditemukan' }, { status: 404 });
    }

    await prisma.sopTemplateItem.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'SOP_TEMPLATE',
        details: JSON.stringify({
          itemId: id,
          title: existing.title,
          category: existing.category,
        }),
      },
    });

    return NextResponse.json({ success: true, message: 'Butir SOP berhasil dihapus' });
  } catch (error: any) {
    console.error('[SOP_TEMPLATES_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Gagal menghapus butir SOP' }, { status: 500 });
  }
}
