import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SetupPinClient from './SetupPinClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SetupPinPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pin: true, name: true },
  });

  // If user already has a PIN, skip this step
  if (user?.pin && user.pin.trim() !== '') {
    if (!user.name || user.name.trim() === '') {
      redirect('/setup-profile');
    } else {
      redirect('/');
    }
  }

  return <SetupPinClient />;
}
