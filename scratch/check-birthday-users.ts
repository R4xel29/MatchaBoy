import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  console.log(`Checking birthdays for month: ${month}, day: ${day}`);

  const users = await prisma.$queryRaw<any[]>`
    SELECT id, name, "birthDate", phone FROM "User" 
    WHERE EXTRACT(MONTH FROM "birthDate") = ${month} 
    AND EXTRACT(DAY FROM "birthDate") = ${day}
  `;

  console.log("Birthday users today:", JSON.stringify(users, null, 2));

  // Check all users with birthDate not null
  const allWithBirthday = await prisma.user.findMany({
    where: {
      birthDate: { not: null }
    },
    select: {
      id: true,
      name: true,
      birthDate: true,
      phone: true
    }
  });
  console.log("All users with birthdate set:", JSON.stringify(allWithBirthday, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
