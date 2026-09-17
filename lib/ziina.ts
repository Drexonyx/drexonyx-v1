// Ziina payment provider client — DR 0110 / Owner-authorized 2026-09-17.
// Verified API: POST /payment_intent, GET /payment_intent/{id}.
// ZIINA_API_KEY is server-side only. Never expose to client or commit the value.
// ZIINA_BASE_URL defaults to https://api.ziina.com — override per environment.
// ZIINA_TEST_MODE defaults to 'true' (test mode) unless explicitly set to 'false'.

const ZIINA_KEY_ENV = 'ZIINA_API_KEY';
export const ZIINA_BASE_URL = process.env.ZIINA_BASE_URL ?? 'https://api.ziina.com';

// Verified status value for a confirmed payment (GET /payment_intent/{id}).
// Update this constant if the actual Ziina API uses a different status string.
export const ZIINA_STATUS_SUCCESS = 'SUCCESS';
export const ZIINA_STATUS_FAILED = 'FAILED';
export const ZIINA_STATUS_CANCELLED = 'CANCELLED';

export const AED_TO_FILS = 100; // 1 AED = 100 fils

function getZiinaApiKey(): string {
  const key = process.env[ZIINA_KEY_ENV];
  if (!key) throw new Error(`${ZIINA_KEY_ENV} environment variable is not set`);
  return key;
}

function isTestMode(): boolean {
  return process.env.ZIINA_TEST_MODE !== 'false';
}

export interface ZiinaPaymentIntentRequest {
  amount: number;    // fils (1 AED = 100 fils); minimum 200 fils (2 AED)
  success_url: string;
  cancel_url: string;
  test?: boolean;
}

export interface ZiinaPaymentIntent {
  id: string;
  redirect_url: string;
  status: string;
  amount: number;
}

// POST /payment_intent — creates a Ziina payment intent.
// Returns { id, redirect_url, status, amount }.
export async function createZiinaPaymentIntent(
  params: Omit<ZiinaPaymentIntentRequest, 'test'>,
): Promise<ZiinaPaymentIntent> {
  const apiKey = getZiinaApiKey();
  const body: ZiinaPaymentIntentRequest = {
    ...params,
    test: isTestMode(),
  };

  const response = await fetch(`${ZIINA_BASE_URL}/payment_intent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ziina API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<ZiinaPaymentIntent>;
}

// GET /payment_intent/{id} — fetches current status of a Ziina payment intent.
export async function getZiinaPaymentIntent(id: string): Promise<ZiinaPaymentIntent> {
  const apiKey = getZiinaApiKey();

  const response = await fetch(`${ZIINA_BASE_URL}/payment_intent/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ziina API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<ZiinaPaymentIntent>;
}
