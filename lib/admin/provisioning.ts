// DR 0105: Client provisioning — atomic organization + user + CLIENT membership creation.
// Actor authority: OWNER only (DR 0105 §3.1, Owner decision 1).
// Password: server-generated cryptographically secure random (randomBytes); bcryptjs cost 12.
// Password never logged, never in audit payload, never stored plaintext.
// Idempotency: fast-path via system.idempotency_keys keyed on slug (Owner decision 3).
// Slug and email uniqueness enforced by DB UNIQUE constraints (caught and mapped to error codes).
// organizationId for actor always from server-side JWT.

import { db } from '@/db/index';
import { organizations } from '@/db/schema/core';
import { users, orgMemberships } from '@/db/schema/identity';
import { auditEvents, idempotencyKeys } from '@/db/schema/system';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import type { AdminRole } from './types';

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const BCRYPT_COST = 12;
const GENERATED_PASSWORD_BYTES = 18; // 24-char base64url output

export type ProvisionClientResult =
  | {
      ok: true;
      organizationId: string;
      userId: string;
      membershipId: string;
      temporaryPassword: string;
    }
  | { ok: false; reason: string };

export async function provisionClient(params: {
  organizationName: string;
  organizationSlug: string;
  userEmail: string;
  userDisplayName: string;
  actorId: string;
  actorOrganizationId: string;
  actorRole: AdminRole;
}): Promise<ProvisionClientResult> {
  const {
    organizationName,
    organizationSlug,
    userEmail,
    userDisplayName,
    actorId,
    actorOrganizationId,
    actorRole,
  } = params;

  // DR 0105 §3.1, Owner decision 1: OWNER only
  if (actorRole !== 'OWNER') {
    return { ok: false, reason: 'Insufficient authority' };
  }

  const nameT = organizationName.trim();
  if (nameT.length < 1 || nameT.length > 255) {
    return { ok: false, reason: 'Organization name must be 1–255 characters' };
  }

  const slugT = organizationSlug.trim().toLowerCase();
  if (slugT.length < 1 || slugT.length > 100) {
    return { ok: false, reason: 'Organization slug must be 1–100 characters' };
  }
  if (!SLUG_PATTERN.test(slugT)) {
    return {
      ok: false,
      reason: 'Organization slug must contain only lowercase letters, digits, and hyphens',
    };
  }

  const emailT = userEmail.trim().toLowerCase();
  if (!emailT.includes('@') || emailT.length < 3 || emailT.length > 255) {
    return { ok: false, reason: 'Invalid email address' };
  }

  const displayNameT = userDisplayName.trim();
  if (displayNameT.length < 1 || displayNameT.length > 255) {
    return { ok: false, reason: 'User display name must be 1–255 characters' };
  }

  const idempKey = `CLIENT_PROVISIONED:${slugT}`;

  // DR 0105 §3.6 + Owner decision 3: Fast-path idempotency check
  const existingKey = await db
    .select({ status: idempotencyKeys.status, response_payload: idempotencyKeys.response_payload })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempKey),
        eq(idempotencyKeys.organization_id, actorOrganizationId),
        eq(idempotencyKeys.operation_type, 'CLIENT_PROVISIONED'),
      ),
    )
    .limit(1);

  if (existingKey.length > 0) {
    if (existingKey[0].status === 'COMPLETED') {
      const stored = existingKey[0].response_payload as {
        organizationId: string;
        userId: string;
        membershipId: string;
      } | null;
      return {
        ok: true,
        organizationId: stored?.organizationId ?? '',
        userId: stored?.userId ?? '',
        membershipId: stored?.membershipId ?? '',
        temporaryPassword: '',
      };
    }
    if (existingKey[0].status === 'PROCESSING') {
      return { ok: false, reason: 'IN_PROGRESS' };
    }
  }

  // Server-side generated password — never accepted from caller (Owner decision 2)
  const temporaryPassword = randomBytes(GENERATED_PASSWORD_BYTES).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_COST);

  const newOrgId = uuidv7();
  const newUserId = uuidv7();
  const newMembershipId = uuidv7();

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(idempotencyKeys)
        .values({
          id: uuidv7(),
          key: idempKey,
          organization_id: actorOrganizationId,
          operation_type: 'CLIENT_PROVISIONED',
          status: 'PROCESSING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();

      await tx.insert(organizations).values({
        id: newOrgId,
        name: nameT,
        slug: slugT,
      });

      await tx.insert(users).values({
        id: newUserId,
        email: emailT,
        display_name: displayNameT,
        password_hash: passwordHash,
      });

      await tx.insert(orgMemberships).values({
        id: newMembershipId,
        organization_id: newOrgId,
        user_id: newUserId,
        role: 'CLIENT',
      });

      // DR 0105 §3.7: Audit event 1 — organization provisioned
      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: newOrgId,
        entity_type: 'organization',
        entity_id: newOrgId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'ORGANIZATION_PROVISIONED',
        payload: {
          organization_id: newOrgId,
          organization_name: nameT,
          organization_slug: slugT,
          actor_organization_id: actorOrganizationId,
        },
      });

      // DR 0105 §3.7: Audit event 2 — CLIENT user provisioned
      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: newOrgId,
        entity_type: 'user',
        entity_id: newUserId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'CLIENT_USER_PROVISIONED',
        payload: {
          user_id: newUserId,
          user_email: emailT,
          membership_id: newMembershipId,
          role: 'CLIENT',
          actor_organization_id: actorOrganizationId,
        },
      });

      await tx
        .update(idempotencyKeys)
        .set({
          status: 'COMPLETED',
          response_payload: {
            organizationId: newOrgId,
            userId: newUserId,
            membershipId: newMembershipId,
          },
          updated_at: new Date(),
        })
        .where(
          and(
            eq(idempotencyKeys.key, idempKey),
            eq(idempotencyKeys.organization_id, actorOrganizationId),
          ),
        );
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes('organizations_slug_unique') ||
      (msg.toLowerCase().includes('unique') && msg.toLowerCase().includes('slug'))
    ) {
      return { ok: false, reason: 'SLUG_TAKEN' };
    }
    if (
      msg.includes('users_email_unique') ||
      (msg.toLowerCase().includes('unique') && msg.toLowerCase().includes('email'))
    ) {
      return { ok: false, reason: 'EMAIL_TAKEN' };
    }
    if (msg.toLowerCase().includes('org_memberships') && msg.toLowerCase().includes('unique')) {
      return { ok: false, reason: 'MEMBERSHIP_EXISTS' };
    }
    throw e;
  }

  return {
    ok: true,
    organizationId: newOrgId,
    userId: newUserId,
    membershipId: newMembershipId,
    temporaryPassword,
  };
}
