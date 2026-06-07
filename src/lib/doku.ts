import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
      name: payload.customerName || 'Matchaboy Customer',
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

    const calculatedBuf = Buffer.from(calculatedSignature);
    const receivedBuf = Buffer.from(receivedSignature);

    // Safe comparison of the first signature (minified body)
    const isMinifiedValid = calculatedBuf.length === receivedBuf.length && crypto.timingSafeEqual(
      calculatedBuf,
      receivedBuf
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

    const calculatedRawBuf = Buffer.from(calculatedSignatureRaw);
    return calculatedRawBuf.length === receivedBuf.length && crypto.timingSafeEqual(
      calculatedRawBuf,
      receivedBuf
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
  const nmid = customNmid || 'ID1020211516086';
  // Standardize NMID to remove whitespace/newlines
  const cleanNmid = nmid.replace(/\s+/g, '');
  
  if (cleanNmid.startsWith('26')) {
    qris += cleanNmid;
  } else {
    // Standard EMVCo Tag 26 format for Indonesia:
    // Sub-tag 00: Globally Unique Identifier (typically "ID.CO.QRIS.WWW")
    const sub00 = "ID.CO.QRIS.WWW";
    // Sub-tag 01: National Merchant ID (NMID), standard is 15 chars (e.g. ID1026519394351)
    const nmidVal = cleanNmid.length >= 15 ? cleanNmid.substring(0, 15) : cleanNmid.padEnd(15, '0');
    // Sub-tag 02: Merchant ID / Terminal ID (often defaults to "A01" or similar)
    const terminalVal = cleanNmid.length > 15 ? cleanNmid.substring(15) : "000";
    
    const subTag00 = "00" + String(sub00.length).padStart(2, '0') + sub00;
    const subTag01 = "01" + String(nmidVal.length).padStart(2, '0') + nmidVal;
    const subTag02 = "02" + String(terminalVal.length).padStart(2, '0') + terminalVal;
    
    const subTags = subTag00 + subTag01 + subTag02;
    qris += '26' + String(subTags.length).padStart(2, '0') + subTags;
  }
  
  qris += '52045812'; // Merchant Category Code (MCC: Restaurants)
  qris += '5303360';  // Currency: 360 (IDR)
  
  const amtStr = String(Math.round(amount));
  qris += '54' + String(amtStr.length).padStart(2, '0') + amtStr; // Transaction Amount
  
  qris += '5802ID'; // Country: ID
  const merchantName = "ARUS PAY";
  qris += '59' + String(merchantName.length).padStart(2, '0') + merchantName; // Merchant Name
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

// ============================================================================
// DOKU SNAP DIRECT QRIS (B2B API) IMPLEMENTATION
// ============================================================================

/**
 * Returns standard ISO 8601 offset timestamp e.g. 2026-06-01T20:41:02+07:00
 */
export function getSnapTimestamp(): string {
  const now = new Date();
  
  // Hardcode Jakarta timezone (UTC+7) or local system timezone if needed
  // Using UTC+7 (WIB) since it is standard for SNAP payment APIs in Indonesia
  const offsetMinutes = 7 * 60; // +07:00
  const localTime = new Date(now.getTime() + (offsetMinutes + now.getTimezoneOffset()) * 60000);
  
  const pad = (num: number) => String(num).padStart(2, '0');
  
  const year = localTime.getFullYear();
  const month = pad(localTime.getMonth() + 1);
  const day = pad(localTime.getDate());
  const hours = pad(localTime.getHours());
  const minutes = pad(localTime.getMinutes());
  const seconds = pad(localTime.getSeconds());
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;
}

/**
 * Retrieves the RSA Merchant Private Key.
 * If not defined, dynamically creates a 2048-bit RSA key pair for testing.
 */
export function getPrivateKey(): string {
  // 1. Check environment variable
  if (process.env.DOKU_PRIVATE_KEY) {
    return process.env.DOKU_PRIVATE_KEY.replace(/\\n/g, '\n');
  }

  // 2. Check local file 'private.key' in workspace root
  const rootKeyPath = path.join(process.cwd(), 'private.key');
  if (fs.existsSync(rootKeyPath)) {
    return fs.readFileSync(rootKeyPath, 'utf8');
  }

  // 3. Fallback: Automatically generate persistent 2048-bit RSA keys for sandbox testing
  console.log('[DOKU SNAP] No private key detected. Auto-generating 2048-bit RSA key pair for sandbox...');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  try {
    fs.writeFileSync(rootKeyPath, privateKey, 'utf8');
    fs.writeFileSync(path.join(process.cwd(), 'public.pem'), publicKey, 'utf8');
    console.log('[DOKU SNAP] RSA keys generated successfully!');
    console.log('[DOKU SNAP] Private key saved to: ' + rootKeyPath);
    console.log('[DOKU SNAP] Public key saved to: ' + path.join(process.cwd(), 'public.pem'));
    console.log('[DOKU SNAP] IMPORTANT: Upload this public.pem file into your DOKU Sandbox Merchant Dashboard.');
  } catch (fsErr) {
    console.error('[DOKU SNAP] Failed to persist RSA key files:', fsErr);
  }

  return privateKey;
}

/**
 * Requests a B2B access token from DOKU using an Asymmetric RSA-SHA256 signature.
 */
export async function getSnapAccessToken(clientId: string, isSandbox: boolean): Promise<string> {
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const endpoint = `${baseUrl}/authorization/v1/access-token/b2b`;
  
  const timestamp = getSnapTimestamp();
  const stringToSign = `${clientId}|${timestamp}`;
  
  const privateKey = getPrivateKey();
  
  const signer = crypto.createSign('SHA256');
  signer.update(stringToSign);
  const signature = signer.sign(privateKey, 'base64');
  
  const body = {
    grantType: 'client_credentials'
  };
  
  try {
    console.log(`[DOKU SNAP] Requesting B2B Access Token from ${endpoint}...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CLIENT-KEY': clientId,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    if (!response.ok || !data.accessToken) {
      console.error('[DOKU SNAP ACCESS TOKEN ERROR]', data);
      throw new Error(data.responseMessage || 'Failed to fetch SNAP access token');
    }
    
    console.log('[DOKU SNAP] B2B Access Token retrieved successfully.');
    return data.accessToken;
  } catch (err: any) {
    console.error('[DOKU SNAP ACCESS TOKEN EXCEPTION]', err);
    throw err;
  }
}

/**
 * Generates a dynamic QRIS string using the DOKU SNAP B2B Direct API.
 * This does not redirect and returns the raw EMVCo code string ("qrData").
 */
export async function generateDokuSnapQris(
  creds: DokuCredentials,
  payload: {
    invoiceNumber: string;
    amount: number;
    merchantId?: string;
    terminalId?: string;
    postalCode?: string;
  }
): Promise<string> {
  const { clientId, sharedKey, isSandbox } = creds;
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  
  const requestTarget = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';
  const endpoint = `${baseUrl}${requestTarget}`;
  
  // Obtain B2B Access Token
  const accessToken = await getSnapAccessToken(clientId, isSandbox);
  
  const timestamp = getSnapTimestamp();
  const externalId = `EXT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  
  // Payload for DOKU SNAP QR MPM Generate
  const requestBody = {
    partnerReferenceNo: payload.invoiceNumber,
    amount: {
      value: payload.amount.toFixed(2), // Wajib 2 desimal
      currency: 'IDR'
    },
    merchantId: payload.merchantId || clientId,
    terminalId: payload.terminalId || 'TID001',
    additionalInfo: {
      postalCode: payload.postalCode || '67215',
      feeType: '1'
    }
  };
  
  // Calculate Symmetric Signature:
  // HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":" + Lowercase(HexEncode(SHA-256(minify(RequestBody)))) + ":" + TimeStamp
  const minifiedBody = JSON.stringify(requestBody);
  const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
  
  const stringToSign = `POST:${requestTarget}:${accessToken}:${bodyHash}:${timestamp}`;
  
  const signature = crypto.createHmac('sha512', sharedKey).update(stringToSign).digest('base64');
  
  try {
    console.log(`[DOKU SNAP] Generating Direct QRIS from ${endpoint}...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': clientId,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': 'H2H'
      },
      body: minifiedBody
    });
    
    const data = await response.json();
    console.log('[DOKU SNAP RESPONSE]', JSON.stringify(data, null, 2));
    
    const qrContent = data.qrContent || data.qrData || data.qrCode;
    if (!response.ok || !qrContent) {
      console.error('[DOKU SNAP QRIS ERROR]', data);
      throw new Error(data.responseMessage || 'Failed to generate DOKU SNAP QRIS');
    }
    
    return qrContent;
  } catch (err: any) {
    console.error('[DOKU SNAP QRIS EXCEPTION]', err);
    throw err;
  }
}

/**
 * Queries the status of a previously generated QRIS transaction.
 */
export async function queryDokuSnapQris(
  creds: DokuCredentials,
  payload: {
    originalReferenceNo: string;
    originalPartnerReferenceNo: string;
    merchantId: string;
  }
): Promise<any> {
  const { clientId, sharedKey, isSandbox } = creds;
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const requestTarget = '/snap-adapter/b2b/v1.0/qr/qr-mpm-query';
  const endpoint = `${baseUrl}${requestTarget}`;

  const accessToken = await getSnapAccessToken(clientId, isSandbox);
  const timestamp = getSnapTimestamp();
  const externalId = `EXT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const requestBody = {
    originalReferenceNo: payload.originalReferenceNo,
    originalPartnerReferenceNo: payload.originalPartnerReferenceNo,
    serviceCode: '47',
    merchantId: payload.merchantId
  };

  const minifiedBody = JSON.stringify(requestBody);
  const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
  const stringToSign = `POST:${requestTarget}:${accessToken}:${bodyHash}:${timestamp}`;
  const signature = crypto.createHmac('sha512', sharedKey).update(stringToSign).digest('base64');

  try {
    console.log(`[DOKU SNAP] Querying QRIS status from ${endpoint}...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': clientId,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': 'H2H'
      },
      body: minifiedBody
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[DOKU SNAP QUERY ERROR]', data);
      throw new Error(data.responseMessage || `Query QRIS failed with status ${response.status}`);
    }
    return data;
  } catch (err: any) {
    console.error('[DOKU SNAP QUERY EXCEPTION]', err);
    throw err;
  }
}

/**
 * Initiates a refund for a successful QRIS transaction.
 */
export async function refundDokuSnapQris(
  creds: DokuCredentials,
  payload: {
    merchantId: string;
    originalPartnerReferenceNo: string;
    originalReferenceNo: string;
    partnerRefundNo: string;
    refundAmountValue: number;
    reason: string;
    approvalCode: string;
  }
): Promise<any> {
  const { clientId, sharedKey, isSandbox } = creds;
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const requestTarget = '/snap-adapter/b2b/v1.0/qr/qr-mpm-refund';
  const endpoint = `${baseUrl}${requestTarget}`;

  const accessToken = await getSnapAccessToken(clientId, isSandbox);
  const timestamp = getSnapTimestamp();
  const externalId = `EXT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const requestBody = {
    merchantId: payload.merchantId,
    originalPartnerReferenceNo: payload.originalPartnerReferenceNo,
    originalReferenceNo: payload.originalReferenceNo,
    partnerRefundNo: payload.partnerRefundNo,
    refundAmount: {
      value: payload.refundAmountValue.toFixed(2),
      currency: 'IDR'
    },
    reason: payload.reason,
    additionalInfo: {
      approvalCode: payload.approvalCode
    }
  };

  const minifiedBody = JSON.stringify(requestBody);
  const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
  const stringToSign = `POST:${requestTarget}:${accessToken}:${bodyHash}:${timestamp}`;
  const signature = crypto.createHmac('sha512', sharedKey).update(stringToSign).digest('base64');

  try {
    console.log(`[DOKU SNAP] Requesting QRIS refund from ${endpoint}...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': clientId,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': 'H2H'
      },
      body: minifiedBody
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[DOKU SNAP REFUND ERROR]', data);
      throw new Error(data.responseMessage || `Refund QRIS failed with status ${response.status}`);
    }
    return data;
  } catch (err: any) {
    console.error('[DOKU SNAP REFUND EXCEPTION]', err);
    throw err;
  }
}

/**
 * Decodes a scanned QRIS code to retrieve transaction/merchant info.
 */
export async function decodeDokuSnapQris(
  creds: DokuCredentials,
  payload: {
    partnerReferenceNo: string;
    qrContent: string;
    scanTime?: string;
  }
): Promise<any> {
  const { clientId, sharedKey, isSandbox } = creds;
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const requestTarget = '/snap-adapter/b2b/v1.0/qr/qr-mpm-decode';
  const endpoint = `${baseUrl}${requestTarget}`;

  const accessToken = await getSnapAccessToken(clientId, isSandbox);
  const timestamp = getSnapTimestamp();
  const externalId = `EXT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const requestBody = {
    partnerReferenceNo: payload.partnerReferenceNo,
    qrContent: payload.qrContent,
    scanTime: payload.scanTime || timestamp
  };

  const minifiedBody = JSON.stringify(requestBody);
  const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
  const stringToSign = `POST:${requestTarget}:${accessToken}:${bodyHash}:${timestamp}`;
  const signature = crypto.createHmac('sha512', sharedKey).update(stringToSign).digest('base64');

  try {
    console.log(`[DOKU SNAP] Requesting QRIS decode from ${endpoint}...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': clientId,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': 'H2H'
      },
      body: minifiedBody
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[DOKU SNAP DECODE ERROR]', data);
      throw new Error(data.responseMessage || `Decode QRIS failed with status ${response.status}`);
    }
    return data;
  } catch (err: any) {
    console.error('[DOKU SNAP DECODE EXCEPTION]', err);
    throw err;
  }
}

/**
 * Processes a payment for a decoded QRIS code (B2B2C wallet integration).
 */
export async function payDokuSnapQris(
  creds: DokuCredentials,
  customerToken: string,
  payload: {
    partnerReferenceNo: string;
    amountValue: number;
    feeAmountValue?: number;
    qrContent: string;
  }
): Promise<any> {
  const { clientId, sharedKey, isSandbox } = creds;
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const requestTarget = '/snap-adapter/b2b2c/v1.0/qr/qr-mpm-payment';
  const endpoint = `${baseUrl}${requestTarget}`;

  const accessToken = await getSnapAccessToken(clientId, isSandbox);
  const timestamp = getSnapTimestamp();
  const externalId = `EXT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const requestBody: any = {
    partnerReferenceNo: payload.partnerReferenceNo,
    amount: {
      value: payload.amountValue.toFixed(2),
      currency: 'IDR'
    },
    additionalInfo: {
      qrContent: payload.qrContent
    }
  };

  if (payload.feeAmountValue !== undefined) {
    requestBody.feeAmount = {
      value: payload.feeAmountValue.toFixed(2),
      currency: 'IDR'
    };
  }

  const minifiedBody = JSON.stringify(requestBody);
  const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
  const stringToSign = `POST:${requestTarget}:${accessToken}:${bodyHash}:${timestamp}`;
  const signature = crypto.createHmac('sha512', sharedKey).update(stringToSign).digest('base64');

  try {
    console.log(`[DOKU SNAP] Sending QRIS payment from ${endpoint}...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Authorization-Customer': customerToken.startsWith('Bearer ') ? customerToken : `Bearer ${customerToken}`,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': clientId,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': 'H2H'
      },
      body: minifiedBody
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[DOKU SNAP PAYMENT ERROR]', data);
      throw new Error(data.responseMessage || `Payment QRIS failed with status ${response.status}`);
    }
    return data;
  } catch (err: any) {
    console.error('[DOKU SNAP PAYMENT EXCEPTION]', err);
    throw err;
  }
}

/**
 * Cancels or sets an expiry status on a QRIS transaction.
 */
export async function cancelDokuSnapQris(
  creds: DokuCredentials,
  payload: {
    partnerReferenceNo: string;
    referenceNo: string;
    merchantId: string;
    reason: string;
  }
): Promise<any> {
  const { clientId, sharedKey, isSandbox } = creds;
  const baseUrl = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
  const requestTarget = '/snap-adapter/b2b/v1.0/qr/qr-expire';
  const endpoint = `${baseUrl}${requestTarget}`;

  const accessToken = await getSnapAccessToken(clientId, isSandbox);
  const timestamp = getSnapTimestamp();
  const externalId = `EXT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const requestBody = {
    partnerReferenceNo: payload.partnerReferenceNo,
    referenceNo: payload.referenceNo,
    merchantId: payload.merchantId,
    reason: payload.reason
  };

  const minifiedBody = JSON.stringify(requestBody);
  const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
  const stringToSign = `POST:${requestTarget}:${accessToken}:${bodyHash}:${timestamp}`;
  const signature = crypto.createHmac('sha512', sharedKey).update(stringToSign).digest('base64');

  try {
    console.log(`[DOKU SNAP] Cancelling QRIS transaction from ${endpoint}...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': clientId,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': 'H2H'
      },
      body: minifiedBody
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[DOKU SNAP CANCEL ERROR]', data);
      throw new Error(data.responseMessage || `Cancel QRIS failed with status ${response.status}`);
    }
    return data;
  } catch (err: any) {
    console.error('[DOKU SNAP CANCEL EXCEPTION]', err);
    throw err;
  }
}

