import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying last 10 orders from the database...');
  try {
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log('--- RECENT ORDERS ---');
    orders.forEach(order => {
      console.log(`ID: ${order.id} | Name: ${order.customerName} | Status: ${order.status} | Total: ${order.total} | CreatedAt: ${order.createdAt.toISOString()}`);
    });
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
