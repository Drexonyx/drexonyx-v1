export const ADMIN_ROLES = ['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

export type AdminSession = {
  userId: string;
  organizationId: string;
  role: AdminRole;
  name: string | null;
  email: string | null;
};
