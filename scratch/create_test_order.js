const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find a product
  const product = await prisma.product.findFirst();
  if (!product) {
    console.error("No product found in DB. Run seed first.");
    return;
  }

  // Delete test order if it already exists
  try {
    await prisma.orderItem.deleteMany({
      where: { orderId: 'SPMB-2H73H' }
    });
    await prisma.order.delete({
      where: { id: 'SPMB-2H73H' }
    });
    console.log("Deleted old test order.");
  } catch (err) {
    // Ignore if didn't exist
  }

  // Create order
  const order = await prisma.order.create({
    data: {
      id: 'SPMB-2H73H',
      customerName: 'Ahmad Dani',
      customerPhone: '6289602001931',
      address: 'Gedung A Lantai 2',
      subtotal: 15000,
      total: 15000,
      paymentMethod: 'QRIS',
      status: 'PENDING',
      paymentProofUrl: 'https://wlcergeosgpzxasxcyyi.supabase.co/storage/v1/object/public/products/payments/sample_proof.jpg',
      pickupDate: new Date(),
      pickupTime: '11:15',
      source: 'SPMB',
      items: {
        create: {
          productId: product.id,
          qty: 1,
          price: product.price,
          modifiers: JSON.stringify({ iceLevel: 'Normal', sugarLevel: 'Less' })
        }
      }
    }
  });

  console.log("Created test order successfully:", order);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
