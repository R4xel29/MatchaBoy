const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function main() {
  const settings = await prisma.paymentSettings.findFirst();
  if (!settings) {
    console.error('No payment settings found');
    return;
  }

  const clientId = settings.dokuClientId;
  // Use the key provided by the user
  const apiKey = 'doku_key_43f1a9d33f2a4cfabf847233f91fc40d';

  const mcpUrl = 'https://mcp.doku.com/mcp';
  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');

  const requestBody = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'create_qris_payment',
      arguments: {
        toolRequest: {
          amount: '10000.00',
          partnerReferenceNo: 'MB' + String(Date.now()).slice(-8),
          postalCode: '67215'
        }
      }
    }
  };

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
    const text = await response.text();
    console.log('Response Text:', text);
  } catch (error) {
    console.error('Exception:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
