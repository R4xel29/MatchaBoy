import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'CASHIER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, amount, category = 'DAILY_OPS', notes } = body;

    const parsedAmount = typeof amount === 'string'
      ? parseInt(amount.replace(/[^0-9]/g, '')) || 0
      : parseInt(amount) || 0;

    if (!name || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Nama dan jumlah pengeluaran wajib diisi' }, { status: 400 });
    }

    // Check active shift
    const activeShift = await prisma.cashierShift.findFirst({
      where: {
        cashierId: session.user.id,
        closedAt: null,
      },
    });

    const cashierName = session.user.name || 'Kasir';
    const noteText = notes
      ? `${notes} [Kas Laci/Tunai] [Kasir: ${cashierName}${activeShift ? ` - Shift #${activeShift.id.slice(-4)}` : ''}]`
      : `Pengeluaran Kas Laci POS [Kasir: ${cashierName}${activeShift ? ` - Shift #${activeShift.id.slice(-4)}` : ''}]`;

    const expense = await prisma.expense.create({
      data: {
        name,
        amount: parsedAmount,
        category: category || 'DAILY_OPS',
        date: new Date(),
        notes: noteText,
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Error creating petty cash expense:', error);
    return NextResponse.json({ error: 'Failed to record petty cash' }, { status: 500 });
  }
}
