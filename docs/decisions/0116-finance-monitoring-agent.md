# DR 0116 — Finance Monitoring Agent

**Status:** APPROVED — Design authorized. Blockers B1 and B2 resolved. Implementation complete.
**Phase:** Finance Monitoring Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ post-`dc0b0d0`
**Relationship to prior records:** Extends DR 0071 (orchestration), DR 0075 (AGENT_ALLOWLIST),
DR 0108/0109 (specialist agent pattern), DR 0113 (production agent), DR 0114 (QC review agent).
Reads from financial schema (DR 0001, DR 0052, DR 0083). Does not modify Decision Records 0001–0115.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** The financial schema is complete: `financial_ledger` (append-only),
`payments`, `expenses`, `providerCredits`, `reserves`, `ownerSettlements`.
All tables are org-scoped. The ledger is strictly append-only — no agent may
add, modify, or delete entries. Only two write paths exist (DR 0052, DR 0083).

**FACT:** `FINANCIAL_CHECK` is an existing `StepType` in the orchestration schema.
The Finance Monitoring Agent does not require AGENT_ALLOWLIST expansion and does
not require any new `StepType`.

**FACT:** The orchestration `IntentType` CHECK constraint does not include a
financial monitoring type. A new IntentType `COORDINATE_FINANCIAL_MONITORING`
constitutes a schema change and requires Owner approval (blocker B1).

**FACT:** No Finance Monitoring Agent entry exists in `SPECIALIST_AGENT_REGISTRY`.
Adding one requires Owner approval (blocker B2).

**FACT:** The following data is NEVER exposed in agent output per standing security
constraints: estimated_cost, gross_margin, AI generation cost details, internal
labor cost, provider cost rates, gross profit per order. The Finance Monitoring
Agent provides only aggregate status and alert signals, not raw financial amounts
that reveal internal pricing or margins.

**FACT (DR 0001 §6):** Payment ≠ Revenue, Provider Credit ≠ Cash/Profit,
Profit ≠ Owner Settlement. The agent does not conflate these.

**FACT:** Owner Settlements are OWNER-AUTHORIZED-ONLY. The Finance Monitoring
Agent may read settlement status for alert purposes only; it cannot initiate,
approve, or modify any settlement.

---

## 2. Decision

### 2.1 Purpose

Authorize the design and implementation of a Finance Monitoring Agent that
provides read-only financial intelligence to OWNER and ADMIN_OPERATIONS:

- Payment and ledger status monitoring
- Payments requiring attention (PENDING/PROCESSING overdue, FAILED/CHARGEBACK alerts)
- Budget and expense visibility per order
- Provider credit status and expiry alerts
- Reserve status visibility
- Financial alert escalation to ADMIN_OPERATIONS/OWNER

The agent is purely read-only. It never writes to any financial table, never
initiates settlements or refunds, and never modifies any financial guard.

### 2.2 Operational Flow

```
FINANCIAL_CHECK → NOTIFICATION
```

Two-step plan:
- **Step 0 — FINANCIAL_CHECK**: Query payment status, ledger entries, budget/expense
  visibility, provider credits, reserves. Collect alerts (overdue, failed, chargeback).
  Output: structured financial status report (org-scoped, no internal cost data).
- **Step 1 — NOTIFICATION**: Write `FINANCIAL_MONITORING_COMPLETED` audit event.
  Best-effort escalation alert if any alerts were surfaced in Step 0.

### 2.3 Initiator Roles

- Allowed: `OWNER`, `ADMIN_OPERATIONS`
- Denied: `CREATIVE_PRODUCTION`, `QC`, `CLIENT`, `AGENT`

### 2.4 What the Agent MAY do

- Execute read-only queries against `financial.*` and `commercial.order_budgets`
- Surface payment alerts (FAILED, CHARGEBACK, PENDING overdue)
- Report aggregate budget vs. expense status per order (amounts only, no margin)
- Report provider credit status and expiry alerts
- Report reserve status
- Write a `FINANCIAL_MONITORING_COMPLETED` audit event (NOTIFICATION step)
- Escalate alerts via existing `escalateTask()` path

