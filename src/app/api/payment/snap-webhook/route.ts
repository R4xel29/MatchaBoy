import { NextRequest } from 'next/server';
import { POST as DokuWebhookPost } from '../doku-webhook/route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Directly pass the request to the robust doku-webhook handler
  // This ensures that regardless of whether DOKU hits /doku-webhook or /snap-webhook,
  // it processes the payload and signature perfectly using the tested V1 logic.
  console.log('[SNAP WEBHOOK] Forwarding request to DOKU Webhook handler...');
  return DokuWebhookPost(req);
}
