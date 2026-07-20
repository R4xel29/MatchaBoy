const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.count();
    const products = await prisma.product.count();
    const orders = await prisma.order.count();
    const categories = await prisma.category.count();
    const vouchers = await prisma.voucher.count();
    console.log("DB_STATUS_OK:", { users, products, orders, categories, vouchers });
  } catch (err) {
    console.error("DB_ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
