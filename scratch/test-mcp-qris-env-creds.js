const DOKU_CONFIG = {
  url: 'https://api-sandbox.doku.com/doku-mcp-server/mcp',
  headers: {
    'Client-Id': 'BRN-0255-1779122436223',
    'Authorization': 'Basic ZG9rdV9rZXlfNDNmMWE5ZDMzZjJhNGNmYWJmODQ3MjMzZjkxZmM0MGQ6',
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  }
};

async function createQrisPayment() {
  console.log("Calling create_qris_payment via fetch using .env credentials...");
  try {
    const response = await fetch(DOKU_CONFIG.url, {
      method: 'POST',
      headers: DOKU_CONFIG.headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'create_qris_payment',
          arguments: {
            toolRequest: {
              amount: '10000.00',
              partnerReferenceNo: `INV-MCP-${Date.now()}`,
              postalCode: '13120',
              validityPeriod: new Date(Date.now() + 60 * 60 * 1000).toISOString().split('.')[0] + 'Z' // 1 hour validity
            }
          }
        }
      })
    });
    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error calling Doku MCP Server:", error.message);
  }
}

createQrisPayment();
