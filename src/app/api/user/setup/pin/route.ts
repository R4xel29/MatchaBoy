import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pin: true },
    });

    const hasPin = !!(user?.pin && user.pin.trim() !== '');
    return NextResponse.json({ hasPin });
  } catch (error) {
    console.error('Error checking PIN status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { pin, action, currentPin } = body;

    if (action === 'verify') {
      if (!pin || String(pin).length !== 6 || isNaN(Number(pin))) {
        return NextResponse.json(
          { error: 'PIN Arum Seduh harus terdiri dari 6 digit angka.', valid: false },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { pin: true },
      });

      if (!user?.pin || user.pin.trim() === '') {
        return NextResponse.json(
          { error: 'PIN Arum Seduh belum diatur.', code: 'PIN_NOT_SET', valid: false },
          { status: 400 }
        );
      }

      if (user.pin.trim() !== String(pin).trim()) {
        return NextResponse.json(
          { error: 'PIN Arum Seduh tidak sesuai. Silakan coba lagi.', valid: false },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, valid: true });
    }

    if (!pin || String(pin).length !== 6 || isNaN(Number(pin))) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
    }

    if (action === 'change') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { pin: true },
      });

      if (user?.pin && user.pin.trim() !== '') {
        if (!currentPin || user.pin.trim() !== String(currentPin).trim()) {
          return NextResponse.json(
            { error: 'PIN lama tidak sesuai. Silakan masukkan PIN lama Anda dengan benar.' },
            { status: 400 }
          );
        }
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { pin: String(pin).trim() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving PIN:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

