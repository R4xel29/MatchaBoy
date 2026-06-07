const crypto = require('crypto');

async function main() {
  const clientId = 'BRN-0255-1779122436223';
  const sharedKey = 'SK-XdLpiN1WEba1Ibmaff3A';
  const invoiceNumber = 'cmq1ekhpq000jy0zm65yyy3l1';
  const requestTarget = `/checkout/v1/payment/status?invoice_number=${invoiceNumber}`;
  const endpoint = `https://api.doku.com${requestTarget}`;
  const requestId = `REQ-${Date.now()}`;
  const timestamp = new Date().toISOString().split('.')[0] + 'Z';
  
  // For GET request, digest is hash of empty string
  const digest = crypto.createHash('sha256').update('').digest('base64');
  
  const rawString = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${requestTarget}`,
    `Digest:${digest}`
  ].join('\n');
  
  const hmac = crypto.createHmac('sha256', sharedKey).update(rawString).digest('base64');
  const signature = `HMACSHA256=${hmac}`;
  
  const headers = {
    'Client-Id': clientId,
    'Request-Id': requestId,
    'Request-Timestamp': timestamp,
    'Signature': signature
  };
  
  console.log("Sending check status request to:", endpoint);
  const response = await fetch(endpoint, { headers });
  
  console.log("Response HTTP status:", response.status);
  const data = await response.json();
  console.log("Response data:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
