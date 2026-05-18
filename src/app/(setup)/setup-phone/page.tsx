import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SetupPhoneClient from './SetupPhoneClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SetupPhonePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pin: true, name: true, phoneVerified: true },
  });

  // If already verified, skip this step and check other steps
  if (user?.phoneVerified) {
    if (!user.pin || user.pin.trim() === '') {
      redirect('/setup-pin');
    } else if (!user.name || user.name.trim() === '') {
      redirect('/setup-profile');
    } else {
      redirect('/');
    }
  }

  return <SetupPhoneClient />;
}
