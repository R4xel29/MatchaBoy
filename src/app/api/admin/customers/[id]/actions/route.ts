import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { action, reason } = await req.json();

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true, phone: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'logout') {
      // Force logout by deleting all database sessions
      await prisma.session.deleteMany({
        where: { userId: id }
      });
      return NextResponse.json({ message: 'User sessions cleared' });
    }

    if (action === 'ban') {
      // Add to blacklist
      const bannedContacts = [];
      if (targetUser.email) {
        bannedContacts.push({
          type: 'EMAIL',
          value: targetUser.email,
          reason: reason || 'Banned by admin'
        });
      }
      if (targetUser.phone) {
        bannedContacts.push({
          type: 'PHONE',
          value: targetUser.phone,
          reason: reason || 'Banned by admin'
        });
      }

      // Create banned records
      for (const contact of bannedContacts) {
        await prisma.bannedContact.upsert({
          where: { value: contact.value },
          update: { reason: contact.reason },
          create: contact
        });
      }

      // Delete sessions and user
      await prisma.session.deleteMany({ where: { userId: id } });
      await prisma.user.delete({ where: { id } });

      return NextResponse.json({ message: 'User banned and account removed' });
    }

    if (action === 'delete') {
      // Permanent delete
      await prisma.user.delete({ where: { id } });
      return NextResponse.json({ message: 'Account permanently deleted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[ADMIN_USER_ACTION_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
