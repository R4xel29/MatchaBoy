import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

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

  // Target paths to test
  const targets = [
    '/api/payment/snap-webhook',
    '/api/payment/doku-webhook',
  ];

  console.log('\n--- CALCULATING SIGNATURES WITHOUT DIGEST ---');
  let matched = false;

  for (const target of targets) {
    const rawString = [
      `Client-Id:${clientId}`,
      `Request-Id:${headers['request-id']}`,
      `Request-Timestamp:${headers['request-timestamp']}`,
      `Request-Target:${target}`,
    ].join('\n');

    const hmac = crypto.createHmac('sha256', sharedKey).update(rawString).digest('base64');
    const calculatedSignature = `HMACSHA256=${hmac}`;

    console.log(`Target: ${target}`);
    console.log(`Raw String:\n${rawString}`);
    console.log(`Calculated: ${calculatedSignature}`);
    console.log(`Received:   ${headers.signature}`);
    
    if (calculatedSignature === headers.signature) {
      console.log('✅ MATCH!');
      matched = true;
    }
    console.log('------------------------------------');
  }

  if (!matched) {
    console.log('❌ NO MATCH FOUND');
  }

  await prisma.$disconnect();
}

main();
