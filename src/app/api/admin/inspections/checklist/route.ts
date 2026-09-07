import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET: Ambil status checklist SOP hari ini dan riwayat checklist terakhir
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [todayLogs, historyLogs] = await Promise.all([
      prisma.activityLog.findMany({
        where: {
          entity: { in: ['CHECKLIST_OPENING', 'CHECKLIST_CLOSING'] },
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.findMany({
        where: {
          entity: { in: ['CHECKLIST_OPENING', 'CHECKLIST_CLOSING'] },
        },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const todayOpening = todayLogs.find((l) => l.entity === 'CHECKLIST_OPENING');
    const todayClosing = todayLogs.find((l) => l.entity === 'CHECKLIST_CLOSING');

    return NextResponse.json({
      today: {
        openingSubmitted: !!todayOpening,
        closingSubmitted: !!todayClosing,
        openingLog: todayOpening || null,
        closingLog: todayClosing || null,
      },
      history: historyLogs,
    });
  } catch (error) {
    console.error('[CHECKLIST_GET_ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil data checklist' }, { status: 500 });
  }
}

// POST: Kirim pengisian checklist SOP harian oleh staf
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, items, notes } = body;

    if (!type || (type !== 'OPENING' && type !== 'CLOSING')) {
      return NextResponse.json({ error: 'Tipe checklist wajib OPENING atau CLOSING' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Daftar item checklist wajib diisi' }, { status: 400 });
    }

    const totalItems = items.length;
    const completedItems = items.filter((i: any) => i.checked).length;
    const staffName = session.user.name || 'Staf Operasional';

    const payloadDetails = JSON.stringify({
      shiftType: type,
      staffName,
      totalItems,
      completedItems,
      allChecked: completedItems === totalItems,
      notes: notes?.trim() || '',
      items: items.map((i: any) => ({
        id: i.id,
        label: i.label,
        checked: Boolean(i.checked),
      })),
      submittedAt: new Date().toISOString(),
    });

    const newLog = await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'SUBMIT',
        entity: type === 'OPENING' ? 'CHECKLIST_OPENING' : 'CHECKLIST_CLOSING',
        details: payloadDetails,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Laporan checklist ${type === 'OPENING' ? 'Buka Toko (Opening)' : 'Tutup Toko (Closing)'} berhasil dicatat`,
      log: newLog,
    });
  } catch (error) {
    console.error('[CHECKLIST_POST_ERROR]', error);
    return NextResponse.json({ error: 'Gagal menyimpan checklist' }, { status: 500 });
  }
}
