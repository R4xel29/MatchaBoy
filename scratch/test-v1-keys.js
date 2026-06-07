import { createDokuCheckoutSession } from '../src/lib/doku.js';

async function testV1() {
  const creds = {
    clientId: 'doku_key_43f1a9d33f2a4cfabf847233f91fc40d',
    sharedKey: 'SK-XdLpiN1WEba1Ibmaff3A',
    isSandbox: false // production
  };

  const payload = {
    invoiceNumber: `TEST-V1-${Date.now()}`,
    amount: 15000,
    customerName: "Test Customer",
    customerPhone: "08123456789",
    customerEmail: "arumseduh@gmail.com",
    callbackUrl: "http://localhost:3000/orders/123",
  };

  console.log("Testing Hosted Checkout V1 with doku_key_43f1a9d33f2a4cfabf847233f91fc40d...");
  const result = await createDokuCheckoutSession(creds, payload);
  console.log("Result:", result);
}

testV1();
