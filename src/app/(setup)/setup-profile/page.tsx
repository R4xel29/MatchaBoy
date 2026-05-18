import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SetupProfileClient from './SetupProfileClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SetupProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pin: true, name: true },
  });

  // If user doesn't have PIN yet, send them to PIN setup first
  if (!user?.pin || user.pin.trim() === '') {
    redirect('/setup-pin');
  }

  // If user already has a real name, they're done
  const name = user?.name?.trim() || '';
  const hasRealName = name !== '' && !/^User \d+$/i.test(name);
  if (hasRealName) {
    redirect('/');
  }

  return <SetupProfileClient />;
}
