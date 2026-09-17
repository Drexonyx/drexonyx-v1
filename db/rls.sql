-- Row-Level Security Policies for DREXONYX V1
--
-- Per DR 0001 §4 and DR 0002: RLS is defense-in-depth only.
-- Server-side authorization is mandatory and is NOT replaced by RLS.
-- These policies enforce that a database connection authenticated as a
-- specific organization can only read/write rows belonging to that
-- organization.
--
-- Usage pattern: set app.current_organization_id via SET LOCAL before
-- queries in a transaction, or pass it through the connection parameter.

-- Enable RLS on all tables that carry organization_id.

-- ─── core schema ────────────────────────────────────────────────────────────

ALTER TABLE core.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_isolation ON core.organizations
  USING (id = current_setting('app.current_organization_id', true)::uuid);

-- ─── identity schema ─────────────────────────────────────────────────────────

ALTER TABLE identity.org_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_memberships_isolation ON identity.org_memberships
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- identity.users is NOT organization-scoped; users are global identities.
-- Authorization for user access is enforced server-side, not via RLS.

-- ─── commercial schema ───────────────────────────────────────────────────────

ALTER TABLE commercial.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_isolation ON commercial.campaigns
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE commercial.briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY briefs_isolation ON commercial.briefs
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE commercial.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_isolation ON commercial.quotes
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE commercial.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_isolation ON commercial.orders
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE commercial.order_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_budgets_isolation ON commercial.order_budgets
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);


-- ─── production schema ───────────────────────────────────────────────────────

ALTER TABLE production.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY assets_isolation ON production.assets
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE production.qc_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY qc_reviews_isolation ON production.qc_reviews
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE production.production_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY production_jobs_isolation ON production.production_jobs
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE production.ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_generations_isolation ON production.ai_generations
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE production.asset_ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_ai_generations_isolation ON production.asset_ai_generations
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE production.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY approvals_isolation ON production.approvals
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE production.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY deliveries_isolation ON production.deliveries
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ─── financial schema ────────────────────────────────────────────────────────

ALTER TABLE financial.financial_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_ledger_isolation ON financial.financial_ledger
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE financial.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_isolation ON financial.payments
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE financial.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY expenses_isolation ON financial.expenses
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE financial.provider_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY provider_credits_isolation ON financial.provider_credits
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE financial.reserves ENABLE ROW LEVEL SECURITY;
CREATE POLICY reserves_isolation ON financial.reserves
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE financial.owner_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_settlements_isolation ON financial.owner_settlements
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE financial.reserve_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY reserve_allocations_isolation ON financial.reserve_allocations
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ─── system schema ───────────────────────────────────────────────────────────

ALTER TABLE system.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_events_isolation ON system.audit_events
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE system.idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY idempotency_keys_isolation ON system.idempotency_keys
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ─── orchestration schema ─────────────────────────────────────────────────────

ALTER TABLE orchestration.agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_tasks_isolation ON orchestration.agent_tasks
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE orchestration.task_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_approvals_isolation ON orchestration.task_approvals
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE orchestration.task_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_steps_isolation ON orchestration.task_steps
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
