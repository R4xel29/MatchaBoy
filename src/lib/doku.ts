import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface DokuCredentials {
  clientId: string;
  sharedKey: string;
  isSandbox: boolean;
}

interface CheckoutPayload {
  invoiceNumber: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  callbackUrl: string;
  notificationUrl?: string; // Webhook URL for DOKU to send payment status
  paymentChannel?: string; // Specific channel code
}

/**
 * Generates the SHA256 base64 Digest of the minified JSON request body.
 */
export function generateDigest(body: any): string {
  const minifiedBody = JSON.stringify(body);
  return crypto.createHash('sha256').update(minifiedBody).digest('base64');
}

/**
 * Generates the DOKU signature for API requests and webhook verification.
 */
export function generateSignature({
  clientId,
  sharedKey,
  requestId,
  timestamp,
  requestTarget,
  digest,
}: {
  clientId: string;
  sharedKey: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  digest: string;
}): string {
  const rawString = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${requestTarget}`,
    `Digest:${digest}`,
  ].join('\n');

  const hmac = crypto.createHmac('sha256', sharedKey).update(rawString).digest('base64');
  return `HMACSHA256=${hmac}`;
}

/**
 * Requests a Hosted Checkout payment link from DOKU.
 * Returns the payment redirect URL.
 */
export async function createDokuCheckoutSession(
  creds: DokuCredentials,
  payload: CheckoutPayload
): Promise<{ url: string; error?: string }> {
  const { clientId, sharedKey, isSandbox } = creds;
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const requestTarget = '/checkout/v1/payment';
  const endpoint = `${baseUrl}${requestTarget}`;

  const requestId = `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const timestamp = new Date().toISOString().split('.')[0] + 'Z'; // UTC ISO 8601 string without milliseconds

  // Standardize phone format for DOKU (remove non-digits, replace leading 0 with 62)
  let cleanPhone = payload.customerPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('62') && cleanPhone.length > 5) {
    cleanPhone = '62' + cleanPhone;
  }

  // DOKU Checkout V1 Body Schema
  const requestBody: any = {
    order: {
      invoice_number: payload.invoiceNumber,
      amount: Math.round(payload.amount),
      callback_url: payload.callbackUrl,
      auto_redirect: true,
    },
    payment: {
      payment_due_date: 60, // 60 minutes expiry
    },
    customer: {
      name: payload.customerName || 'Arum Seduh Customer',
      phone: cleanPhone || '628123456789',
      email: payload.customerEmail || 'arumseduh@gmail.com',
    },
  };

  // Add notification URL for webhook callback
  if (payload.notificationUrl) {
    requestBody.payment.notification_url = [payload.notificationUrl];
  }

  // Pre-select payment method inside Doku hosted checkout if channel is selected
  if (payload.paymentChannel) {
    requestBody.payment.payment_methods = [payload.paymentChannel];
  }

  const digest = generateDigest(requestBody);
  const signature = generateSignature({
    clientId,
    sharedKey,
    requestId,
    timestamp,
    requestTarget,
    digest,
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': clientId,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        'Signature': signature,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[DOKU RESPONSE BODY]', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[DOKU ERROR] Failed DOKU session request:', data);
      return { url: '', error: data.error?.message || 'Failed to connect with DOKU' };
    }

    const paymentUrl = data.response?.payment?.url || data.payment?.url;
    if (paymentUrl) {
      return { url: paymentUrl };
    }

    return { url: '', error: 'Payment URL not found in DOKU response' };
  } catch (error: any) {
    console.error('[DOKU EXCEPTION]', error);
    return { url: '', error: error.message || 'DOKU Connection error' };
  }
}

/**
 * Verifies the incoming webhook request signature from DOKU.
 */
