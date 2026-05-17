import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check if referralCode property exists on the prisma.user model
  const userFields = Object.keys((prisma as any).user);
  console.log("User model methods:", userFields);
  
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length > 0) {
    console.log("First user keys:", Object.keys(users[0]));
    console.log("First user referralCode:", (users[0] as any).referralCode);
  } else {
    console.log("No users found.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
