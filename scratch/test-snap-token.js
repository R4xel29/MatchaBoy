const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function main() {
  const settings = await prisma.paymentSettings.findFirst();
  if (!settings) {
    console.error('No payment settings found in database');
    return;
  }

  const clientId = settings.dokuClientId;
  const isSandbox = settings.dokuSandbox;

  console.log('Loaded settings:', {
    clientId,
    isSandbox,
  });

  // Load private key
  const privateKeyPath = path.join(__dirname, '..', 'private.key');
  if (!fs.existsSync(privateKeyPath)) {
    console.error(`Private key not found at: ${privateKeyPath}`);
    return;
  }
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  console.log('Private key loaded successfully.');

  // Set URL
  const baseUrl = isSandbox 
    ? 'https://api-sandbox.doku.com'
    : 'https://api.doku.com';
  const endpoint = `${baseUrl}/authorization/v1/access-token/b2b`;
  console.log('Target URL:', endpoint);

  // Generate Timestamp in ISO 8601 format: yyyy-MM-ddTHH:mm:ss.SSSZ (or with offset)
  // Let's use UTC standard: YYYY-MM-DDTHH:mm:ss.SSSZ (or without SSS)
  // According to Doku, standard SNAP timestamp format: yyyy-MM-ddTHH:mm:ss+07:00
  const date = new Date();
  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (num) => String(num).padStart(2, '0');
  const formattedTimestamp = date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    diff + pad(Math.floor(Math.abs(tzOffset) / 60)) +
    ':' + pad(Math.abs(tzOffset) % 60);

  console.log('Generated Timestamp:', formattedTimestamp);

  // Generate String to Sign: Client-Id + "|" + Timestamp
  const stringToSign = `${clientId}|${formattedTimestamp}`;
  console.log('String to sign:', stringToSign);

  // Sign string using SHA256withRSA
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(stringToSign);
  const signature = signer.sign(privateKey, 'base64');
  console.log('Generated Signature (base64):', signature);

  // Prepare request
  const headers = {
    'Content-Type': 'application/json',
    'X-CLIENT-KEY': clientId,
    'X-TIMESTAMP': formattedTimestamp,
    'X-SIGNATURE': signature,
  };

  const body = {
    grantType: 'client_credentials',
  };

  console.log('Request Headers:', headers);
  console.log('Request Body:', body);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    console.log('Response Status:', response.status);
    const text = await response.text();
    console.log('Response Text:', text);

    try {
      const data = JSON.parse(text);
      console.log('Parsed JSON Response:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to parse response as JSON');
    }
  } catch (error) {
    console.error('Fetch Exception:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