export function verifyDokuWebhookSignature({
  clientId,
  sharedKey,
  headers,
  rawBody,
  requestTarget,
}: {
  clientId: string;
  sharedKey: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
  requestTarget: string;
}): boolean {
  try {
    const normalizedHeaders: Record<string, string> = {};
    for (const [key, val] of Object.entries(headers)) {
      if (val !== undefined) {
        normalizedHeaders[key.toLowerCase()] = Array.isArray(val) ? val[0] : val;
      }
    }

    const receivedSignature = normalizedHeaders['signature'] || '';
    const receivedClientId = normalizedHeaders['client-id'] || '';
    const receivedRequestId = normalizedHeaders['request-id'] || '';
    const receivedTimestamp = normalizedHeaders['request-timestamp'] || '';

    if (!receivedSignature || !receivedClientId || !receivedRequestId || !receivedTimestamp) {
      console.error('[DOKU WEBHOOK] Missing validation headers');
      return false;
    }

    if (receivedClientId !== clientId) {
      console.error('[DOKU WEBHOOK] Client-Id mismatch');
      return false;
    }

    // Minify raw JSON body just in case
    const parsed = JSON.parse(rawBody);
    const minified = JSON.stringify(parsed);
    const calculatedDigest = crypto.createHash('sha256').update(minified).digest('base64');

    const targets = Array.from(new Set([requestTarget, '/api/payment/doku-webhook']));
    const receivedBuf = Buffer.from(receivedSignature);

    let isMinifiedValid = false;
    for (const target of targets) {
      const calculatedSignature = generateSignature({
        clientId,
        sharedKey,
        requestId: receivedRequestId,
        timestamp: receivedTimestamp,
        requestTarget: target,
        digest: calculatedDigest,
      });

      const calculatedBuf = Buffer.from(calculatedSignature);

      if (calculatedBuf.length === receivedBuf.length && crypto.timingSafeEqual(calculatedBuf, receivedBuf)) {
        isMinifiedValid = true;
        console.log(`[DOKU WEBHOOK] Minified signature match with target: ${target}`);
        break;
      }
    }

    if (isMinifiedValid) {
      return true;
    }

    console.log('[DOKU WEBHOOK] Minified signature mismatch, attempting rawBody direct digest verification...');

    // Fallback: hash the rawBody string directly in case JSON key order gets perturbed
    const rawDigest = crypto.createHash('sha256').update(rawBody).digest('base64');
    for (const target of targets) {
      const calculatedSignatureRaw = generateSignature({
        clientId,
        sharedKey,
        requestId: receivedRequestId,
        timestamp: receivedTimestamp,
        requestTarget: target,
        digest: rawDigest,
      });

      const calculatedRawBuf = Buffer.from(calculatedSignatureRaw);
      
      if (calculatedRawBuf.length === receivedBuf.length && crypto.timingSafeEqual(calculatedRawBuf, receivedBuf)) {
        console.log(`[DOKU WEBHOOK] RawBody signature match with target: ${target}`);
        return true;
      }
    }

    console.error('[DOKU WEBHOOK] Signature verification failed for all combinations');
    return false;
  } catch (e) {
    console.error('[DOKU WEBHOOK VERIFICATION EXCEPTION]', e);
    return false;
  }
}


/**
 * Calls the Doku MCP Server to generate a dynamic QRIS string.
 */
export async function createDokuMcpQrisPayment(
  creds: DokuCredentials,
  payload: {
    invoiceNumber: string;
    amount: number;
    postalCode?: string;
  }
): Promise<{ qrContent?: string; qrImageUrl?: string; error?: string }> {
  const { clientId, sharedKey, isSandbox } = creds;
  
  // Use MCP URL from env, or default to sandbox/production base URL + /doku-mcp-server/mcp
  const defaultMcpUrl = isSandbox 
    ? 'https://api-sandbox.doku.com/doku-mcp-server/mcp'
    : 'https://mcp.doku.com/mcp';
  
  const mcpUrl = process.env.DOKU_MCP_URL || defaultMcpUrl;

  // Base64 encode the sharedKey + ":"
  const authHeader = 'Basic ' + Buffer.from(`${sharedKey}:`).toString('base64');
  
  const amountStr = Number(payload.amount).toFixed(2);
  const postalCodeStr = payload.postalCode || '67215';

  const requestBody = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'create_qris_payment',
      arguments: {
        toolRequest: {
          amount: amountStr,
          partnerReferenceNo: payload.invoiceNumber,
          postalCode: postalCodeStr
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

    if (!response.ok) {
      return { error: `DOKU MCP server returned status ${response.status}` };
    }

    const data = await response.json();
    if (data.error) {
      return { error: data.error.message || 'JSON-RPC Error' };
    }

    const toolResultContent = data.result?.content?.[0]?.text;
    if (!toolResultContent) {
      return { error: 'Empty tool response content' };
    }

    const parsedResult = JSON.parse(toolResultContent);
    if (parsedResult.error) {
      return { error: parsedResult.message || parsedResult.error };
    }

    if (parsedResult.qrContent) {
      let qrImageUrl = parsedResult.qrImageUrl;
      if (qrImageUrl) {
        if (!isSandbox) {
          // Production uses mcp.doku.com/api/qr/generate instead of api.doku.com/doku-mcp-server
          qrImageUrl = qrImageUrl.replace('api.doku.com/doku-mcp-server', 'mcp.doku.com');
        } else {
          // Sandbox uses api-sandbox.doku.com/doku-mcp-server
          qrImageUrl = qrImageUrl.replace('api.doku.com', 'api-sandbox.doku.com');
        }
      }
      return { 
        qrContent: parsedResult.qrContent,
        qrImageUrl: qrImageUrl 
      };
    }

    return { error: 'qrContent not found in Doku MCP response' };
  } catch (error: any) {
    console.error('[DOKU MCP QRIS EXCEPTION]', error);
    return { error: error.message || 'DOKU MCP Connection error' };
  }
}




