const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const popups = await prisma.promoPopup.findMany();
  console.log('Popups in DB:', JSON.stringify(popups, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
