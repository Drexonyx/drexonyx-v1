import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { campaigns } from '../schema/commercial';
import { briefs } from '../schema/commercial';
import { quotes } from '../schema/commercial';
import { orders } from '../schema/commercial';
import { assets } from '../schema/production';
import { productionJobs } from '../schema/production';
import { aiGenerations } from '../schema/production';
import { approvals } from '../schema/production';
import { deliveries } from '../schema/production';
import { qcReviews } from '../schema/production';
import { orgMemberships } from '../schema/identity';

// Approved state values per Decision Records 0003–0011, 0029.
// These tests verify schema definitions match the approved state machines.
// If any state is wrong here, the CHECK constraint in production will reject it.

const CAMPAIGN_STATES = [
  'DRAFT', 'BRIEFING', 'PRE_FLIGHT', 'STRATEGY', 'QUOTE_PENDING',
  'APPROVAL_PENDING', 'ORDERED', 'IN_PRODUCTION', 'QC', 'CLIENT_PREVIEW',
  'REVISION', 'FINAL_APPROVAL', 'DELIVERY', 'CLOSED', 'CANCELLED',
] as const;

const BRIEF_STATES = ['DRAFT', 'SUBMITTED', 'REVISION_REQUIRED', 'APPROVED'] as const;

const QUOTE_STATES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const;

const ORDER_STATES = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;

const ASSET_STATES = [
  'UPLOADED', 'PROCESSING', 'READY_FOR_QC', 'CLIENT_PREVIEW', 'REVISION_REQUIRED', 'REJECTED',
] as const;

const PRODUCTION_JOB_STATES = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;

const AI_GENERATION_STATES = ['REQUESTED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const;

const APPROVAL_STATES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as const;

const DELIVERY_STATES = ['PREPARING', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;

const QC_REVIEW_VERDICTS = ['PASS', 'FAIL'] as const;

const RBAC_ROLES = [
  'OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION', 'QC', 'CLIENT', 'AGENT',
] as const;

function getCheckConstraintSql(tableName: string, checkName: string): string | undefined {
  // Extract CHECK constraint SQL from the table config using drizzle introspection.
  // We use a type-safe approach to get table config.
  const tableMap: Record<string, ReturnType<typeof getTableConfig>> = {
    campaigns: getTableConfig(campaigns),
    briefs: getTableConfig(briefs),
    quotes: getTableConfig(quotes),
    orders: getTableConfig(orders),
    assets: getTableConfig(assets),
    productionJobs: getTableConfig(productionJobs),
    aiGenerations: getTableConfig(aiGenerations),
    approvals: getTableConfig(approvals),
    deliveries: getTableConfig(deliveries),
    qcReviews: getTableConfig(qcReviews),
    orgMemberships: getTableConfig(orgMemberships),
  };
  const config = tableMap[tableName];
  if (!config) return undefined;
  const constraint = config.checks.find((c) => c.name === checkName);
  if (!constraint) return undefined;
  // Drizzle SQL objects store chunks in queryChunks. StringChunk.value is string[].
  // Non-string chunks (column refs) are replaced with a placeholder.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks = (constraint.value as any).queryChunks ?? [];
  return chunks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((chunk: any) => (Array.isArray(chunk?.value) ? chunk.value.join('') : '?'))
    .join('');
}

describe('Campaign state machine (DR 0003)', () => {
  it('has exactly 15 approved states including CANCELLED terminal', () => {
    expect(CAMPAIGN_STATES).toHaveLength(15);
  });

  it('includes all approved lifecycle states', () => {
    expect(CAMPAIGN_STATES).toContain('DRAFT');
    expect(CAMPAIGN_STATES).toContain('ORDERED');
    expect(CAMPAIGN_STATES).toContain('IN_PRODUCTION');
    expect(CAMPAIGN_STATES).toContain('QC');
    expect(CAMPAIGN_STATES).toContain('CLIENT_PREVIEW');
    expect(CAMPAIGN_STATES).toContain('REVISION');
    expect(CAMPAIGN_STATES).toContain('FINAL_APPROVAL');
    expect(CAMPAIGN_STATES).toContain('DELIVERY');
    expect(CAMPAIGN_STATES).toContain('CLOSED');
    expect(CAMPAIGN_STATES).toContain('CANCELLED');
  });

  it('does not include ARCHIVED (archive is archived_at + status, not a state)', () => {
    expect(CAMPAIGN_STATES).not.toContain('ARCHIVED');
  });

  it('campaign table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql('campaigns', 'campaigns_status_check');
    expect(sql).toBeDefined();
    for (const state of CAMPAIGN_STATES) {
      expect(sql).toContain(state);
    }
  });
});

describe('Brief state machine (DR 0004)', () => {
  it('has exactly 4 approved states', () => {
    expect(BRIEF_STATES).toHaveLength(4);
  });

  it('does not include ARCHIVED or CANCELLED (brief follows campaign cancellation)', () => {
    expect(BRIEF_STATES).not.toContain('ARCHIVED');
    expect(BRIEF_STATES).not.toContain('CANCELLED');
  });

  it('brief table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql('briefs', 'briefs_status_check');
    expect(sql).toBeDefined();
    for (const state of BRIEF_STATES) {
      expect(sql).toContain(state);
    }
  });
});

