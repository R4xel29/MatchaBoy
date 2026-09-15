import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getOrSeedSopJobdesks } from '@/lib/sop-defaults';

// GET: Ambil daftar peran Jobdesk
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'ADMIN';
    const jobdesks = await getOrSeedSopJobdesks(isAdmin);

    return NextResponse.json({ success: true, jobdesks });
  } catch (error: any) {
    console.error('[JOBDESKS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil daftar jobdesk' }, { status: 500 });
  }
}

// POST: Buat peran Jobdesk baru (Hanya Admin Utama)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin Utama.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, description, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama Jobdesk wajib diisi' }, { status: 400 });
    }

    const sanitizedCode = (code || name)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_');

    // Cek duplikasi code
    const existing = await prisma.sopJobdesk.findUnique({
      where: { code: sanitizedCode },
    });
    if (existing) {
      return NextResponse.json({ error: `Kode jobdesk '${sanitizedCode}' sudah terdaftar.` }, { status: 400 });
    }

    const highest = await prisma.sopJobdesk.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const order = typeof sortOrder === 'number' ? sortOrder : (highest?.sortOrder || 0) + 1;

    const newJobdesk = await prisma.sopJobdesk.create({
      data: {
        code: sanitizedCode,
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: order,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      jobdesk: newJobdesk,
      message: `Peran Jobdesk '${newJobdesk.name}' berhasil ditambahkan.`,
    });
  } catch (error: any) {
    console.error('[JOBDESKS_POST_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan jobdesk' }, { status: 500 });
  }
}

// PUT: Perbarui Jobdesk (Hanya Admin Utama)
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin Utama.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID jobdesk wajib disertakan' }, { status: 400 });
    }

    const updated = await prisma.sopJobdesk.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      jobdesk: updated,
      message: `Peran Jobdesk '${updated.name}' berhasil diperbarui.`,
    });
  } catch (error: any) {
    console.error('[JOBDESKS_PUT_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui jobdesk' }, { status: 500 });
  }
}

// DELETE: Hapus Jobdesk (Hanya Admin Utama)
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin Utama.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID jobdesk wajib disertakan' }, { status: 400 });
    }

    const jobdesk = await prisma.sopJobdesk.findUnique({ where: { id } });
    if (!jobdesk) {
      return NextResponse.json({ error: 'Jobdesk tidak ditemukan' }, { status: 404 });
    }

    if (jobdesk.code === 'GENERAL') {
      return NextResponse.json({ error: "Jobdesk 'Semua / Umum' adalah peran sistem bawaan dan tidak dapat dihapus." }, { status: 400 });
    }

    // Ubah butir SOP yang menggunakan jobdesk ini menjadi 'GENERAL'
    await prisma.sopTemplateItem.updateMany({
      where: { jobdeskCode: jobdesk.code },
      data: { jobdeskCode: 'GENERAL' },
    });

    await prisma.sopJobdesk.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Peran Jobdesk '${jobdesk.name}' berhasil dihapus. Butir SOP terkait dialihkan ke 'Umum'.`,
    });
  } catch (error: any) {
    console.error('[JOBDESKS_DELETE_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus jobdesk' }, { status: 500 });
  }
}
