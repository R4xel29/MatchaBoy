import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET: Ambil status checklist SOP hari ini, riwayat laporan, dan log aktivitas
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [todaySubmissions, historySubmissions, activityLogs] = await Promise.all([
      prisma.sopSubmission.findMany({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        include: {
          user: {
            select: { id: true, name: true, role: true, email: true },
          },
          reviewedBy: {
            select: { id: true, name: true, role: true },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sopSubmission.findMany({
        take: 30,
        include: {
          user: {
            select: { id: true, name: true, role: true, email: true },
          },
          reviewedBy: {
            select: { id: true, name: true, role: true },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.findMany({
        where: {
          entity: { in: ['CHECKLIST_OPENING', 'CHECKLIST_CLOSING', 'CHECKLIST_ROUTINE', 'SOP_SUBMISSION', 'SOP_VERIFIED'] },
        },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const todayOpening = todaySubmissions.find((s) => s.shiftType === 'OPENING');
    const todayClosing = todaySubmissions.find((s) => s.shiftType === 'CLOSING');
    const todayRoutine = todaySubmissions.find((s) => s.shiftType === 'ROUTINE');

    return NextResponse.json({
      success: true,
      today: {
        openingSubmitted: !!todayOpening,
        closingSubmitted: !!todayClosing,
        routineSubmitted: !!todayRoutine,
        openingSubmission: todayOpening || null,
        closingSubmission: todayClosing || null,
        routineSubmission: todayRoutine || null,
      },
      submissions: historySubmissions,
      activityLogs,
    });
  } catch (error: any) {
    console.error('[CHECKLIST_GET_ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil data checklist' }, { status: 500 });
  }
}

// POST: Kirim pengisian checklist SOP oleh karyawan / staf
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, items, notes, galleryImages } = body;

    const validTypes = ['OPENING', 'CLOSING', 'ROUTINE'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipe shift wajib OPENING, CLOSING, atau ROUTINE' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Daftar butir checklist wajib diisi' }, { status: 400 });
    }

    const galleryJson = Array.isArray(galleryImages) ? JSON.stringify(galleryImages) : null;
    const staffName = session.user.name || 'Staf Operasional';

    // Buat SopSubmission beserta item-itemnya
    const submission = await prisma.sopSubmission.create({
      data: {
        shiftType: type,
        userId: session.user.id,
        notes: notes?.trim() || null,
        galleryImages: galleryJson,
        status: 'PENDING_REVIEW',
        items: {
          create: items.map((item: any) => ({
            templateItemId: item.templateItemId || item.id || null,
            label: item.label || item.title || 'Butir SOP',
            isChecked: Boolean(item.checked),
            photoUrl: item.photoUrl || null,
            notes: item.notes?.trim() || null,
          })),
        },
      },
      include: {
        user: {
          select: { id: true, name: true, role: true, email: true },
        },
        items: true,
      },
    });

    const totalItems = items.length;
    const completedItems = items.filter((i: any) => i.checked).length;
    const photoCount = items.filter((i: any) => !!i.photoUrl).length + (Array.isArray(galleryImages) ? galleryImages.length : 0);

    // Backwards compatibility: catat juga ke ActivityLog
    const logDetails = JSON.stringify({
      submissionId: submission.id,
      shiftType: type,
      staffName,
      totalItems,
      completedItems,
      allChecked: completedItems === totalItems,
      photoCount,
      notes: notes?.trim() || '',
      submittedAt: new Date().toISOString(),
    });

    const entityName = type === 'OPENING' ? 'CHECKLIST_OPENING' : type === 'CLOSING' ? 'CHECKLIST_CLOSING' : 'CHECKLIST_ROUTINE';

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'SUBMIT',
        entity: entityName,
        details: logDetails,
      },
    });

    const shiftLabels: Record<string, string> = {
      OPENING: 'Buka Toko (Opening)',
      CLOSING: 'Tutup Toko (Closing)',
      ROUTINE: 'Kebersihan & Rutin Harian',
    };

    return NextResponse.json({
      success: true,
      message: `Laporan checklist ${shiftLabels[type] || type} berhasil dikirim dan siap ditinjau Admin!`,
      submission,
    });
  } catch (error: any) {
    console.error('[CHECKLIST_POST_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan checklist' }, { status: 500 });
  }
}

// PATCH: Verifikasi laporan SOP oleh Admin Utama
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya Admin Utama yang berwenang memverifikasi laporan SOP' }, { status: 403 });
    }

    const body = await req.json();
    const { submissionId, status, reviewNotes } = body;

    if (!submissionId) {
      return NextResponse.json({ error: 'ID laporan submission wajib disertakan' }, { status: 400 });
    }

    const validStatuses = ['VERIFIED', 'NEEDS_IMPROVEMENT'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status verifikasi harus VERIFIED atau NEEDS_IMPROVEMENT' }, { status: 400 });
    }

    const updated = await prisma.sopSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes?.trim() || null,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
        reviewedBy: {
          select: { id: true, name: true, role: true },
        },
        items: true,
      },
    });

    // Catat log verifikasi
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: status === 'VERIFIED' ? 'VERIFY' : 'REQUEST_REVISION',
        entity: 'SOP_VERIFIED',
        details: JSON.stringify({
          submissionId,
          shiftType: updated.shiftType,
          staffId: updated.userId,
          staffName: updated.user?.name,
          adminName: session.user.name,
          status,
          reviewNotes: reviewNotes?.trim() || '',
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: status === 'VERIFIED' ? 'Laporan SOP berhasil disahkan/diverifikasi!' : 'Catatan perbaikan telah disimpan.',
      submission: updated,
    });
  } catch (error: any) {
    console.error('[CHECKLIST_PATCH_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Gagal memverifikasi laporan SOP' }, { status: 500 });
  }
}
