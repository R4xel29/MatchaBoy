import { prisma } from '@/lib/prisma';
import PromoPopupsClient from './PromoPopupsClient';

export const revalidate = 0;

export default async function AdminPromoPopupsPage() {
  const popups = await prisma.promoPopup.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return <PromoPopupsClient initialPopups={popups} />;
}
