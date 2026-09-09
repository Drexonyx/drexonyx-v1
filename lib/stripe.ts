// DR 0044, DR 0045: Stripe client — server-side only.
// Never import this from client components or expose the secret key to the browser.

import Stripe from 'stripe';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(secretKey, { apiVersion: '2026-08-26.dahlia' });
}

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = getStripeClient();
  }
  return _stripe;
}

// Named export for convenience in server code.
// Do not use in tests — mock getStripe() instead.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

export const STRIPE_WEBHOOK_SECRET_KEY = 'STRIPE_WEBHOOK_SECRET';
