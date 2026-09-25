-- DR 0120: Customer Credit System
-- financial.credit_packages      — configurable credit packages (owner-managed product catalog)
-- financial.credit_purchases     — records each credit purchase attempt (links to payment provider)
-- financial.customer_credit_ledger — append-only authoritative credit ledger per client org
--
-- Balance computation: SUM(credits_delta) over customer_credit_ledger for a given organization_id.
-- Positive delta = credits added. Negative delta = credits deducted.
-- Entry types: PURCHASE | RESERVATION | RELEASE | ADJUSTMENT | REFUND
--   PURCHASE    +N  — after successful payment confirmation
--   RESERVATION -N  — credits locked before production starts
--   RELEASE     +N  — credits returned on production failure/QC failure
--   ADJUSTMENT  ±N  — manual admin adjustment (with audit trail)
--   REFUND      -N  — credits removed on payment refund

-- ─── Credit Packages ──────────────────────────────────────────────────────────
-- Global DREXONYX product catalog. Inserted by owner via admin interface.
-- No organization_id FK — these are DREXONYX's products, not per-client entities.

CREATE TABLE IF NOT EXISTS financial.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits BIGINT NOT NULL,
  price_aed NUMERIC(19, 4) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_packages_credits_positive CHECK (credits > 0),
  CONSTRAINT credit_packages_price_positive CHECK (price_aed > 0)
);

CREATE INDEX IF NOT EXISTS credit_packages_active_idx
  ON financial.credit_packages (is_active, display_order)
  WHERE archived_at IS NULL;

-- Seed initial credit packages. Owner can modify via admin interface.
INSERT INTO financial.credit_packages (id, name, credits, price_aed, is_active, display_order)
VALUES
  (gen_random_uuid(), 'Starter Pack',   500,   499.0000,  TRUE, 10),
  (gen_random_uuid(), 'Value Pack',    1000,   899.0000,  TRUE, 20),
  (gen_random_uuid(), 'Growth Pack',   2500,  1999.0000,  TRUE, 30),
  (gen_random_uuid(), 'Scale Pack',    5000,  3499.0000,  TRUE, 40),
  (gen_random_uuid(), 'Power Pack',   10000,  5999.0000,  TRUE, 50)
ON CONFLICT DO NOTHING;

-- ─── Credit Purchases ─────────────────────────────────────────────────────────
-- Tracks each credit purchase attempt for a client organization.
-- Links the purchase to a credit_package and a payment provider session.
-- Status lifecycle: PENDING → PROCESSING → COMPLETED | FAILED | REFUNDED

CREATE TABLE IF NOT EXISTS financial.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  credit_package_id UUID NOT NULL REFERENCES financial.credit_packages(id),
  credits BIGINT NOT NULL,
  amount_aed NUMERIC(19, 4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  provider_name TEXT,
  provider_payment_id TEXT,
  idempotency_key TEXT UNIQUE,
  failure_reason TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_purchases_status_check
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  CONSTRAINT credit_purchases_credits_positive CHECK (credits > 0),
  CONSTRAINT credit_purchases_amount_positive CHECK (amount_aed > 0)
);

CREATE INDEX IF NOT EXISTS credit_purchases_org_idx
  ON financial.credit_purchases (organization_id);
CREATE INDEX IF NOT EXISTS credit_purchases_status_idx
  ON financial.credit_purchases (status);
CREATE INDEX IF NOT EXISTS credit_purchases_provider_id_idx
  ON financial.credit_purchases (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- Idempotency: exactly one COMPLETED credit_purchase per provider_payment_id
CREATE UNIQUE INDEX IF NOT EXISTS credit_purchases_completed_once_uidx
  ON financial.credit_purchases (provider_payment_id)
  WHERE status = 'COMPLETED'
    AND provider_payment_id IS NOT NULL;

-- ─── Customer Credit Ledger ───────────────────────────────────────────────────
-- Append-only. Authoritative source of truth for customer credit balances.
-- Balance = SUM(credits_delta) WHERE organization_id = $org.
-- idempotency_key: unique per entry — prevents duplicate writes under retries.

CREATE TABLE IF NOT EXISTS financial.customer_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  entry_type TEXT NOT NULL,
  credits_delta BIGINT NOT NULL,
  reference_entity_type TEXT,
  reference_entity_id UUID,
  idempotency_key TEXT UNIQUE,
  description TEXT,
  actor_id UUID,
  actor_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_credit_ledger_entry_type_check
    CHECK (entry_type IN ('PURCHASE', 'RESERVATION', 'RELEASE', 'ADJUSTMENT', 'REFUND'))
);

CREATE INDEX IF NOT EXISTS customer_credit_ledger_org_idx
  ON financial.customer_credit_ledger (organization_id);
CREATE INDEX IF NOT EXISTS customer_credit_ledger_entry_type_idx
  ON financial.customer_credit_ledger (entry_type);
CREATE INDEX IF NOT EXISTS customer_credit_ledger_reference_idx
  ON financial.customer_credit_ledger (reference_entity_type, reference_entity_id)
  WHERE reference_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS customer_credit_ledger_created_at_idx
  ON financial.customer_credit_ledger (organization_id, created_at DESC);

-- Idempotency: exactly one PURCHASE entry per credit_purchase
CREATE UNIQUE INDEX IF NOT EXISTS customer_credit_ledger_purchase_once_uidx
  ON financial.customer_credit_ledger (reference_entity_id)
  WHERE entry_type = 'PURCHASE'
    AND reference_entity_type = 'credit_purchase'
    AND reference_entity_id IS NOT NULL;
