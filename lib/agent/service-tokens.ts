// DR 0065: Scoped Service Token — opaque, 256-bit CSPRNG, hash-only storage.
// Raw token NEVER persisted. Validation via constant-time SHA-256 hash comparison.
// Scope: (organization_id, production_job_id) — enforced server-side on every request.

import { db } from '@/db/index';
import { serviceTokens } from '@/db/schema/system';
import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// 4-hour lifetime: enough for any generation job, limits blast radius on compromise.
const TOKEN_LIFETIME_MS = 4 * 60 * 60 * 1000;

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export type IssueServiceTokenResult =
  | { ok: true; rawToken: string; tokenId: string; expiresAt: Date }
  | { ok: false; reason: string };

// Issues a Scoped Service Token for the given (organizationId, productionJobId).
// Returns the raw token exactly once — it is never stored. If lost, a new token must be issued.
export async function issueServiceToken(params: {
  organizationId: string;
  productionJobId: string;
}): Promise<IssueServiceTokenResult> {
  const { organizationId, productionJobId } = params;

  // 256 bits of CSPRNG entropy (DR 0065 §2.2)
  const rawBytes = randomBytes(32);
  const rawToken = rawBytes.toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS);
  const tokenId = uuidv7();

  await db.insert(serviceTokens).values({
    id: tokenId,
    token_hash: tokenHash,
    organization_id: organizationId,
    production_job_id: productionJobId,
    expires_at: expiresAt,
  });

  return { ok: true, rawToken, tokenId, expiresAt };
}

export type ValidateServiceTokenResult =
  | { ok: true; organizationId: string; productionJobId: string }
  | { ok: false; reason: string };

// Validates a presented raw token. Returns the bound scope on success.
// Enforces: not expired, not revoked, scope matches expected org + job.
export async function validateServiceToken(params: {
  rawToken: string;
  expectedOrganizationId: string;
  expectedProductionJobId: string;
}): Promise<ValidateServiceTokenResult> {
  const { rawToken, expectedOrganizationId, expectedProductionJobId } = params;

  const presentedHash = hashToken(rawToken);

  const rows = await db
    .select({
      token_hash: serviceTokens.token_hash,
      organization_id: serviceTokens.organization_id,
      production_job_id: serviceTokens.production_job_id,
      expires_at: serviceTokens.expires_at,
      revoked_at: serviceTokens.revoked_at,
    })
    .from(serviceTokens)
    .where(eq(serviceTokens.token_hash, presentedHash))
    .limit(1);

  if (rows.length === 0) {
    return { ok: false, reason: 'Token not found' };
  }

  const record = rows[0];

  // Constant-time comparison prevents timing-based token inference (DR 0065 §2.4)
  const storedBuf = Buffer.from(record.token_hash, 'utf8');
  const presentedBuf = Buffer.from(presentedHash, 'utf8');
  if (storedBuf.length !== presentedBuf.length || !timingSafeEqual(storedBuf, presentedBuf)) {
    return { ok: false, reason: 'Token mismatch' };
  }

  if (record.revoked_at !== null) {
    return { ok: false, reason: 'Token revoked' };
  }

  if (record.expires_at <= new Date()) {
    return { ok: false, reason: 'Token expired' };
  }

  // Scope validation: possession is necessary but not sufficient (DR 0065 §2.4 step 5)
  if (record.organization_id !== expectedOrganizationId) {
    return { ok: false, reason: 'Token scope mismatch: organization_id' };
  }
  if (record.production_job_id !== expectedProductionJobId) {
    return { ok: false, reason: 'Token scope mismatch: production_job_id' };
  }

  return { ok: true, organizationId: record.organization_id, productionJobId: record.production_job_id };
}

export type RevokeServiceTokensResult =
  | { ok: true }
  | { ok: false; reason: string };

// Revokes all active tokens for a (productionJobId, organizationId) pair.
// Called when a ProductionJob reaches a terminal state (DR 0065 §2.8).
export async function revokeServiceTokensForJob(params: {
  productionJobId: string;
  organizationId: string;
}): Promise<RevokeServiceTokensResult> {
  const { productionJobId, organizationId } = params;

  await db
    .update(serviceTokens)
    .set({ revoked_at: new Date() })
    .where(
      and(
        eq(serviceTokens.production_job_id, productionJobId),
        eq(serviceTokens.organization_id, organizationId),
        isNull(serviceTokens.revoked_at),
      ),
    );

  return { ok: true };
}
