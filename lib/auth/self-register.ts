// Customer self-registration. Server-side only.
// Follows the same org+user+CLIENT membership pattern as provisionClient() (DR 0105/DR 0106).
// Password: caller-supplied, bcryptjs cost 12. No admin authority required.

import { db } from '@/db/index';
import { organizations } from '@/db/schema/core';
import { users, orgMemberships } from '@/db/schema/identity';
import { uuidv7 } from 'uuidv7';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SelfRegisterResult =
  | { ok: true; organizationId: string; userId: string }
  | { ok: false; reason: string };

function slugFromEmail(email: string): string {
  const local = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
  const suffix = uuidv7().slice(-6);
  return `${local}-${suffix}`;
}

export async function selfRegisterClient(params: {
  email: string;
  password: string;
  displayName: string;
}): Promise<SelfRegisterResult> {
  const { email, password, displayName } = params;

  const emailT = email.trim().toLowerCase();
  if (!EMAIL_RE.test(emailT) || emailT.length > 255) {
    return { ok: false, reason: 'Invalid email address.' };
  }

  const nameT = displayName.trim();
  if (nameT.length < 1 || nameT.length > 255) {
    return { ok: false, reason: 'Name must be between 1 and 255 characters.' };
  }

  if (password.length < 8 || password.length > 128) {
    return { ok: false, reason: 'Password must be 8–128 characters.' };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const newOrgId = uuidv7();
  const newUserId = uuidv7();
  const orgSlug = slugFromEmail(emailT);

  const productionOrgId = process.env.DREXONYX_ORG_ID ?? null;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(organizations).values({
        id: newOrgId,
        name: nameT,
        slug: orgSlug,
      });

      await tx.insert(users).values({
        id: newUserId,
        email: emailT,
        display_name: nameT,
        password_hash: passwordHash,
      });

      // Membership in the user's own org
      await tx.insert(orgMemberships).values({
        id: uuidv7(),
        organization_id: newOrgId,
        user_id: newUserId,
        role: 'CLIENT',
      });

      // DR 0106: membership in DREXONYX production org so portal queries resolve correctly.
      // If DREXONYX_ORG_ID is not set (dev), the own-org membership is used as fallback.
      if (productionOrgId) {
        await tx.insert(orgMemberships).values({
          id: uuidv7(),
          organization_id: productionOrgId,
          user_id: newUserId,
          role: 'CLIENT',
        });
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes('users_email_unique') ||
      (msg.toLowerCase().includes('unique') && msg.toLowerCase().includes('email'))
    ) {
      return { ok: false, reason: 'An account with that email already exists.' };
    }
    if (
      msg.includes('organizations_slug_unique') ||
      (msg.toLowerCase().includes('unique') && msg.toLowerCase().includes('slug'))
    ) {
      return { ok: false, reason: 'Please try again.' };
    }
    throw e;
  }

  return { ok: true, organizationId: productionOrgId ?? newOrgId, userId: newUserId };
}
