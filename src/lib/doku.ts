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
  const requestBody = {
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
    if (!response.ok) {
      console.error('[DOKU ERROR] Failed DOKU session request:', data);
      return { url: '', error: data.error?.message || 'Failed to connect with DOKU' };
    }

    if (data.payment?.url) {
      return { url: data.payment.url };
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

    // Compare signature safely
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(receivedSignature)
    );
  } catch (e) {
    console.error('[DOKU WEBHOOK VERIFICATION EXCEPTION]', e);
    return false;
  }
}