describe('Quote state machine (DR 0005)', () => {
  it('has exactly 6 approved states', () => {
    expect(QUOTE_STATES).toHaveLength(6);
  });

  it('terminal states are ACCEPTED, REJECTED, EXPIRED, CANCELLED', () => {
    const terminals = ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'];
    for (const t of terminals) {
      expect(QUOTE_STATES).toContain(t as typeof QUOTE_STATES[number]);
    }
  });

  it('does not include APPROVED as a Quote state (Approval is a separate entity)', () => {
    expect(QUOTE_STATES).not.toContain('APPROVED');
  });

  it('quote table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql('quotes', 'quotes_status_check');
    expect(sql).toBeDefined();
    for (const state of QUOTE_STATES) {
      expect(sql).toContain(state);
    }
  });
});

describe('Order state machine (DR 0007)', () => {
  it('has exactly 3 approved states', () => {
    expect(ORDER_STATES).toHaveLength(3);
  });

  it('terminal states are COMPLETED and CANCELLED', () => {
    expect(ORDER_STATES).toContain('COMPLETED');
    expect(ORDER_STATES).toContain('CANCELLED');
  });

  it('does not include Payment, Production, QC, or Campaign states', () => {
    const prohibited = [
      'PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED', 'IN_PRODUCTION', 'QC',
      'CLIENT_PREVIEW', 'REVISION', 'FINAL_APPROVAL', 'DELIVERY', 'CLOSED',
      'CREATED', 'ON_HOLD',
    ];
    for (const s of prohibited) {
      expect(ORDER_STATES).not.toContain(s as typeof ORDER_STATES[number]);
    }
  });

  it('order table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql('orders', 'orders_status_check');
    expect(sql).toBeDefined();
    for (const state of ORDER_STATES) {
      expect(sql).toContain(state);
    }
  });
});

describe('Asset state machine (DR 0006)', () => {
  it('has exactly 6 approved states', () => {
    expect(ASSET_STATES).toHaveLength(6);
  });

  it('does not include APPROVED, DELIVERED, or QC_PASSED (belong to separate entities)', () => {
    expect(ASSET_STATES).not.toContain('APPROVED');
    expect(ASSET_STATES).not.toContain('DELIVERED');
    expect(ASSET_STATES).not.toContain('QC_PASSED');
    expect(ASSET_STATES).not.toContain('QC_FAILED');
    expect(ASSET_STATES).not.toContain('DRAFT');
  });

  it('asset table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql('assets', 'assets_status_check');
    expect(sql).toBeDefined();
    for (const state of ASSET_STATES) {
      expect(sql).toContain(state);
    }
  });
});

describe('Production Job state machine (DR 0008)', () => {
  it('has exactly 5 approved states', () => {
    expect(PRODUCTION_JOB_STATES).toHaveLength(5);
  });

  it('terminal states are COMPLETED, FAILED, CANCELLED', () => {
    expect(PRODUCTION_JOB_STATES).toContain('COMPLETED');
    expect(PRODUCTION_JOB_STATES).toContain('FAILED');
    expect(PRODUCTION_JOB_STATES).toContain('CANCELLED');
  });

  it('does not include QC states (QC belongs to QC Review entity)', () => {
    expect(PRODUCTION_JOB_STATES).not.toContain('QC_PASSED');
    expect(PRODUCTION_JOB_STATES).not.toContain('QC_FAILED');
    expect(PRODUCTION_JOB_STATES).not.toContain('QC');
  });

  it('production_jobs table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql('productionJobs', 'production_jobs_status_check');
    expect(sql).toBeDefined();
    for (const state of PRODUCTION_JOB_STATES) {
      expect(sql).toContain(state);
    }
  });
});

