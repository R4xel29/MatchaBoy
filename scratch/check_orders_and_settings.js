const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- StoreSettings ---");
  const settings = await prisma.storeSettings.findFirst();
  console.log("Settings:", settings);

  console.log("\n--- Sample SPMB Orders ---");
  const orders = await prisma.order.findMany({
    take: 5,
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });
  
  console.log(`Found ${orders.length} orders.`);
  orders.forEach(o => {
    console.log(`ID: ${o.id}, CustName: ${o.customerName}, CustPhone: ${o.customerPhone}, Method: ${o.paymentMethod}, Status: ${o.status}, Proof: ${o.paymentProofUrl}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
