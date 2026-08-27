import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ReceiptSettingsClient from './ReceiptSettingsClient';

export default async function ReceiptSettingsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  let settings = await prisma.receiptSettings.findFirst();

  if (!settings) {
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
        printKitchenTicket: false,
      },
    });
  }

  return (
    <ReceiptSettingsClient initialSettings={JSON.parse(JSON.stringify(settings))} />
  );
}