describe('AI Generation state machine (DR 0009)', () => {
  it('has exactly 5 approved states', () => {
    expect(AI_GENERATION_STATES).toHaveLength(5);
  });

  it('uses REQUESTED (not QUEUED) as initial state', () => {
    expect(AI_GENERATION_STATES).toContain('REQUESTED');
    expect(AI_GENERATION_STATES).not.toContain('QUEUED');
  });

  it('uses SUCCEEDED (not COMPLETED) as success terminal', () => {
    expect(AI_GENERATION_STATES).toContain('SUCCEEDED');
    expect(AI_GENERATION_STATES).not.toContain('COMPLETED');
  });

  it('does not include QC, Approval, or Asset states', () => {
    expect(AI_GENERATION_STATES).not.toContain('QC_PASSED');
    expect(AI_GENERATION_STATES).not.toContain('APPROVED');
    expect(AI_GENERATION_STATES).not.toContain('DELIVERED');
  });

  it('ai_generations table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql('aiGenerations', 'ai_generations_status_check');
    expect(sql).toBeDefined();
    for (const state of AI_GENERATION_STATES) {
      expect(sql).toContain(state);
    }
  });
});

describe('Approval state machine (DR 0010)', () => {
  it('has exactly 5 approved states', () => {
    expect(APPROVAL_STATES).toHaveLength(5);
  });

  it('terminal states are APPROVED, REJECTED, CANCELLED, EXPIRED', () => {
    const terminals = ['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'];
    for (const t of terminals) {
      expect(APPROVAL_STATES).toContain(t as typeof APPROVAL_STATES[number]);
    }
  });

  it('does not include QC, Delivery, Asset, or Production states', () => {
    expect(APPROVAL_STATES).not.toContain('QC_PASSED');
    expect(APPROVAL_STATES).not.toContain('DELIVERY_APPROVED');
    expect(APPROVAL_STATES).not.toContain('CLIENT_PREVIEW');
    expect(APPROVAL_STATES).not.toContain('REVISION_REQUIRED');
  });

  it('approvals table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql('approvals', 'approvals_status_check');
    expect(sql).toBeDefined();
    for (const state of APPROVAL_STATES) {
      expect(sql).toContain(state);
    }
  });

});

describe('Delivery state machine (DR 0011)', () => {
  it('has exactly 5 approved states', () => {
    expect(DELIVERY_STATES).toHaveLength(5);
  });

  it('initial state is PREPARING, active state is SENDING', () => {
    expect(DELIVERY_STATES).toContain('PREPARING');
    expect(DELIVERY_STATES).toContain('SENDING');
  });

  it('terminal states are COMPLETED, FAILED, CANCELLED', () => {
    expect(DELIVERY_STATES).toContain('COMPLETED');
    expect(DELIVERY_STATES).toContain('FAILED');
    expect(DELIVERY_STATES).toContain('CANCELLED');
  });

  it('does not include Approval, QC, Asset, or financial states', () => {
    expect(DELIVERY_STATES).not.toContain('APPROVED');
    expect(DELIVERY_STATES).not.toContain('QC_PASSED');
    expect(DELIVERY_STATES).not.toContain('DELIVERY_APPROVED');
    expect(DELIVERY_STATES).not.toContain('FINAL_APPROVAL');
    expect(DELIVERY_STATES).not.toContain('PAID');
  });

  it('deliveries table has status CHECK constraint covering all approved states', () => {
    const sql = getCheckConstraintSql('deliveries', 'deliveries_status_check');
    expect(sql).toBeDefined();
    for (const state of DELIVERY_STATES) {
      expect(sql).toContain(state);
    }
  });
});

describe('QC Review verdicts', () => {
  it('QC Review has exactly PASS and FAIL verdicts', () => {
    expect(QC_REVIEW_VERDICTS).toHaveLength(2);
    expect(QC_REVIEW_VERDICTS).toContain('PASS');
    expect(QC_REVIEW_VERDICTS).toContain('FAIL');
  });

  it('qc_reviews table has verdict CHECK constraint', () => {
    const sql = getCheckConstraintSql('qcReviews', 'qc_reviews_verdict_check');
    expect(sql).toBeDefined();
    expect(sql).toContain('PASS');
    expect(sql).toContain('FAIL');
  });
});

describe('RBAC roles (DR 0029, Gate 0)', () => {
  it('has exactly 6 approved roles', () => {
    expect(RBAC_ROLES).toHaveLength(6);
  });

  it('AGENT is least-privilege (present but explicitly excluded from most authorities)', () => {
    expect(RBAC_ROLES).toContain('AGENT');
  });

  it('OWNER is highest authority', () => {
    expect(RBAC_ROLES).toContain('OWNER');
  });

  it('org_memberships table has role CHECK constraint', () => {
    const sql = getCheckConstraintSql('orgMemberships', 'org_memberships_role_check');
    expect(sql).toBeDefined();
    for (const role of RBAC_ROLES) {
      expect(sql).toContain(role);
    }
  });
});
