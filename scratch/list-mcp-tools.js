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
  const sharedKey = settings.dokuSharedKey;

  const mcpUrl = 'https://mcp.doku.com/mcp';
  const authHeader = 'Basic ' + Buffer.from(`${sharedKey}:`).toString('base64');

  const requestBody = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/list',
    params: {}
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
