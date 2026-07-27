const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  let updatedCount = 0;

  for (const product of products) {
    if (!product.modifiers) continue;
    try {
      const mods = JSON.parse(product.modifiers);
      let changed = false;

      if (mods.sizes && Array.isArray(mods.sizes)) {
        mods.sizes = mods.sizes.map((s) => {
          if (s.name.toLowerCase().includes('large') || s.name.toLowerCase().includes('big') || s.price === 2000) {
            changed = true;
            return { ...s, price: 3000 };
          }
          return s;
        });
      }

      if (changed) {
        await prisma.product.update({
          where: { id: product.id },
          data: { modifiers: JSON.stringify(mods) }
        });
        console.log(`Updated product sizes for "${product.name}" (${product.id}) -> 3000`);
        updatedCount++;
      }
    } catch (e) {
      console.error(`Error parsing modifiers for ${product.name}:`, e);
    }
  }

  console.log(`Total products updated to 3000 for Large/Big Size: ${updatedCount}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
