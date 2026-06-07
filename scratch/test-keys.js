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

async function testCombination(clientId, sharedKey, isSandbox) {
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const timestamp = getSnapTimestamp();
  
  // 1. Get Access Token
  const authEndpoint = `${baseUrl}/authorization/v1/access-token/b2b`;
  const stringToSign = `${clientId}|${timestamp}`;
  
  const rootKeyPath = path.join(process.cwd(), 'private.key');
  if (!fs.existsSync(rootKeyPath)) {
    console.error('private.key NOT found');
    return;
  }
  const privateKey = fs.readFileSync(rootKeyPath, 'utf8');

  const signer = crypto.createSign('SHA256');
  signer.update(stringToSign);
  const signature = signer.sign(privateKey, 'base64');

  try {
    const authResponse = await fetch(authEndpoint, {
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
    if (!authResponse.ok || !authData.accessToken) {
      console.log(`[Fail] env: ${isSandbox ? 'Sandbox' : 'Prod'}, Key: ${sharedKey.slice(0, 8)}... -> Auth Error: ${authData.responseMessage || authResponse.statusText}`);
      return;
    }

    const accessToken = authData.accessToken;
    
    // 2. Generate QRIS
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
      merchantId: clientId,
      terminalId: 'TID001',
      additionalInfo: {}
    };

    const minifiedBody = JSON.stringify(requestBody);
    const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
    
    const requestTarget = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';
    const stringToSignSym = `POST:${requestTarget}:${accessToken}:${bodyHash}:${qrTimestamp}`;
    const signatureSym = crypto.createHmac('sha512', sharedKey).update(stringToSignSym).digest('base64');

    const qrResponse = await fetch(qrEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-TIMESTAMP': qrTimestamp,
        'X-SIGNATURE': signatureSym,
        'X-PARTNER-ID': clientId,
        'X-EXTERNAL-ID': externalId
      },
      body: minifiedBody
    });

    const qrData = await qrResponse.json();
    console.log(`[Result] env: ${isSandbox ? 'Sandbox' : 'Prod'}, Key: ${sharedKey.slice(0, 8)}... -> Auth Success. QR Status: ${qrResponse.status}, Code: ${qrData.responseCode}, Msg: ${qrData.responseMessage}`);
    if (qrData.qrData) {
      console.log(`   SUCCESS QR Data: ${qrData.qrData}`);
    }
  } catch (err) {
    console.error(`[Error] env: ${isSandbox ? 'Sandbox' : 'Prod'}, Key: ${sharedKey.slice(0, 8)}... -> Exception:`, err.message);
  }
}

async function main() {
  const clientId = "BRN-0255-1779122436223";
  const keys = ["SK-XdLpiN1WEba1Ibmaff3A", "SK-nJxXXA9t7pMWJSTnuAXy"];
  
  for (const key of keys) {
    await testCombination(clientId, key, true);  // Test Sandbox
    await testCombination(clientId, key, false); // Test Production
  }
}

main().then(() => prisma.$disconnect()).catch(console.error);
