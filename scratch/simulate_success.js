const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = 'cmq1ekhpq000jy0zm65yyy3l1';
  
  // Find the order
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });
  
  if (!order) {
    console.error("Order not found!");
    return;
  }
  
  if (order.status !== 'PENDING_PAYMENT') {
    console.log(`Order is already in status: ${order.status}`);
    return;
  }
  
  // Update status to PREPARING
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PREPARING',
      notes: order.notes 
        ? `${order.notes}\n[Manual Sim] Pembayaran sukses disimulasikan secara lokal.`
        : '[Manual Sim] Pembayaran sukses disimulasikan secara lokal.'
    }
  });
  
  console.log("SUCCESS: Order successfully updated to PREPARING!");
  console.log(JSON.stringify(updatedOrder, null, 2));

  // Trigger notification if possible
  try {
    // Dynamic import next/dist/server/web/spec-extension/request or standard modules
    const { sendNotification } = await import('../src/lib/notification-service.js');
    await sendNotification({
      userId: updatedOrder.userId || '',
      type: 'order',
      title: 'Pembayaran Berhasil! 🍵',
      message: `Pembayaran pesanan ${updatedOrder.id.slice(0, 8).toUpperCase()} telah berhasil diverifikasi. Kami sedang menyiapkan pesanan Anda!`,
      linkUrl: `/orders/${updatedOrder.id}`,
      data: { orderId: updatedOrder.id },
    });
    console.log("Success notification sent to customer.");
  } catch (err) {
    console.warn("Could not send real-time notification (this is fine for local simulation):", err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
