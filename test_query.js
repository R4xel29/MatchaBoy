const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vouchers = await prisma.voucher.findMany({
    where: {
      discountAmount: 3000,
      minPurchase: 0,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      }
    }
  });
  console.log("=== Vouchers with 3000 and minPurchase 0 ===");
  console.log(JSON.stringify(vouchers, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
