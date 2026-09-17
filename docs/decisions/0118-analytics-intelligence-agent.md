# DR 0118 — Analytics / Intelligence Agent

**Status:** APPROVED — Design authorized. Blockers B1 and B2 resolved. Implementation complete.
**Phase:** Analytics / Intelligence Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ post-`4ed3172`
**Relationship to prior records:** Extends DR 0071 (orchestration), DR 0075 (AGENT_ALLOWLIST),
DR 0108/0109 (specialist agent pattern), DR 0116 (Finance Monitoring Agent),
DR 0117 (Reporting Agent — reuses `buildFinancialStatusReport()`).
Reads from commercial, production, orchestration, and financial schemas.
Does not modify Decision Records 0001–0117.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** No operational analytics or intelligence module exists. All data required for
analytics (status distributions, time-windowed counts, rate calculations, anomaly detection)
is present in the existing schemas and is readable without any schema change beyond a new
IntentType.

**FACT:** `VERIFY` and `NOTIFICATION` are existing `StepType` values in the orchestration
schema CHECK constraint. The Analytics Agent uses only these two step types — no
AGENT_ALLOWLIST expansion is required, and no new `StepType` is required.

**FACT:** DR 0116 `buildFinancialStatusReport()` is available as a read-only financial
intelligence function. The Analytics Agent reuses it directly for financial intelligence
rather than duplicating financial queries.

**FACT:** DR 0117 Reporting Agent provides raw status distributions. The Analytics Agent
extends this with derived rates, time-windowed trend analysis, and deterministic anomaly
detection — no LLM, no AI predictions, no invented benchmarks.

**FACT:** The orchestration `IntentType` CHECK constraint does not include an analytics
intent type. A new IntentType `GENERATE_INTELLIGENCE_REPORT` constitutes a schema change
and requires Owner approval (blocker B1).

**FACT:** No Analytics Agent entry exists in `SPECIALIST_AGENT_REGISTRY`. Adding one
requires Owner approval (blocker B2).

**FACT (standing security constraint):** Internal financial data (estimated_cost,
gross_margin, AI cost, provider rates, planned_amount, actual_amount) is NEVER exposed
in agent output. Analytics surfaces status rates and counts only.

---

## 2. Decision

### 2.1 Purpose

Authorize the design and implementation of an Analytics / Intelligence Agent that provides
read-only operational intelligence for OWNER and ADMIN_OPERATIONS:

- Task volume and status trend analysis (all-time and recent time window)
- Production job trend analysis with completion and failure rates
- QC verdict trend analysis with pass rates
- Asset status analytics with pending-work indicators
- Commercial pipeline analytics (campaigns and orders)
- Financial intelligence (delegated to DR 0116 `buildFinancialStatusReport()`)
- Deterministic anomaly detection (escalation rate, QC failure rate, job failure rate,
  approval backlog, payment alerts, problem asset backlog)
- Composite organization-level intelligence report

### 2.2 Operational Flow

```
VERIFY → NOTIFICATION
```

Two-step plan:
- **Step 0 — VERIFY**: Read-only queries with time-windowed aggregation across commercial,
  production, and orchestration schemas, plus delegation to `buildFinancialStatusReport()`
  for financial alerts. Output: structured `IntelligenceReport`.
- **Step 1 — NOTIFICATION**: Write `ANALYTICS_COMPLETED` audit event.

### 2.3 Initiator Roles

- Allowed: `OWNER`, `ADMIN_OPERATIONS`
- Denied: `CREATIVE_PRODUCTION`, `QC`, `CLIENT`, `AGENT`

### 2.4 Analytics Capabilities

**Deterministic rates (computed from existing counts):**
- Task completion rate = COMPLETED / total tasks
- Task failure rate = FAILED / total tasks
- Task escalation rate = ESCALATED / total tasks
- QC pass rate = PASS / total QC reviews
- Production job completion rate = COMPLETED / total jobs
- Production job failure rate = FAILED / total jobs

**Time-windowed trends (configurable window, default 30 days):**
- Recent task volume vs. all-time
- Recent production job volume vs. all-time
- Recent QC review volume vs. all-time

**Pending-work indicators:**
- Active (non-terminal) task count
- Pending orchestration approval count
- Assets pending QC count
- Problem asset count (REVISION_REQUIRED + REJECTED)

**Anomaly detection (deterministic threshold rules only):**

