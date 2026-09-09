// DR 0045 §3.4, DR 0047, DR 0048: Stripe webhook endpoint.
// Signature verification is mandatory before any state mutation.
// Raw body must be read before any JSON parsing.

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, STRIPE_WEBHOOK_SECRET_KEY } from '@/lib/stripe';
import {
  handleCheckoutCompleted,
  handleCheckoutFailed,
  handleChargeRefunded,
  handleChargeDisputed,
} from '@/lib/portal/webhook';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env[STRIPE_WEBHOOK_SECRET_KEY];
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Raw body required for HMAC verification — must not parse as JSON first.
  const rawBody = await request.text();

  let event: import('stripe').default.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${msg}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    let result: import('@/lib/portal/webhook').WebhookEventResult;

    switch (event.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutCompleted(event);
        break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        result = await handleCheckoutFailed(event);
        break;
      case 'charge.refunded':
        result = await handleChargeRefunded(event);
        break;
      case 'charge.dispute.created':
        result = await handleChargeDisputed(event);
        break;
      default:
        // Acknowledge unhandled events without error (DR 0045 §3.4)
        return NextResponse.json({ handled: false, eventType: event.type });
    }

    if (!result.handled) {
      console.warn(`Webhook event ${event.id} (${event.type}) not handled: ${result.reason}`);
    }

    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook handler error for ${event.type} (${event.id}): ${msg}`);
    // Return 500 so Stripe retries the event
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
