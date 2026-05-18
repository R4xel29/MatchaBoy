const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- ALL VERIFICATION TOKENS ---');
  const tokens = await prisma.verificationToken.findMany({
    orderBy: { expires: 'desc' },
  });
  console.log(JSON.stringify(tokens, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
