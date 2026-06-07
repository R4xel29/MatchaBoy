import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { generateDokuSnapQris, createDokuCheckoutSession } from '../src/lib/doku.js';

const prisma = new PrismaClient();

async function runFallbackSimulation() {
  const paymentSettings = await prisma.paymentSettings.findFirst();
  if (!paymentSettings) {
    console.error("No payment settings found in DB");
    return;
  }

  console.log("Simulating Doku SNAP QRIS failure & Hosted Checkout fallback...");
  
  const secureTotal = 15000;
  const mockOrderId = `TEST-${Date.now()}`;
  
  let paymentUrl = null;
  let paymentQrContent = null;
  
  // 1. Try Doku SNAP QRIS (which we expect to fail with 500 or other errors based on our previous tests)
  try {
    console.log("Attempting direct SNAP QRIS generation...");
    paymentQrContent = await generateDokuSnapQris({
      clientId: paymentSettings.dokuClientId,
      sharedKey: paymentSettings.dokuSharedKey,
      isSandbox: paymentSettings.dokuSandbox,
    }, {
      invoiceNumber: mockOrderId,
      amount: secureTotal,
    });
    console.log("SNAP QRIS Success! QR Data length:", paymentQrContent.length);
  } catch (snapError) {
    console.log("⚠️ SNAP QRIS failed as expected:", snapError.message);
    console.log("Executing fallback to Hosted Checkout...");
    
    try {
      const callbackUrl = `http://localhost:3000/orders/${mockOrderId}`;
      const notificationUrl = `http://localhost:3000/api/payment/doku-webhook`;
      const dokuResult = await createDokuCheckoutSession({
        clientId: paymentSettings.dokuClientId,
        sharedKey: paymentSettings.dokuSharedKey,
        isSandbox: paymentSettings.dokuSandbox,
      }, {
        invoiceNumber: mockOrderId,
        amount: secureTotal,
        customerName: "Test Customer",
        customerPhone: "08123456789",
        customerEmail: "arumseduh@gmail.com",
        callbackUrl,
        notificationUrl,
      });

      if (dokuResult.error) {
        throw new Error(dokuResult.error);
      }
      
      paymentUrl = dokuResult.url;
      console.log("✅ Fallback SUCCESS! Generated Hosted Checkout URL:", paymentUrl);
    } catch (fallbackError) {
      console.error("❌ Fallback FAILED:", fallbackError.message);
    }
  }
}

runFallbackSimulation().then(() => prisma.$disconnect());
