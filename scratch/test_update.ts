import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.loyaltySettings.findFirst();
  if (!settings) return;

  try {
    const updated = await prisma.loyaltySettings.update({
      where: { id: settings.id },
      data: {
        easterEggEnabled: settings.easterEggEnabled,
        easterEggVoucherCode: settings.easterEggVoucherCode,
        easterEggDiscount: settings.easterEggDiscount,
        easterEggQuota: settings.easterEggQuota,
      },
    });
    console.log('Update Success:', updated);
  } catch (error) {
    console.error('Update Error:', error);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
