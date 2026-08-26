import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, amount, paymentMethod, category, notes, date } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (amount !== undefined) dataToUpdate.amount = parseInt(amount, 10);
    if (paymentMethod !== undefined) dataToUpdate.paymentMethod = paymentMethod.toUpperCase() === 'QRIS' ? 'QRIS' : 'CASH';
    if (category !== undefined) dataToUpdate.category = category;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (date !== undefined) dataToUpdate.date = new Date(date);

    const updated = await prisma.capitalInjection.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error updating capital injection:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.capitalInjection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Capital injection deleted' });
  } catch (error) {
    console.error('Error deleting capital injection:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