### 2.5 What the Agent MAY NOT do

- Write, modify, or delete any `financial_ledger` entry
- Initiate, approve, or modify any payment, refund, settlement, or withdrawal
- Modify `reserves`, `providerCredits`, `expenses`, or `ownerSettlements`
- Expose internal cost, margin, estimated_cost, gross profit, or provider rates
- Authorize any financial spend
- Expand the AGENT_ALLOWLIST
- Access any financial data outside its organization scope
- Perform any action that DR 0001 §6, DR 0052, or DR 0083 restrict

### 2.6 Blockers (Resolved)

| # | Blocker | Required Decision |
|---|---------|-------------------|
| B1 | `COORDINATE_FINANCIAL_MONITORING` IntentType | Owner approval + schema migration |
| B2 | `finance-monitoring` specialist agent | Owner approval to add to `SPECIALIST_AGENT_REGISTRY` |

### 2.7 Financial and Security Boundaries

- Zero financial write authority
- No ledger mutation, no settlement, no refund, no budget change
- organizationId always from server-side token, never from agent context
- Internal financial data (estimated_cost, margin, AI cost, gross profit) never
  surfaced in agent output or notification content
- No cross-organization financial data access

### 2.8 Audit Requirements

| Event | When |
|---|---|
| `FINANCIAL_MONITORING_STARTED` | Agent task created |
| `FINANCIAL_MONITORING_COMPLETED` | FINANCIAL_CHECK step succeeds |
| `FINANCIAL_ALERT_ESCALATED` | Alert conditions detected and escalated |

### 2.9 New Module Structure

```
lib/financial/
  monitoring.ts                                   — read-only financial intelligence
  __tests__/monitoring.test.ts
lib/agents/
  finance-monitoring-specialist.ts               — specialist agent + delegateFinanceMonitoring()
  __tests__/finance-monitoring-specialist.test.ts
```

---

## 3. Explicitly Prohibited Assumptions

- Do not assume this record authorizes any AGENT_ALLOWLIST expansion.
- Do not assume the Finance Monitoring Agent may initiate settlements, refunds, or withdrawals.
- Do not assume the agent may expose internal cost, margin, or provider rates.
- Do not assume the agent may access financial data outside its organization scope.
- Do not assume any financial write authority.

---

## 4. Impact

| File | Change |
|------|--------|
| `docs/decisions/0116-finance-monitoring-agent.md` | New — this DR |
| `lib/financial/monitoring.ts` | New — read-only financial intelligence |
| `lib/financial/__tests__/monitoring.test.ts` | New — unit tests |
| `lib/agents/finance-monitoring-specialist.ts` | New — specialist agent |
| `lib/agents/__tests__/finance-monitoring-specialist.test.ts` | New — unit tests |
| `lib/orchestration/types.ts` | Add `COORDINATE_FINANCIAL_MONITORING` to `IntentType` |
| `lib/orchestration/planner.ts` | Add `COORDINATE_FINANCIAL_MONITORING` plan template |
| `lib/orchestration/ai-planner.ts` | Add `COORDINATE_FINANCIAL_MONITORING` to allowlist |
| `lib/agents/registry.ts` | Add `finance-monitoring` entry |
| `lib/agents/index.ts` | Add exports |
| `db/schema/orchestration.ts` | Update `agent_tasks_intent_type_check` |
| `db/migrations/0011_finance_agent.sql` | Schema migration |

---

## 5. Owner Approval

**Status: APPROVED.**

Blockers resolved:
1. `COORDINATE_FINANCIAL_MONITORING` IntentType approved and schema migration created (B1 — resolved)
2. `finance-monitoring` entry approved and registered in `SPECIALIST_AGENT_REGISTRY` (B2 — resolved)

Implementation complete: `lib/financial/monitoring.ts`, `lib/agents/finance-monitoring-specialist.ts`,
`lib/agents/__tests__/finance-monitoring-specialist.test.ts`, `lib/financial/__tests__/monitoring.test.ts`.
