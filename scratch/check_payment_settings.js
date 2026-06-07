const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      total: true,
      status: true,
      paymentMethod: true,
      paymentUrl: true,
      notes: true,
      createdAt: true,
    }
  });
  console.log('Recent Orders Detailed:', JSON.stringify(recentOrders, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
