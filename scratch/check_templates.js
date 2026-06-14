const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.voucherTemplate.findMany();
  console.log('--- Voucher Templates ---');
  templates.forEach((t, i) => {
    console.log(`${i + 1}. Title: ${t.title}`);
    console.log(`   Code: ${t.code}`);
    console.log(`   Type: ${t.type}`);
    console.log(`   Discount: ${t.discountValue}`);
    console.log(`   Limit: ${t.usageLimit} / Count: ${t.usageCount}`);
    console.log('-------------------------');
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
