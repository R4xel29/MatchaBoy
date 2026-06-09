import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.paymentSettings.findFirst();
  if (!settings) {
    console.error('No payment settings found in database');
    return;
  }

  const clientId = settings.dokuClientId;
  const sharedKey = settings.dokuSharedKey;
  const isSandbox = settings.dokuSandbox;

  const defaultMcpUrl = isSandbox 
    ? 'https://api-sandbox.doku.com/doku-mcp-server/mcp'
    : 'https://api.doku.com/doku-mcp-server/mcp';
  
  const mcpUrl = process.env.DOKU_MCP_URL || defaultMcpUrl;
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

  console.log('Target URL:', mcpUrl);
  console.log('Client-Id:', clientId);

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
    console.error('Fetch Exception:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
