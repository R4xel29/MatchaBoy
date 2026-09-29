import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, birthDate, gender, email } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Nama lengkap wajib diisi' }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      name: name.trim(),
    };

    if (birthDate && typeof birthDate === 'string' && birthDate.trim() !== '') {
      const parsedDate = new Date(birthDate);
      if (!isNaN(parsedDate.getTime())) {
        updateData.birthDate = parsedDate;
      }
    }

    if (gender && ['MAN', 'WOMAN', 'SECRET'].includes(gender)) {
      updateData.gender = gender;
    }

    if (email && typeof email === 'string' && email.trim() !== '') {
      const normalizedEmail = email.trim().toLowerCase();
      // Only update email if not already used by another user
      const existingEmailUser = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id: session.user.id },
        },
        select: { id: true },
      });
      if (!existingEmailUser) {
        updateData.email = normalizedEmail;
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
