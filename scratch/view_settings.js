const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.paymentSettings.findFirst();
  console.log('PaymentSettings:', settings);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
