import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public API — returns available payment methods for checkout
export async function GET() {
  let settings = await prisma.paymentSettings.findFirst();
  
  if (!settings) {
    settings = await prisma.paymentSettings.create({ data: {} });
  }

  const banks = settings.transferEnabled
    ? await prisma.bankAccount.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          bankName: true,
          bankLogo: true,
          accountNumber: true,
          accountName: true,
        },
      })
    : [];

  return NextResponse.json({
    cod: {
      enabled: settings.codEnabled,
      whatsapp: settings.codWhatsApp,
    },
    qris: {
      enabled: settings.qrisEnabled,
      image: settings.qrisImage,
      logo: settings.qrisLogo,
      label: settings.qrisLabel,
    },
    transfer: {
      enabled: settings.transferEnabled,
      banks,
    },
    doku: {
      enabled: settings.dokuEnabled,
      clientId: settings.dokuClientId,
      sandbox: settings.dokuSandbox,
    },
  });
}
