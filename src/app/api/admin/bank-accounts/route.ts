import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const ALLOWED_ROLES = ['ADMIN', 'CASHIER'];

async function verifyAuth() {
  const session = await auth();
  if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role || '')) {
    return false;
  }
  return true;
}

// GET — list all bank accounts
export async function GET() {
  if (!(await verifyAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const banks = await prisma.bankAccount.findMany({
    orderBy: { order: 'asc' },
  });
  return NextResponse.json({ banks });
}

// POST — create bank account
export async function POST(req: NextRequest) {
  if (!(await verifyAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const bank = await prisma.bankAccount.create({
      data: {
        bankName: body.bankName,
        bankLogo: body.bankLogo || null,
        accountNumber: body.accountNumber,
        accountName: body.accountName,
        isActive: body.isActive ?? true,
        order: body.order ?? 0,
      },
    });
    return NextResponse.json(bank);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT — update bank account
export async function PUT(req: NextRequest) {
  if (!(await verifyAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const bank = await prisma.bankAccount.update({
      where: { id: body.id },
      data: {
        bankName: body.bankName,
        bankLogo: body.bankLogo,
        accountNumber: body.accountNumber,
        accountName: body.accountName,
        isActive: body.isActive,
        order: body.order,
      },
    });
    return NextResponse.json(bank);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — delete bank account
export async function DELETE(req: NextRequest) {
  if (!(await verifyAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    await prisma.bankAccount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
