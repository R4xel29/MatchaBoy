const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: 'DRIVER' },
      include: { driverProfile: true }
    });
    console.log('Drivers count:', drivers.length);
    console.log('Drivers:', JSON.stringify(drivers, null, 2));
  } catch (err) {
    console.error('Prisma Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
