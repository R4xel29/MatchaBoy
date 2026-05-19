import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET — fetch payment settings (singleton)
export async function GET() {
  let settings = await prisma.paymentSettings.findFirst();
  
  if (!settings) {
    settings = await prisma.paymentSettings.create({ data: {} });
  }

  const banks = await prisma.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({ settings, banks });
}

// PUT — update payment settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    
    let settings = await prisma.paymentSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.paymentSettings.create({ data: body });
    } else {
      settings = await prisma.paymentSettings.update({
        where: { id: settings.id },
        data: {
          codEnabled: body.codEnabled,
          codWhatsApp: body.codWhatsApp,
          qrisEnabled: body.qrisEnabled,
          qrisImage: body.qrisImage,
          qrisLogo: body.qrisLogo,
          qrisLabel: body.qrisLabel,
          transferEnabled: body.transferEnabled,
          dokuEnabled: body.dokuEnabled,
          dokuClientId: body.dokuClientId,
          dokuSharedKey: body.dokuSharedKey,
          dokuSandbox: body.dokuSandbox,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
