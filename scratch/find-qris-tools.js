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
    const data = await response.json();
    if (data.result && data.result.tools) {
      const qrisTools = data.result.tools.filter(t => 
        t.name.toLowerCase().includes('qris') || 
        t.description.toLowerCase().includes('qris')
      );
      console.log(`Found ${qrisTools.length} QRIS-related tools:`);
      console.log(JSON.stringify(qrisTools, null, 2));
    } else {
      console.log("No result/tools found:", data);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

listTools();
