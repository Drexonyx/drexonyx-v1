-- DR 0120: Internal production credit economics audit log.
-- Records cost guard evaluations, reserve usage, and runaway events per job.
-- This is INTERNAL ONLY — never exposed to customers.
-- Separate from financial.customer_credit_ledger (customer-facing).

CREATE TABLE IF NOT EXISTS financial.production_credit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  production_job_id UUID NOT NULL,
  credits_consumed BIGINT NOT NULL,
  warning_level TEXT NOT NULL DEFAULT 'NORMAL',
  credit_rate_aed NUMERIC(19, 8) NOT NULL,
  estimated_aed NUMERIC(19, 4) NOT NULL,
  cost_target_aed NUMERIC(19, 4) NOT NULL,
  safety_reserve_aed NUMERIC(19, 4) NOT NULL,
  hard_limit_aed NUMERIC(19, 4) NOT NULL,
  event_type TEXT NOT NULL,
  proceeded BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT production_credit_events_warning_level_check
    CHECK (warning_level IN ('NORMAL','RESERVE_USED','OVER_TARGET','RUNAWAY')),
  CONSTRAINT production_credit_events_event_type_check
    CHECK (event_type IN ('PRODUCTION_START','RETRY','QC_FAIL','COMPLETION','RUNAWAY_REFUSED')),
  CONSTRAINT production_credit_events_credits_positive
    CHECK (credits_consumed >= 0)
);

CREATE INDEX IF NOT EXISTS production_credit_events_org_idx
  ON financial.production_credit_events (organization_id);
CREATE INDEX IF NOT EXISTS production_credit_events_job_idx
  ON financial.production_credit_events (production_job_id);
CREATE INDEX IF NOT EXISTS production_credit_events_warning_idx
  ON financial.production_credit_events (warning_level);
CREATE INDEX IF NOT EXISTS production_credit_events_event_type_idx
  ON financial.production_credit_events (event_type);
CREATE INDEX IF NOT EXISTS production_credit_events_created_at_idx
  ON financial.production_credit_events (organization_id, created_at DESC);
