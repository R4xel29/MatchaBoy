const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Helper to get formatted timestamp for SNAP
function getSnapTimestamp() {
  const date = new Date();
  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (num) => String(num).padStart(2, '0');
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    diff + pad(Math.floor(Math.abs(tzOffset) / 60)) +
    ':' + pad(Math.abs(tzOffset) % 60);
}

// Generate symmetric signature
function generateSymmetricSignature({
  method,
  endpoint,
  accessToken,
  body,
  timestamp,
  sharedKey
}) {
  // Hash the body using SHA256
  const minifiedBody = JSON.stringify(body);
  const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();

  const stringToSign = `${method.toUpperCase()}:${endpoint}:${accessToken}:${bodyHash}:${timestamp}`;
  console.log('Symmetric String to Sign:', stringToSign);

  // Compute HMAC-SHA512 using client secret (sharedKey)
  const hmac = crypto.createHmac('sha512', sharedKey).update(stringToSign).digest('base64');
  return hmac;
}

async function main() {
  const settings = await prisma.paymentSettings.findFirst();
  if (!settings) {
    console.error('No payment settings found in database');
    return;
  }

  const clientId = settings.dokuClientId;
  const sharedKey = settings.dokuSharedKey;
  const isSandbox = settings.dokuSandbox;

  console.log('Loaded settings:', {
    clientId,
    isSandbox,
    sharedKeyLength: sharedKey ? sharedKey.length : 0
  });

  // Load private key
  const privateKeyPath = path.join(__dirname, '..', 'private.key');
  if (!fs.existsSync(privateKeyPath)) {
    console.error(`Private key not found at: ${privateKeyPath}`);
    return;
  }
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

  const baseUrl = isSandbox 
    ? 'https://api-sandbox.doku.com'
    : 'https://api.doku.com';

  // 1. GET ACCESS TOKEN
  console.log('\n--- 1. Getting Access Token ---');
  const tokenTimestamp = getSnapTimestamp();
  const tokenStringToSign = `${clientId}|${tokenTimestamp}`;
  
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(tokenStringToSign);
  const tokenSignature = signer.sign(privateKey, 'base64');

  const tokenEndpoint = `${baseUrl}/authorization/v1/access-token/b2b`;
  const tokenHeaders = {
    'Content-Type': 'application/json',
    'X-CLIENT-KEY': clientId,
    'X-TIMESTAMP': tokenTimestamp,
    'X-SIGNATURE': tokenSignature,
  };

  const tokenRes = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: tokenHeaders,
    body: JSON.stringify({ grantType: 'client_credentials' })
  });

  const tokenData = await tokenRes.json();
  console.log('Token Response:', JSON.stringify(tokenData, null, 2));

  if (!tokenRes.ok || !tokenData.accessToken) {
    console.error('Failed to get B2B access token');
    return;
  }

  const accessToken = tokenData.accessToken;

  // 2. GENERATE QRIS
  console.log('\n--- 2. Generating QRIS ---');
  const qrisTimestamp = getSnapTimestamp();
  const qrisEndpoint = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';
  const qrisUrl = `${baseUrl}${qrisEndpoint}`;

  const partnerReferenceNo = 'TEST-' + Date.now();
  const qrisBody = {
    partnerReferenceNo: partnerReferenceNo,
    amount: {
      value: '10000.00',
      currency: 'IDR'
    },
    merchantId: '1779122436223',
    terminalId: '12345678'
  };

  const symSignature = generateSymmetricSignature({
    method: 'POST',
    endpoint: qrisEndpoint,
    accessToken: accessToken,
    body: qrisBody,
    timestamp: qrisTimestamp,
    sharedKey: sharedKey
  });

  const qrisHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'X-TIMESTAMP': qrisTimestamp,
    'X-SIGNATURE': symSignature,
    'X-PARTNER-ID': clientId,
    'X-EXTERNAL-ID': 'EXT-' + Date.now(),
    'CHANNEL-ID': 'H2H'
  };

  console.log('QRIS Request Headers:', {
    ...qrisHeaders,
    'Authorization': 'Bearer [REDACTED]',
    'X-SIGNATURE': '[REDACTED]'
  });
  console.log('QRIS Request Body:', qrisBody);

  try {
    const qrisRes = await fetch(qrisUrl, {
      method: 'POST',
      headers: qrisHeaders,
      body: JSON.stringify(qrisBody)
    });

    console.log('QRIS Response Status:', qrisRes.status);
    const qrisText = await qrisRes.text();
    console.log('QRIS Response Text:', qrisText);

    try {
      const qrisData = JSON.parse(qrisText);
      console.log('Parsed QRIS Response:', JSON.stringify(qrisData, null, 2));
    } catch (e) {
      console.error('Failed to parse response as JSON');
    }
  } catch (error) {
    console.error('QRIS Fetch Exception:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
