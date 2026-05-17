import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const usersWithEmptyRef = await prisma.user.findMany({
    where: {
      OR: [
        { referralCode: "" },
        { referralCode: null }
      ]
    }
  });
  console.log("Users with empty/null referralCode:", usersWithEmptyRef.length);
  if (usersWithEmptyRef.length > 0) {
    console.log(usersWithEmptyRef.map(u => ({ id: u.id, name: u.name })));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
