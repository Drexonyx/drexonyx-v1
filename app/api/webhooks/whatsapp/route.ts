// DR 0125: WhatsApp webhook stub — provider-independent foundation.
// GET: Meta webhook verification challenge (requires WHATSAPP_WEBHOOK_VERIFY_TOKEN).
// POST: Acknowledges receipt. Full processing requires WHATSAPP_APP_SECRET to be set.
//
// SECURITY (DR 0125 §2.9):
//   - WHATSAPP_WEBHOOK_VERIFY_TOKEN and WHATSAPP_APP_SECRET are server-side only
//   - organizationId is NEVER derived from message content
//   - No financial mutations, no autonomous replies, no outbound sends
//   - All inbound message text is untrusted external data

import { NextRequest, NextResponse } from 'next/server';

// GET: Meta webhook verification challenge.
// Meta sends: ?hub.mode=subscribe&hub.challenge=<token>&hub.verify_token=<configured>
// We respond with hub.challenge as plain text if hub.verify_token matches.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');

  const configuredToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!configuredToken) {
    return new NextResponse('Provider not configured', { status: 403 });
  }

  if (mode === 'subscribe' && verifyToken === configuredToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Inbound message receiver.
// Until WHATSAPP_APP_SECRET is provisioned, all POSTs are acknowledged and dropped.
// Signature verification and message processing require the provider secret.
export async function POST(_request: NextRequest): Promise<NextResponse> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    // Provider not yet configured. Acknowledge to prevent webhook disconnection
    // if Meta tests the endpoint. No message processing without credentials.
    return NextResponse.json(
      { received: true, status: 'provider_not_configured' },
      { status: 200 },
    );
  }

  // Provider configured path (future implementation once B1–B5 resolved):
  // 1. Read raw body for HMAC verification
  // 2. Verify X-Hub-Signature-256 using WHATSAPP_APP_SECRET
  // 3. Parse payload; resolve organizationId from registered phone number (server-side only)
  // 4. Classify message via communication.whatsapp.classify skill
  // 5. Delegate to whatsapp-inquiry-specialist (ROUTE_WHATSAPP_INQUIRY task)
  // 6. Return { received: true } within provider's response deadline

  // This path is reached only when WHATSAPP_APP_SECRET is set.
  // Without a registered phone number → org mapping, we cannot safely process.
  return NextResponse.json(
    { received: true, status: 'provider_configured_processing_pending' },
    { status: 200 },
  );
}
