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
    wallet: {
      enabled: settings.walletTopUpEnabled ?? true,
    },
    cod: {
      enabled: settings.codEnabled,
      whatsapp: settings.codWhatsApp,
      whatsApp: settings.codWhatsApp,
    },
    qris: {
      enabled: settings.qrisEnabled,
      image: null,
      logo: null,
      label: settings.qrisLabel,
    },
    transfer: {
      enabled: Boolean(settings.transferEnabled && banks.length > 0),
      banks,
    },
    doku: {
      enabled: Boolean(settings.dokuEnabled),
      clientId: settings.dokuClientId,
      sandbox: settings.dokuSandbox,
    },
  });
}
