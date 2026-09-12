// Inquiry → Campaign conversion — OWNER/ADMIN_OPERATIONS only.
// DR 0105/0106: provisions a client org + user, creates a campaign in the
// production org, creates a brief from inquiry content, marks inquiry CONVERTED.
// Atomic single DB transaction. Password generated server-side; never logged.
// organizationId for actor always from server-side JWT.

import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { organizations } from '@/db/schema/core';
import { users, orgMemberships } from '@/db/schema/identity';
import { inquiries, campaigns, briefs } from '@/db/schema/commercial';
import { auditEvents } from '@/db/schema/system';
import { uuidv7 } from 'uuidv7';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import type { AdminRole } from './types';
export { slugFromName } from './slug-utils';

const CONVERT_ROLES: AdminRole[] = ['OWNER', 'ADMIN_OPERATIONS'];
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const BCRYPT_COST = 12;
const GENERATED_PASSWORD_BYTES = 18;

export type ConvertInquiryResult =
  | { ok: true; campaignId: string; organizationId: string; userId: string; temporaryPassword: string }
  | { ok: false; reason: string };

export async function convertInquiry(params: {
  inquiryId: string;
  organizationName: string;
  organizationSlug: string;
  userEmail: string;
  userDisplayName: string;
  actorId: string;
  actorOrganizationId: string;
  actorRole: AdminRole;
}): Promise<ConvertInquiryResult> {
  const {
    inquiryId,
    organizationName,
    organizationSlug,
    userEmail,
    userDisplayName,
    actorId,
    actorOrganizationId,
    actorRole,
  } = params;

  if (!CONVERT_ROLES.includes(actorRole)) {
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
    return { ok: false, reason: 'Slug must contain only lowercase letters, digits, and hyphens' };
  }

  const emailT = userEmail.trim().toLowerCase();
  if (!emailT.includes('@') || emailT.length < 3 || emailT.length > 255) {
    return { ok: false, reason: 'Invalid email address' };
  }

  const displayNameT = userDisplayName.trim();
  if (displayNameT.length < 1 || displayNameT.length > 255) {
    return { ok: false, reason: 'Display name must be 1–255 characters' };
  }

  // Idempotency guard before bcrypt (avoid hashing on already-converted inquiries)
  const existing = await db
    .select({ status: inquiries.status, campaign_objective: inquiries.campaign_objective, target_audience: inquiries.target_audience, additional_notes: inquiries.additional_notes })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1);

  if (!existing[0]) {
    return { ok: false, reason: 'Inquiry not found' };
  }
  if (existing[0].status === 'CONVERTED') {
    return { ok: false, reason: 'ALREADY_CONVERTED' };
  }

  const campaignObjective = existing[0].campaign_objective;
  const targetAudience = existing[0].target_audience;
  const additionalNotes = existing[0].additional_notes;

  // Generate password outside transaction — bcrypt is CPU-bound async
  const temporaryPassword = randomBytes(GENERATED_PASSWORD_BYTES).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_COST);

  const newOrgId = uuidv7();
  const newUserId = uuidv7();
  const clientMembershipId = uuidv7();
  const productionMembershipId = uuidv7();
  const campaignId = uuidv7();
  const briefId = uuidv7();

  try {
    await db.transaction(async (tx) => {
      // 1. Client organization
      await tx.insert(organizations).values({
        id: newOrgId,
        name: nameT,
        slug: slugT,
      });

      // 2. Client user
      await tx.insert(users).values({
        id: newUserId,
        email: emailT,
        display_name: displayNameT,
        password_hash: passwordHash,
      });

      // 3. CLIENT membership in client org
      await tx.insert(orgMemberships).values({
        id: clientMembershipId,
        organization_id: newOrgId,
        user_id: newUserId,
        role: 'CLIENT',
      });

      // 4. DR 0106: CLIENT membership in production org
      await tx.insert(orgMemberships).values({
        id: productionMembershipId,
        organization_id: actorOrganizationId,
        user_id: newUserId,
        role: 'CLIENT',
      });

      // 5. Campaign in production org (DR 0106)
      await tx.insert(campaigns).values({
        id: campaignId,
        organization_id: actorOrganizationId,
        name: nameT,
        status: 'DRAFT',
        objective: campaignObjective,
      });

      // 6. Brief with inquiry content (DR 0070 content fields)
      await tx.insert(briefs).values({
        id: briefId,
        campaign_id: campaignId,
        organization_id: actorOrganizationId,
        status: 'DRAFT',
        brief_text: campaignObjective,
        target_audience: targetAudience ?? null,
        additional_notes: additionalNotes ?? null,
      });

      // 7. Mark inquiry CONVERTED
      await tx
        .update(inquiries)
        .set({ status: 'CONVERTED', updated_at: new Date() })
        .where(eq(inquiries.id, inquiryId));

      // 8. Audit events
      await tx.insert(auditEvents).values({
        id: uuidv7(),
        organization_id: actorOrganizationId,
        entity_type: 'inquiry',
        entity_id: inquiryId,
        actor_id: actorId,
        actor_role: actorRole,
        action: 'INQUIRY_CONVERTED',
        payload: {
          inquiry_id: inquiryId,
          client_organization_id: newOrgId,
          client_user_id: newUserId,
          campaign_id: campaignId,
          brief_id: briefId,
        },
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
          source: 'inquiry_conversion',
          inquiry_id: inquiryId,
        },
      });
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

  return { ok: true, campaignId, organizationId: newOrgId, userId: newUserId, temporaryPassword };
}
