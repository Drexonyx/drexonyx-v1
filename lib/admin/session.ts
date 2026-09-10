// DR 0042 / Phase 24: Custom HMAC-SHA256 admin session — replaces Auth.js Credentials
// provider on the admin auth path. Uses Node.js built-in `crypto`; never runs in Edge
// Runtime (this module is imported by Server Components, Server Actions, and Route
// Handlers only, never by middleware).
//
// Secret precedence: ADMIN_SESSION_SECRET → AUTH_SECRET (fallback for zero-new-env-var
// deploys). Both remain server-side only; never exposed to the client.

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import type { AdminSession, AdminRole } from './types';
import { ADMIN_ROLES } from './types';

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION_SEC = 8 * 60 * 60; // 8 hours

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET ?? process.env.AUTH_SECRET;
  if (!s) throw new Error('Admin session secret not configured (set ADMIN_SESSION_SECRET)');
  return s;
}

function b64url(input: string | Buffer): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64url');
}

function fromb64url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

export function createAdminToken(payload: AdminSession): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({
    userId: payload.userId,
    organizationId: payload.organizationId,
    role: payload.role,
    name: payload.name,
    email: payload.email,
    iat: now,
    exp: now + SESSION_DURATION_SEC,
    jti: randomBytes(8).toString('hex'),
  }));
  const sig = createHmac('sha256', getSecret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyAdminToken(token: string): AdminSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;

    const expectedSig = createHmac('sha256', getSecret())
      .update(`${header}.${body}`)
      .digest('base64url');

    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    const parsed = JSON.parse(fromb64url(body));
    const now = Math.floor(Date.now() / 1000);
    if (typeof parsed.exp !== 'number' || parsed.exp < now) return null;
    if (!parsed.userId || !parsed.organizationId || !parsed.role) return null;
    if (!(ADMIN_ROLES as readonly string[]).includes(parsed.role)) return null;

    return {
      userId: String(parsed.userId),
      organizationId: String(parsed.organizationId),
      role: parsed.role as AdminRole,
      name: parsed.name ?? null,
      email: parsed.email ?? null,
    };
  } catch {
    return null;
  }
}

// For use in Server Components and Server Actions (async context, cookies() available)
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

// For use in Route Handlers where you have the Request object directly
export function getAdminSessionFromRequest(
  request: Pick<Request, 'headers'> & { cookies?: { get(name: string): { value: string } | undefined } },
): AdminSession | null {
  // NextRequest has .cookies.get(); plain Request needs cookie header parsing
  if (request.cookies && typeof (request.cookies as { get?: unknown }).get === 'function') {
    const token = (request.cookies as { get(name: string): { value: string } | undefined }).get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyAdminToken(token);
  }
  // Fallback: parse Cookie header
  const cookieHeader = request.headers instanceof Headers
    ? request.headers.get('cookie') ?? ''
    : '';
  const match = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  return verifyAdminToken(match.slice(COOKIE_NAME.length + 1));
}

export function makeSessionCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_SEC}`;
}

export function makeClearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
