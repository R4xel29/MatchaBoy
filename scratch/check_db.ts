import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.loyaltySettings.findFirst();
  console.log('Loyalty Settings in DB:', JSON.stringify(settings, null, 2));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
