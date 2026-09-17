// Task-scoped service tokens for specialist agent autonomous access (Architecture v2 §20 P2).
// Tokens expire after 4 hours. Raw token is returned once at creation; only the HMAC hash
// is persisted. Tokens may be explicitly revoked before expiry.
// AUTH_SECRET is used as the HMAC key — server-side only, never logged or exposed.

import { db } from '@/db/index';
import { taskTokens } from '@/db/schema/orchestration';
import { eq, and, gt } from 'drizzle-orm';
import { createHmac, randomBytes } from 'crypto';
import { uuidv7 } from 'uuidv7';

const TOKEN_LIFETIME_MS = 4 * 60 * 60 * 1000; // 4 hours per Architecture v2 §19

function hashToken(rawToken: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is required for task token hashing');
  return createHmac('sha256', secret).update(rawToken).digest('hex');
}

// ── createTaskToken ───────────────────────────────────────────────────────────

export type CreateTokenResult =
  | { ok: true; tokenId: string; rawToken: string; expiresAt: Date }
  | { ok: false; error: string };

export async function createTaskToken(params: {
  taskId: string;
  organizationId: string;
}): Promise<CreateTokenResult> {
  try {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS);
    const id = uuidv7();

    await db.insert(taskTokens).values({
      id,
      agent_task_id: params.taskId,
      organization_id: params.organizationId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return { ok: true, tokenId: id, rawToken, expiresAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create task token';
    return { ok: false, error: message };
  }
}

// ── verifyTaskToken ───────────────────────────────────────────────────────────

export type VerifyTokenResult =
  | { ok: true; taskId: string; organizationId: string }
  | { ok: false; error: string };

export async function verifyTaskToken(params: {
  tokenId: string;
  rawToken: string;
  organizationId: string;
}): Promise<VerifyTokenResult> {
  const now = new Date();

  const rows = await db
    .select()
    .from(taskTokens)
    .where(
      and(
        eq(taskTokens.id, params.tokenId),
        eq(taskTokens.organization_id, params.organizationId),
        gt(taskTokens.expires_at, now),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return { ok: false, error: 'Token not found or expired' };
  }

  const token = rows[0];

  if (token.revoked_at) {
    return { ok: false, error: 'Token has been revoked' };
  }

  let expectedHash: string;
  try {
    expectedHash = hashToken(params.rawToken);
  } catch {
    return { ok: false, error: 'Token verification failed' };
  }

  if (token.token_hash !== expectedHash) {
    return { ok: false, error: 'Invalid token' };
  }

  return { ok: true, taskId: token.agent_task_id, organizationId: token.organization_id };
}

// ── revokeTaskToken ───────────────────────────────────────────────────────────

export async function revokeTaskToken(params: {
  tokenId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .update(taskTokens)
    .set({ revoked_at: new Date() })
    .where(
      and(
        eq(taskTokens.id, params.tokenId),
        eq(taskTokens.organization_id, params.organizationId),
      ),
    );
}
