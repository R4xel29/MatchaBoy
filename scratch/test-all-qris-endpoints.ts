import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { 
  generateDokuSnapQris, 
  queryDokuSnapQris, 
  refundDokuSnapQris, 
  decodeDokuSnapQris, 
  payDokuSnapQris, 
  cancelDokuSnapQris 
} from '../src/lib/doku';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- STARTING DOKU SNAP QRIS INTEGRATION TESTS ---');
  
  const paymentSettings = await prisma.paymentSettings.findFirst();
  if (!paymentSettings) {
    console.error('No payment settings found in Database!');
    return;
  }
  
  const creds = {
    clientId: paymentSettings.dokuClientId,
    sharedKey: paymentSettings.dokuSharedKey,
    isSandbox: paymentSettings.dokuSandbox
  };
  
  console.log('Using Credentials:');
  console.log('Client ID:', creds.clientId);
  console.log('Shared Key:', creds.sharedKey ? '***' + creds.sharedKey.slice(-4) : 'undefined');
  console.log('Sandbox:', creds.isSandbox);
  
  const testInvoice = `TST-QRIS-${Date.now()}`;
  
  // 1. Test Generate QRIS
  let qrContent = '';
  console.log('\n[TEST 1] Generating Dynamic QRIS...');
  try {
    qrContent = await generateDokuSnapQris(creds, {
      invoiceNumber: testInvoice,
      amount: 10000,
      merchantId: creds.clientId,
      terminalId: 'TID001',
      postalCode: '67215'
    });
    console.log('SUCCESS: QRIS Content Generated!');
    console.log('QRIS String Length:', qrContent.length);
    console.log('QRIS String Preview:', qrContent.slice(0, 30) + '...');
  } catch (err: any) {
    console.warn('FAILED: Generate QRIS threw error:', err.message);
  }
  
  // 2. Test Decode QRIS
  const testQrToDecode = qrContent || '00020101021226330015ID1020211516086010300002030005204581253033605405100005802ID5908ARUS PAY6012PROBOLINGGO61056721562140108123456786304E67F';
  console.log('\n[TEST 2] Decoding QRIS...');
  try {
    const decodeRes = await decodeDokuSnapQris(creds, {
      partnerReferenceNo: `DEC-${Date.now()}`,
      qrContent: testQrToDecode,
    });
    console.log('SUCCESS: Decode response:', JSON.stringify(decodeRes, null, 2));
  } catch (err: any) {
    console.warn('FAILED/MOCKED: Decode QRIS threw error:', err.message);
  }

  // 3. Test Query QRIS
  console.log('\n[TEST 3] Querying QRIS Status...');
  try {
    const queryRes = await queryDokuSnapQris(creds, {
      originalReferenceNo: 'REF-12345',
      originalPartnerReferenceNo: testInvoice,
      merchantId: creds.clientId
    });
    console.log('SUCCESS: Query response:', JSON.stringify(queryRes, null, 2));
  } catch (err: any) {
    console.warn('FAILED/MOCKED: Query QRIS threw error:', err.message);
  }

  // 4. Test Refund QRIS
  console.log('\n[TEST 4] Refunding QRIS...');
  try {
    const refundRes = await refundDokuSnapQris(creds, {
      merchantId: creds.clientId,
      originalPartnerReferenceNo: testInvoice,
      originalReferenceNo: 'REF-12345',
      partnerRefundNo: `REFUND-${Date.now()}`,
      refundAmountValue: 10000,
      reason: 'Testing refund integration',
      approvalCode: '123456'
    });
    console.log('SUCCESS: Refund response:', JSON.stringify(refundRes, null, 2));
  } catch (err: any) {
    console.warn('FAILED/MOCKED: Refund QRIS threw error:', err.message);
  }

  // 5. Test Payment QRIS
  console.log('\n[TEST 5] Executing Payment QRIS...');
  try {
    const payRes = await payDokuSnapQris(creds, 'dummy-customer-token', {
      partnerReferenceNo: `PAY-${Date.now()}`,
      amountValue: 10000,
      qrContent: testQrToDecode
    });
    console.log('SUCCESS: Payment response:', JSON.stringify(payRes, null, 2));
  } catch (err: any) {
    console.warn('FAILED/MOCKED: Payment QRIS threw error:', err.message);
  }

  // 6. Test Cancel/Expire QRIS
  console.log('\n[TEST 6] Cancelling/Expiring QRIS...');
  try {
    const cancelRes = await cancelDokuSnapQris(creds, {
      partnerReferenceNo: testInvoice,
      referenceNo: 'REF-12345',
      merchantId: creds.clientId,
      reason: 'Customer cancelled transaction'
    });
    console.log('SUCCESS: Cancel response:', JSON.stringify(cancelRes, null, 2));
  } catch (err: any) {
    console.warn('FAILED/MOCKED: Cancel QRIS threw error:', err.message);
  }
}

runTests()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Test script crashed:', e);
    prisma.$disconnect();
  });
