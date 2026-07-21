import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const rawBody = `{
  "service": {
    "id": "QRIS",
    "name": "QRIS"
  },
  "acquirer": {
    "id": "93600899",
    "name": "DOKU"
  },
  "issuer": {
    "id": "93600535",
    "name": "Seabank"
  },
  "channel": {
    "id": "QRIS_DOKU",
    "name": "QRIS-DOKU"
  },
  "customer": {
    "doku_id": "9360053516945140036",
    "name": "AXELINO NITIAN BASKARA MANIBUY",
    "email": "QR1.arumseduh@gmail.com",
    "phone": "6281344446442"
  },
  "merchant": {
    "name": "Arun Seduh Drink",
    "pan": "936008990000095072"
  },
  "order": {
    "invoice_number": "POS-998866",
    "amount": 6000.00,
    "tips": 0.00,
    "terminal_id": "A01             "
  },
  "emoney_payment": {
    "account_id": "",
    "approval_code": "00F30006M1L5"
  },
  "transaction": {
    "status": "SUCCESS",
    "date": "2026-07-21T09:26:54Z",
    "original_request_id": "1784626001996"
  },
  "additional_info": {
    "postalCode": "67215",
    "feeType": "1"
  }
}`;

const headers = {
  "client-id": "BRN-0255-1779122436223",
  "request-id": "1d3715fd-1a40-44c0-bf7f-429f3299496b",
  "request-timestamp": "2026-07-21T09:26:55Z",
  "signature": "HMACSHA256=OZMeJJudUgV2qKOZxHsjyyetgD8tMQeM8ny/U+dkumU="
};

async function main() {
  const settings = await prisma.paymentSettings.findFirst();
  if (!settings || !settings.dokuSharedKey) {
    console.log('No Doku Shared Key found');
    return;
  }

  const sharedKey = settings.dokuSharedKey;
  const clientId = settings.dokuClientId;

  console.log(`Using SharedKey: "${sharedKey.slice(0, 4)}...${sharedKey.slice(-4)}"`);
  console.log(`Using ClientId: "${clientId}"`);

  // Target paths to test
  const targets = [
    '/api/payment/snap-webhook',
    '/api/payment/doku-webhook',
  ];

  // Body variations
  const parsed = JSON.parse(rawBody);
  const minified = JSON.stringify(parsed);
  const rawBodyTrimmed = rawBody.trim();

  const bodyDigests = [
    { name: 'Minified JSON', digest: crypto.createHash('sha256').update(minified).digest('base64') },
    { name: 'Raw Body', digest: crypto.createHash('sha256').update(rawBody).digest('base64') },
    { name: 'Raw Body Trimmed', digest: crypto.createHash('sha256').update(rawBodyTrimmed).digest('base64') },
  ];

  console.log('\n--- CALCULATING SIGNATURES ---');
  let matched = false;

  for (const target of targets) {
    for (const { name, digest } of bodyDigests) {
      const rawString = [
        `Client-Id:${clientId}`,
        `Request-Id:${headers['request-id']}`,
        `Request-Timestamp:${headers['request-timestamp']}`,
        `Request-Target:${target}`,
        `Digest:${digest}`,
      ].join('\n');

      const hmac = crypto.createHmac('sha256', sharedKey).update(rawString).digest('base64');
      const calculatedSignature = `HMACSHA256=${hmac}`;

      console.log(`Target: ${target} | Body: ${name}`);
      console.log(`Raw String:\n${rawString}`);
      console.log(`Digest: ${digest}`);
      console.log(`Calculated: ${calculatedSignature}`);
      console.log(`Received:   ${headers.signature}`);
      
      if (calculatedSignature === headers.signature) {
        console.log('✅ MATCH!');
        matched = true;
      }
      console.log('------------------------------------');
    }
  }

  if (!matched) {
    console.log('❌ NO MATCH FOUND AT ALL');
  }

  await prisma.$disconnect();
}

main();
