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

async function testMid(accessToken, clientId, sharedKey, privateKey, isSandbox, midCandidate) {
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const qrEndpoint = `${baseUrl}/snap-adapter/b2b/v1.0/qr/qr-mpm-generate`;
  const qrTimestamp = getSnapTimestamp();
  const externalId = `EXT${Date.now()}`;
  const invoiceNumber = `INV-${Date.now()}`;

  const requestBody = {
    partnerReferenceNo: invoiceNumber,
    amount: {
      value: '10000.00',
      currency: 'IDR'
    },
    merchantId: midCandidate,
    terminalId: 'TID001',
    additionalInfo: {}
  };

  const minifiedBody = JSON.stringify(requestBody);
  const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
  
  const requestTarget = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';
  const stringToSignSym = `POST:${requestTarget}:${accessToken}:${bodyHash}:${qrTimestamp}`;
  const signatureSym = crypto.createHmac('sha512', sharedKey).update(stringToSignSym).digest('base64');

  try {
    const qrResponse = await fetch(qrEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-TIMESTAMP': qrTimestamp,
        'X-SIGNATURE': signatureSym,
        'X-PARTNER-ID': clientId,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': 'H2H'
      },
      body: minifiedBody
    });

    const qrData = await qrResponse.json();
    console.log(`MID Candidate [${midCandidate}] -> Status: ${qrResponse.status}, Code: ${qrData.responseCode}, Msg: ${qrData.responseMessage}`);
    if (qrData.qrData) {
      console.log(`   SUCCESS QR Data: ${qrData.qrData}`);
    }
  } catch (err) {
    console.error(`MID Candidate [${midCandidate}] Exception:`, err.message);
  }
}

async function main() {
  const paymentSettings = await prisma.paymentSettings.findFirst();
  const clientId = paymentSettings.dokuClientId;
  const sharedKey = paymentSettings.dokuSharedKey;
  const isSandbox = paymentSettings.dokuSandbox;

  const rootKeyPath = path.join(process.cwd(), 'private.key');
  const privateKey = fs.readFileSync(rootKeyPath, 'utf8');

  // Get Auth Access Token
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const endpoint = `${baseUrl}/authorization/v1/access-token/b2b`;
  const timestamp = getSnapTimestamp();
  const stringToSign = `${clientId}|${timestamp}`;
  const signer = crypto.createSign('SHA256');
  signer.update(stringToSign);
  const signature = signer.sign(privateKey, 'base64');

  const authResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CLIENT-KEY': clientId,
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature
    },
    body: JSON.stringify({ grantType: 'client_credentials' })
  });
  const authData = await authResponse.json();
  const accessToken = authData.accessToken;

  console.log('Testing candidates...');
  
  // Test variations
  await testMid(accessToken, clientId, sharedKey, privateKey, isSandbox, clientId); // Original
  await testMid(accessToken, clientId, sharedKey, privateKey, isSandbox, clientId.replace(/-/g, '')); // No dashes
  await testMid(accessToken, clientId, sharedKey, privateKey, isSandbox, '1779122436223'); // Trailing digits
  await testMid(accessToken, clientId, sharedKey, privateKey, isSandbox, '02551779122436223'); // Client ID number part
  await testMid(accessToken, clientId, sharedKey, privateKey, isSandbox, '6067'); // Random dummy MID
}

main().then(() => prisma.$disconnect()).catch(console.error);
