import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const debugOrder = await prisma.order.findUnique({
      where: { id: 'WEBHOOK_DEBUG' },
    });

    if (!debugOrder || !debugOrder.notes) {
      console.log('No webhook debug log found in database yet.');
      return;
    }

    console.log('=== WEBHOOK DEBUG LOG ===');
    const parsedNotes = JSON.parse(debugOrder.notes);
    console.log(JSON.stringify(parsedNotes, null, 2));
  } catch (error) {
    console.error('Error reading webhook debug log:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
