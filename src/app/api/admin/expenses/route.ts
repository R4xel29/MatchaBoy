import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'CASHIER') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'CASHIER') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { name, amount, category, date, notes } = body;

    const parsedAmount = typeof amount === 'string'
      ? parseInt(amount.replace(/[^0-9]/g, '')) || 0
      : parseInt(amount) || 0;

    const isCashier = session?.user?.role === 'CASHIER';
    let finalNotes = notes;
    if (isCashier) {
      const cashierTag = `[Dicatat oleh Staf: ${session?.user?.name || 'Kasir'}]`;
      finalNotes = notes ? `${notes} ${cashierTag}` : cashierTag;
    }

    const expense = await prisma.expense.create({
      data: {
        name,
        amount: parsedAmount,
        category: category || 'DAILY_OPS',
        date: date ? new Date(date) : new Date(),
        notes: finalNotes,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
