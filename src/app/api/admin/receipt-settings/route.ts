import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/receipt-settings - Ambil preferensi struk thermal
export async function GET() {
  try {
    let settings = await prisma.receiptSettings.findFirst();

    if (!settings) {
      // Buat default settings untuk Arum Seduh jika belum ada
      settings = await prisma.receiptSettings.create({
        data: {
          storeName: 'Arum Seduh',
          tagline: 'Kopi & Seduhan Istimewa',
          address: 'Jl. Sukajadi No. 88, Bandung',
          phone: '0812-3456-7890',
          headerNotes: '',
          footerNotes: 'Terima kasih atas kunjungan Anda!\nSelamat menikmati seduhan kami.',
          showLogo: true,
          logoUrl: null,
          showWifi: true,
          wifiSsid: 'ArumSeduh_Free',
          wifiPassword: 'seduhkopi123',
          showSocial: true,
          instagram: '@arumseduh.id',
          tiktok: '@arumseduh',
          showOrderQr: false,
          paperWidth: '58mm',
          autoPrintOnCheckout: false,
          autoPrintIncomingOrders: true,
          printKitchenTicket: false,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching receipt settings:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil pengaturan struk' },
      { status: 500 }
    );
  }
}

// POST /api/admin/receipt-settings - Simpan preferensi struk thermal
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const payload = {
      storeName: body.storeName?.trim() || 'Arum Seduh',
      tagline: body.tagline?.trim() || '',
      address: body.address?.trim() || '',
      phone: body.phone?.trim() || '',
      headerNotes: body.headerNotes?.trim() || '',
      footerNotes: body.footerNotes?.trim() || '',
      showLogo: Boolean(body.showLogo),
      logoUrl: body.logoUrl || null,
      showWifi: Boolean(body.showWifi),
      wifiSsid: body.wifiSsid?.trim() || '',
      wifiPassword: body.wifiPassword?.trim() || '',
      showSocial: Boolean(body.showSocial),
      instagram: body.instagram?.trim() || '',
      tiktok: body.tiktok?.trim() || '',
      showOrderQr: Boolean(body.showOrderQr),
      paperWidth: body.paperWidth === '80mm' ? '80mm' : '58mm',
      autoPrintOnCheckout: Boolean(body.autoPrintOnCheckout),
      autoPrintIncomingOrders: Boolean(body.autoPrintIncomingOrders),
      printKitchenTicket: Boolean(body.printKitchenTicket),
    };

    let settings = await prisma.receiptSettings.findFirst();

    if (settings) {
      settings = await prisma.receiptSettings.update({
        where: { id: settings.id },
        data: payload,
      });
    } else {
      settings = await prisma.receiptSettings.create({
        data: payload,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Pengaturan struk berhasil disimpan',
      settings,
    });
  } catch (error) {
    console.error('Error saving receipt settings:', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan pengaturan struk' },
      { status: 500 }
    );
  }
}
