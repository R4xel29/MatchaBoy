const combinations = [
  {
    name: "Sandbox with SK-nJx",
    url: 'https://api-sandbox.doku.com/doku-mcp-server/mcp',
    clientId: 'BRN-0255-1779122436223',
    auth: 'Basic U0stbkp4WFhBOXQ3cE1XSlNUbnVBWHk6'
  },
  {
    name: "Sandbox with SK-XdL (Production Key)",
    url: 'https://api-sandbox.doku.com/doku-mcp-server/mcp',
    clientId: 'BRN-0255-1779122436223',
    auth: 'Basic U0stWGRMcGlOMVdFYmExSWJtYWZmM0E6'
  },
  {
    name: "Production with SK-XdL",
    url: 'https://api.doku.com/doku-mcp-server/mcp',
    clientId: 'BRN-0255-1779122436223',
    auth: 'Basic U0stWGRMcGlOMVdFYmExSWJtYWZmM0E6'
  }
];

async function testMcpQris() {
  for (const comb of combinations) {
    console.log(`\nTesting combination: ${comb.name}...`);
    try {
      const response = await fetch(comb.url, {
        method: 'POST',
        headers: {
          'Client-Id': comb.clientId,
          'Authorization': comb.auth,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'create_qris_payment',
            arguments: {
              toolRequest: {
                amount: '10000.00',
                partnerReferenceNo: `INV-${Date.now()}`,
                postalCode: '13120'
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
}

testMcpQris();
