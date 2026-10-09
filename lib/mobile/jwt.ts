// Mobile JWT utilities — HS256, no external deps.
// Secret: MOBILE_JWT_SECRET env var. Never expose to client.

import { createHmac } from 'crypto';

const DEFAULT_EXPIRY_DAYS = 60;

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeB64url(s: string): string {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function getSecret(): string {
  const s = process.env.MOBILE_JWT_SECRET;
  if (!s) throw new Error('MOBILE_JWT_SECRET is not set');
  return s;
}

export function signMobileJWT(
  payload: Record<string, unknown>,
  expiresInDays = DEFAULT_EXPIRY_DAYS,
): string {
  const secret = getSecret();
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(
    Buffer.from(
      JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + expiresInDays * 86400,
      }),
    ),
  );
  const sig = b64url(
    createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest(),
  );
  return `${header}.${body}.${sig}`;
}

export interface MobileJWTPayload {
  userId: string;
  organizationId: string;
  role: string;
  email: string;
  displayName: string;
  exp: number;
  iat: number;
}

export function verifyMobileJWT(token: string): MobileJWTPayload | null {
  try {
    const secret = getSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = b64url(
      createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest(),
    );
    if (sig !== expected) return null;
    const payload = JSON.parse(decodeB64url(body)) as MobileJWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function mobileAuthHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Client',
  };
}

export function parseBearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}
