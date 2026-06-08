const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      queueNumber: true,
      paymentMethod: true,
      paymentUrl: true,
      paymentQrContent: true,
      status: true,
      notes: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(orders, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
