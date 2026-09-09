// Approved RBAC roles per DR 0029 Gate 0.
// Values MUST match the identity.org_memberships role CHECK constraint exactly.
export const ROLES = [
  'OWNER',
  'ADMIN_OPERATIONS',
  'CREATIVE_PRODUCTION',
  'QC',
  'CLIENT',
  'AGENT',
] as const;

export type Role = typeof ROLES[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
