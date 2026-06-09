async function main() {
  const clientId = 'BRN-0255-1779122436223';
  const sharedKey = 'doku_key_43f1a9d33f2a4cfabf847233f91fc40d';
  const mcpUrl = 'https://api-sandbox.doku.com/doku-mcp-server/mcp';

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

main().catch(console.error);