| Rule | Threshold | Severity |
|------|-----------|---------|
| `HIGH_ESCALATION_RATE` | escalationRate > 0.10 AND total tasks ≥ 5 | WARNING / CRITICAL (> 0.25) |
| `HIGH_QC_FAILURE_RATE` | passRate < 0.50 AND total reviews ≥ 5 | WARNING / CRITICAL (passRate < 0.25) |
| `HIGH_JOB_FAILURE_RATE` | failureRate > 0.30 AND total jobs ≥ 3 | WARNING / CRITICAL (> 0.50) |
| `PENDING_APPROVAL_BACKLOG` | pendingApprovalCount ≥ 5 | WARNING / CRITICAL (≥ 10) |
| `PAYMENT_ALERTS` | paymentAlerts.length > 0 | WARNING / CRITICAL (FAILED or CHARGEBACK) |
| `PROBLEM_ASSET_BACKLOG` | problemAssetCount ≥ 5 | WARNING / CRITICAL (≥ 10) |

No predictive claims, no forecasts, no scores, no invented benchmarks.

### 2.5 What the Agent MAY do

- Execute read-only queries against `commercial.*`, `production.*`, `orchestration.*`
- Call `buildFinancialStatusReport()` from DR 0116 for financial alert data
- Compute deterministic rates from count distributions
- Apply deterministic anomaly detection rules
- Surface status distributions, rates, and counts (no amounts, no margins, no internal cost)
- Write an `ANALYTICS_COMPLETED` audit event (NOTIFICATION step)

### 2.6 What the Agent MAY NOT do

- Write to any table, including `system.audit_events` except via the existing audit path
- Expose `estimated_cost`, `total_amount`, `planned_amount`, `actual_amount`,
  `minimum_acceptable_margin_rate`, `target_margin_rate`, or any financial amount
- Expose `notes` from `qc_reviews`, `payload` from `audit_events`, or `metadata` from
  `production_jobs`
- Invoke any LLM or external API
- Generate predictions, forecasts, scores, rankings, or invented business benchmarks
- Modify any entity status, approval, QC verdict, or financial record
- Expand the AGENT_ALLOWLIST
- Access data outside its organization scope

### 2.7 Financial and Security Boundaries

- Zero financial write authority
- No amounts, margins, or cost details surfaced (rates and flags only)
- organizationId always from server-side token, never from agent context
- QC review notes never surfaced
- Audit event payloads never surfaced
- Production job metadata never surfaced

### 2.8 Audit Requirements

| Event | When |
|---|---|
| `ANALYTICS_STARTED` | Agent task created |
| `ANALYTICS_COMPLETED` | VERIFY step succeeds |

### 2.9 New Module Structure

```
lib/analytics/
  intelligence.ts                                  — read-only analytics + anomaly detection
  __tests__/intelligence.test.ts
lib/agents/
  analytics-specialist.ts                          — specialist agent + delegateAnalytics()
  __tests__/analytics-specialist.test.ts
```

### 2.10 Blockers (Resolved)

| # | Blocker | Required Decision |
|---|---------|-------------------|
| B1 | `GENERATE_INTELLIGENCE_REPORT` IntentType | Owner approval + schema migration |
| B2 | `analytics` specialist agent | Owner approval to add to `SPECIALIST_AGENT_REGISTRY` |

---

## 3. Explicitly Prohibited Assumptions

- Do not assume this record authorizes any AGENT_ALLOWLIST expansion.
- Do not assume the Analytics Agent may modify any entity.
- Do not assume the agent may expose internal cost, margin, amounts, or sensitive notes.
- Do not assume the agent may invoke an LLM or make AI-generated predictions.
- Do not assume the agent may access data outside its organization scope.
- Do not assume any financial write authority.

---

## 4. Impact

| File | Change |
|------|--------|
| `docs/decisions/0118-analytics-intelligence-agent.md` | New — this DR |
| `lib/analytics/intelligence.ts` | New — analytics functions + anomaly detection |
| `lib/analytics/__tests__/intelligence.test.ts` | New — unit tests |
| `lib/agents/analytics-specialist.ts` | New — specialist agent |
| `lib/agents/__tests__/analytics-specialist.test.ts` | New — unit tests |
| `lib/orchestration/types.ts` | Add `GENERATE_INTELLIGENCE_REPORT` to `IntentType` |
| `lib/orchestration/planner.ts` | Add `GENERATE_INTELLIGENCE_REPORT` plan template |
| `lib/orchestration/ai-planner.ts` | Add `GENERATE_INTELLIGENCE_REPORT` to allowlist |
| `lib/agents/registry.ts` | Add `analytics` entry |
| `lib/agents/index.ts` | Add exports |
| `db/schema/orchestration.ts` | Update `agent_tasks_intent_type_check` |
| `db/migrations/0013_analytics_agent.sql` | Schema migration |

---

## 5. Owner Approval

**Status: APPROVED.**

Blockers resolved:
1. `GENERATE_INTELLIGENCE_REPORT` IntentType approved and schema migration created (B1 — resolved)
2. `analytics` entry approved and registered in `SPECIALIST_AGENT_REGISTRY` (B2 — resolved)

Implementation complete.
