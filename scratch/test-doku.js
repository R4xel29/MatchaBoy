import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function getSnapTimestamp() {
  const now = new Date();
  const offsetMinutes = 7 * 60; // UTC+7
  const localTime = new Date(now.getTime() + (offsetMinutes + now.getTimezoneOffset()) * 60000);
  const pad = (num) => String(num).padStart(2, '0');
  
  return `${localTime.getFullYear()}-${pad(localTime.getMonth() + 1)}-${pad(localTime.getDate())}T${pad(localTime.getHours())}:${pad(localTime.getMinutes())}:${pad(localTime.getSeconds())}+07:00`;
}

async function testDoku() {
  const paymentSettings = await prisma.paymentSettings.findFirst();
  if (!paymentSettings) {
    console.error('No payment settings found');
    return;
  }

  const clientId = paymentSettings.dokuClientId;
  const sharedKey = paymentSettings.dokuSharedKey;
  const isSandbox = paymentSettings.dokuSandbox;

  console.log('--- Testing Doku SNAP Authorization ---');
  console.log('Client ID:', clientId);
  console.log('Shared Key:', sharedKey);
  console.log('Is Sandbox:', isSandbox);

  const rootKeyPath = path.join(process.cwd(), 'private.key');
  let privateKey = '';
  if (fs.existsSync(rootKeyPath)) {
    privateKey = fs.readFileSync(rootKeyPath, 'utf8');
    console.log('Loaded private.key successfully. Length:', privateKey.length);
  } else {
    console.error('private.key NOT found at:', rootKeyPath);
    return;
  }

  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const endpoint = `${baseUrl}/authorization/v1/access-token/b2b`;
  
  const timestamp = getSnapTimestamp();
  const stringToSign = `${clientId}|${timestamp}`;
  
  const signer = crypto.createSign('SHA256');
  signer.update(stringToSign);
  const signature = signer.sign(privateKey, 'base64');

  const body = {
    grantType: 'client_credentials'
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CLIENT-KEY': clientId,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature
      },
      body: JSON.stringify(body)
    });

    console.log('Status Code:', response.status);
    const data = await response.json();
    console.log('Response Body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Request Exception:', err);
  }
}

testDoku().then(() => prisma.$disconnect());
