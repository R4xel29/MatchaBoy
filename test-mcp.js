const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.paymentSettings.findFirst();
  if (!settings) {
    console.error('No payment settings found in database');
    return;
  }

  console.log('Loaded settings:', {
    dokuClientId: settings.dokuClientId,
    dokuSandbox: settings.dokuSandbox,
    dokuSharedKeyLength: settings.dokuSharedKey ? settings.dokuSharedKey.length : 0,
  });

  const clientId = settings.dokuClientId;
  const sharedKey = settings.dokuSharedKey;
  const isSandbox = settings.dokuSandbox;

  const defaultMcpUrl = isSandbox 
    ? 'https://api-sandbox.doku.com/doku-mcp-server/mcp'
    : 'https://api.doku.com/doku-mcp-server/mcp';
  
  const mcpUrl = process.env.DOKU_MCP_URL || defaultMcpUrl;
  console.log('Target URL:', mcpUrl);

  const authHeader = 'Basic ' + Buffer.from(`${sharedKey}:`).toString('base64');
  const invoiceNumber = 'TEST-' + Date.now();
  const amountStr = Number(10000).toFixed(2);
  const postalCodeStr = '67215';

  const requestBody = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'create_qris_payment',
      arguments: {
        toolRequest: {
          amount: amountStr,
          partnerReferenceNo: invoiceNumber,
          postalCode: postalCodeStr
        }
      }
    }
  };

  console.log('Request Headers:', {
    'Content-Type': 'application/json',
    'Client-Id': clientId,
    'Authorization': 'Basic [REDACTED]',
    'Accept': 'application/json, text/event-stream'
  });
  console.log('Request Body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': clientId,
        'Authorization': authHeader,
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('Response Text:', text);

    try {
      const data = JSON.parse(text);
      console.log('Parsed JSON:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Failed to parse response as JSON');
    }
  } catch (error) {
    console.error('Fetch Exception:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
