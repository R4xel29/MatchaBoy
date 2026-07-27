const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.topping.findFirst({
    where: { name: { equals: 'Big Size', mode: 'insensitive' } }
  });

  if (existing) {
    const updated = await prisma.topping.update({
      where: { id: existing.id },
      data: { price: 3000, isAvailable: true }
    });
    console.log('Updated existing Big Size topping:', updated);
  } else {
    const created = await prisma.topping.create({
      data: {
        name: 'Big Size',
        price: 3000,
        isAvailable: true,
      }
    });
    console.log('Created Big Size topping:', created);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
