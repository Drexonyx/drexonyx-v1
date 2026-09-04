import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/index';
import { orgMemberships } from '@/db/schema/identity';
import { isRole, type Role } from './roles';
import { AuthorizationError, TenantIsolationError } from './errors';

export interface MembershipContext {
  userId: string;
  organizationId: string;
  role: Role;
}

// Returns the active (non-archived) membership for userId in organizationId, or null.
export async function getMembership(
  userId: string,
  organizationId: string,
): Promise<MembershipContext | null> {
  const rows = await db
    .select({
      userId: orgMemberships.user_id,
      organizationId: orgMemberships.organization_id,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.user_id, userId),
        eq(orgMemberships.organization_id, organizationId),
        isNull(orgMemberships.archived_at),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  const { userId: uid, organizationId: oid, role } = rows[0];
  if (!isRole(role)) return null;
  return { userId: uid, organizationId: oid, role };
}

// Asserts userId is an active member of organizationId. Throws TenantIsolationError if not.
export async function assertMembership(
  userId: string,
  organizationId: string,
): Promise<MembershipContext> {
  const membership = await getMembership(userId, organizationId);
  if (!membership) {
    throw new TenantIsolationError(
      `User is not an active member of the requested organization`,
    );
  }
  return membership;
}

// Asserts userId is an active member of organizationId with one of allowedRoles.
// Throws TenantIsolationError if not a member; AuthorizationError if wrong role.
export async function assertRole(
  userId: string,
  organizationId: string,
  allowedRoles: Role[],
): Promise<MembershipContext> {
  const membership = await assertMembership(userId, organizationId);
  if (!allowedRoles.includes(membership.role)) {
    throw new AuthorizationError(
      `Role '${membership.role}' is not authorized for this action`,
    );
  }
  return membership;
}

// Pure helper: returns true if role is in allowedRoles.
export function hasAnyRole(role: Role, allowedRoles: readonly Role[]): boolean {
  return allowedRoles.includes(role);
}
