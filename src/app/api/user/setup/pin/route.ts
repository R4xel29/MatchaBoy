import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pin } = await req.json();
    if (!pin || pin.length !== 6 || isNaN(Number(pin))) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { pin },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving PIN:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
