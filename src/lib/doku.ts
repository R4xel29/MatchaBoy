import crypto from 'crypto';

interface DokuCredentials {
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
      name: payload.customerName || 'Matchaboy Customer',
      phone: cleanPhone || '628123456789',
      email: payload.customerEmail || 'customer@matchaboy.com',
    },
  };

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
    const receivedSignature = (headers['signature'] as string) || '';
    const receivedClientId = (headers['client-id'] as string) || '';
    const receivedRequestId = (headers['request-id'] as string) || '';
    const receivedTimestamp = (headers['request-timestamp'] as string) || '';

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

    const calculatedSignature = generateSignature({
      clientId,
      sharedKey,
      requestId: receivedRequestId,
      timestamp: receivedTimestamp,
      requestTarget,
      digest: calculatedDigest,
    });

    // Safe comparison of the first signature (minified body)
    const isMinifiedValid = crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(receivedSignature)
    );

    if (isMinifiedValid) {
      return true;
    }

    console.log('[DOKU WEBHOOK] Minified signature mismatch, attempting rawBody direct digest verification...');

    // Fallback: hash the rawBody string directly in case JSON key order gets perturbed
    const rawDigest = crypto.createHash('sha256').update(rawBody).digest('base64');
    const calculatedSignatureRaw = generateSignature({
      clientId,
      sharedKey,
      requestId: receivedRequestId,
      timestamp: receivedTimestamp,
      requestTarget,
      digest: rawDigest,
    });

    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignatureRaw),
      Buffer.from(receivedSignature)
    );
  } catch (e) {
    console.error('[DOKU WEBHOOK VERIFICATION EXCEPTION]', e);
    return false;
  }
}

/**
 * Generates an authentic EMVCo-compliant QRIS string with a precise CRC16 checksum.
 * This represents the raw dynamic QR code content for direct scanning and billing.
 */
export function generateQrisString(amount: number, orderId: string, customNmid?: string): string {
  let qris = '000201'; // Payload Format Indicator
  qris += '010212';   // Point of Initiation: 12 (Dynamic QR)
  
  // Merchant Account Information (Matchaboy merchant details)
  if (customNmid) {
    // Standardize NMID to remove whitespace/newlines
    const cleanNmid = customNmid.replace(/\s+/g, '');
    
    if (cleanNmid.startsWith('26')) {
      qris += cleanNmid;
    } else {
      // Standard EMVCo Tag 26 format for Indonesia:
      // Sub-tag 00: Globally Unique Identifier (typically "ID.CO.QRIS.WWW")
      const sub00 = "ID.CO.QRIS.WWW";
      // Sub-tag 01: National Merchant ID (NMID), standard is 15 chars (e.g. ID1026519394351)
      const nmidVal = cleanNmid.length >= 15 ? cleanNmid.substring(0, 15) : cleanNmid.padEnd(15, '0');
      // Sub-tag 02: Merchant ID / Terminal ID (often defaults to "A01" or similar)
      const terminalVal = cleanNmid.length > 15 ? cleanNmid.substring(15) : "A01";
      
      const subTag00 = "00" + String(sub00.length).padStart(2, '0') + sub00;
      const subTag01 = "01" + String(nmidVal.length).padStart(2, '0') + nmidVal;
      const subTag02 = "02" + String(terminalVal.length).padStart(2, '0') + terminalVal;
      
      const subTags = subTag00 + subTag01 + subTag02;
      qris += '26' + String(subTags.length).padStart(2, '0') + subTags;
    }
  } else {
    qris += '26330015ID102021151608601030000203000'; 
  }
  
  qris += '52045812'; // Merchant Category Code (MCC: Restaurants)
  qris += '5303360';  // Currency: 360 (IDR)
  
  const amtStr = String(Math.round(amount));
  qris += '54' + String(amtStr.length).padStart(2, '0') + amtStr; // Transaction Amount
  
  qris += '5802ID'; // Country: ID
  qris += '5909MATCHABOY'; // Merchant Name
  qris += '6012PROBOLINGGO'; // City
  qris += '610567215'; // Postal Code
  
  // Additional Data (Invoice / Order reference)
  const orderTag = '01' + String(orderId.length).padStart(2, '0') + orderId;
  qris += '62' + String(orderTag.length).padStart(2, '0') + orderTag;
  
  // CRC16 Checksum calculation
  const stringToCrc = qris + '6304';
  const crc = crc16CcittFalse(stringToCrc).toString(16).toUpperCase().padStart(4, '0');
  
  return stringToCrc + crc;
}

function crc16CcittFalse(str: string): number {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    const code = str.charCodeAt(c);
    crc ^= (code << 8);
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc & 0xFFFF;
}
