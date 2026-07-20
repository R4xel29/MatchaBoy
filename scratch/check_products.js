const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const products = await prisma.product.findMany();
    console.log("PRODUCTS_IN_DB:", JSON.stringify(products, null, 2));
  } catch (err) {
    console.error("DB_ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
