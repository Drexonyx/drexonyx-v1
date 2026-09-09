import { describe, it, expect } from 'vitest';
import { ROLES, isRole } from '../auth/roles';

// Cross-check: ROLES must match identity.org_memberships CHECK constraint values exactly.
// If this diverges, the application-layer type and the DB constraint are out of sync.
const SCHEMA_CHECK_VALUES = [
  'OWNER',
  'ADMIN_OPERATIONS',
  'CREATIVE_PRODUCTION',
  'QC',
  'CLIENT',
  'AGENT',
] as const;

describe('RBAC roles (DR 0029, Gate 0)', () => {
  it('has exactly 6 approved roles', () => {
    expect(ROLES).toHaveLength(6);
  });

  it('matches the identity schema CHECK constraint values exactly', () => {
    expect(new Set(ROLES)).toEqual(new Set(SCHEMA_CHECK_VALUES));
  });

  it('includes OWNER (highest authority)', () => {
    expect(ROLES).toContain('OWNER');
  });

  it('includes ADMIN_OPERATIONS', () => {
    expect(ROLES).toContain('ADMIN_OPERATIONS');
  });

  it('includes CREATIVE_PRODUCTION', () => {
    expect(ROLES).toContain('CREATIVE_PRODUCTION');
  });

  it('includes QC', () => {
    expect(ROLES).toContain('QC');
  });

  it('includes CLIENT', () => {
    expect(ROLES).toContain('CLIENT');
  });

  it('includes AGENT (least privilege)', () => {
    expect(ROLES).toContain('AGENT');
  });

  it('does not include any unapproved roles', () => {
    const unapproved = ['SUPERADMIN', 'MEMBER', 'VIEWER', 'ADMIN', 'STAFF', 'DEVELOPER'];
    for (const role of unapproved) {
      expect(ROLES).not.toContain(role);
    }
  });
});

describe('isRole type guard', () => {
  it('returns true for every approved role', () => {
    for (const role of ROLES) {
      expect(isRole(role)).toBe(true);
    }
  });

  it('returns false for lowercase variants (roles are uppercase)', () => {
    expect(isRole('owner')).toBe(false);
    expect(isRole('admin_operations')).toBe(false);
    expect(isRole('agent')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isRole('')).toBe(false);
  });

  it('returns false for unapproved strings', () => {
    expect(isRole('SUPERADMIN')).toBe(false);
    expect(isRole('MEMBER')).toBe(false);
    expect(isRole('ADMIN')).toBe(false);
  });

  it('returns false for whitespace-padded role names', () => {
    expect(isRole(' OWNER')).toBe(false);
    expect(isRole('OWNER ')).toBe(false);
  });
});
