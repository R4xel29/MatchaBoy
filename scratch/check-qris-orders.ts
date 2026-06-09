import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      paymentMethod: { in: ['DOKU', 'QRIS'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(`Found ${orders.length} QRIS/DOKU orders:`);
  orders.forEach(o => {
    console.log({
      id: o.id,
      paymentMethod: o.paymentMethod,
      status: o.status,
      paymentUrl: o.paymentUrl,
      paymentQrContentLength: o.paymentQrContent ? o.paymentQrContent.length : 0,
      paymentQrContentPreview: o.paymentQrContent ? o.paymentQrContent.substring(0, 30) + '...' : null,
      notes: o.notes
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
