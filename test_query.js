const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const drivers = await prisma.user.findMany({
    where: { role: 'DRIVER' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      createdAt: true,
      driverProfile: {
        select: {
          isOnline: true,
          vehicleType: true,
          plateNumber: true,
          driverImageUrl: true,
          shiftStart: true,
          shiftEnd: true,
          status: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(drivers, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
