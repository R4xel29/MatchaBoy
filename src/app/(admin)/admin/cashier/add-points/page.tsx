import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AddPointsClient from './AddPointsClient';

export default async function AddPointsPage() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'CASHIER'].includes(session.user.role)) {
    redirect('/login');
  }

  return <AddPointsClient />;
}
