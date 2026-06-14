const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: 'axeli',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  console.log('Search Results for "axeli":');
  console.log(users);

  if (users.length === 0) {
    const allUsers = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    console.log('\nFirst 10 users in DB:');
    console.log(allUsers);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
