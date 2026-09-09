// DR 0105: Client provisioning — atomic organization + user + CLIENT membership creation.
// Actor authority: OWNER and ADMIN_OPERATIONS.
// Password: server-generated cryptographically secure random (randomBytes); bcryptjs cost 12.
// Password never logged, never in audit payload, never stored plaintext.
// Slug and email uniqueness enforced by DB UNIQUE constraints (caught and mapped to error codes).
// organizationId for actor always from server-side JWT.

import { db } from '@/db/index';
import { organizations } from '@/db/schema/core';
import { users, orgMemberships } from '@/db/schema/identity';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import type { AdminRole } from './types';

const PROVISION_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];
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

  if (!PROVISION_ROLES.includes(actorRole)) {
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

  // Server-side generated password — never accepted from caller
  const temporaryPassword = randomBytes(GENERATED_PASSWORD_BYTES).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_COST);

  const newOrgId = uuidv7();
  const newUserId = uuidv7();
  const newMembershipId = uuidv7();

  try {
    await db.transaction(async (tx) => {
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
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Map UNIQUE constraint violations to structured error codes
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
