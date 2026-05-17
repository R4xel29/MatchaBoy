const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emailsToPromote = [
    'axelinomanibuy3@gmail.com',
    'diptabaskaraosis@gmail.com',
    'axelinonitian755@gmail.com',
    't47375844@gmail.com'
  ];

  const res = await prisma.user.updateMany({
    where: { email: { in: emailsToPromote } },
    data: { role: 'ADMIN' }
  });

  console.log(`Promoted ${res.count} users to ADMIN`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
