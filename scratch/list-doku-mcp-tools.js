const DOKU_CONFIG = {
  url: 'https://api-sandbox.doku.com/doku-mcp-server/mcp',
  headers: {
    'Client-Id': 'BRN-0255-1779122436223',
    'Authorization': 'Basic U0stbkp4WFhBOXQ3cE1XSlNUbnVBWHk6',
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  }
};

async function listTools() {
  try {
    console.log("Calling Doku MCP Server via fetch to list tools...");
    const response = await fetch(DOKU_CONFIG.url, {
      method: 'POST',
      headers: DOKU_CONFIG.headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: {}
      })
    });
    console.log("Response status:", response.status);
    const data = await response.json();
    if (data.result && data.result.tools) {
      const qrisTool = data.result.tools.find(t => t.name === 'get_transaction_by_invoice_number');
      if (qrisTool) {
        console.log("Found get_transaction_by_invoice_number schema:");
        console.log(JSON.stringify(qrisTool, null, 2));
      } else {
        console.log("Tool get_transaction_by_invoice_number not found.");
      }
    } else {
      console.log("Response:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error calling Doku MCP Server:", error.message);
  }
}

listTools();
