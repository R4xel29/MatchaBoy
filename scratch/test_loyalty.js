const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching loyalty settings...");
  const settings = await prisma.loyaltySettings.findFirst();
  console.log("Current settings:", settings);
  
  console.log("Trying to update settings with new fields...");
  const updated = await prisma.loyaltySettings.update({
    where: { id: settings.id },
    data: {
      pointMode: 'PER_TRANSACTION',
      pointPerTransaction: 1,
      pointPerAmount: 10000,
      pointValue: 250
    }
  });
  console.log("Updated settings successfully:", updated);
}

main()
  .catch(e => console.error("Error during prisma execution:", e))
  .finally(() => prisma.$disconnect());
