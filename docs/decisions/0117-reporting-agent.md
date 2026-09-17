# DR 0117 — Reporting Agent

**Status:** APPROVED — Design authorized. Blockers B1 and B2 resolved. Implementation complete.
**Phase:** Reporting Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ post-`d8cd22c`
**Relationship to prior records:** Extends DR 0071 (orchestration), DR 0075 (AGENT_ALLOWLIST),
DR 0108/0109 (specialist agent pattern), DR 0116 (Finance Monitoring Agent — reuses
`buildFinancialStatusReport()`). Reads from commercial, production, orchestration, and
financial schemas. Does not modify Decision Records 0001–0116.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** No operational reporting module exists. All data required for the report
(campaign/order/asset/job/QC/task status distributions and alerts) is present in the
existing schemas and is readable without any schema change beyond a new IntentType.

**FACT:** `VERIFY` and `NOTIFICATION` are existing `StepType` values in the
orchestration schema CHECK constraint. The Reporting Agent uses only these two step
types — no AGENT_ALLOWLIST expansion is required, and no new `StepType` is required.

**FACT:** DR 0116 `buildFinancialStatusReport()` is available as a read-only financial
intelligence function. The Reporting Agent reuses it directly rather than duplicating
financial queries. This preserves the single-source financial logic.

**FACT:** The orchestration `IntentType` CHECK constraint does not include a reporting
intent type. A new IntentType `GENERATE_OPERATIONAL_REPORT` constitutes a schema change
and requires Owner approval (blocker B1).

**FACT:** No Reporting Agent entry exists in `SPECIALIST_AGENT_REGISTRY`. Adding one
requires Owner approval (blocker B2).

**FACT (standing security constraint):** Internal financial data (estimated_cost,
gross_margin, AI cost, provider rates, planned_amount, actual_amount) is NEVER exposed
in agent output. Operational reporting surfaces status distributions and alert flags only.

---

## 2. Decision

### 2.1 Purpose

Authorize the design and implementation of a Reporting Agent that provides read-only
operational intelligence for OWNER and ADMIN_OPERATIONS:

- Orchestration task status distribution and pending approval counts
- Production job status distribution
- Asset status distribution and pending QC counts
- QC review verdict distribution
- Campaign and order status distribution
- Financial alerts (delegated to DR 0116 `buildFinancialStatusReport()`)
- Operational alerts (failed jobs, failed deliveries, problem assets, escalated tasks)
- Composite organization-level operational report

### 2.2 Operational Flow

```
VERIFY → NOTIFICATION
```

Two-step plan:
- **Step 0 — VERIFY**: Read-only queries across commercial, production, and
  orchestration schemas, plus delegation to `buildFinancialStatusReport()` for
  financial alerts. Output: structured `OperationalReport`.
- **Step 1 — NOTIFICATION**: Write `REPORTING_COMPLETED` audit event.

### 2.3 Initiator Roles

- Allowed: `OWNER`, `ADMIN_OPERATIONS`
- Denied: `CREATIVE_PRODUCTION`, `QC`, `CLIENT`, `AGENT`

### 2.4 What the Agent MAY do

- Execute read-only queries against `commercial.*`, `production.*`, `orchestration.*`
- Call `buildFinancialStatusReport()` from DR 0116 for financial alert data
- Surface status distribution counts (no amounts, no margins, no internal cost)
- Surface operational alert lists (entity IDs and alert types; no sensitive data)
- Write a `REPORTING_COMPLETED` audit event (NOTIFICATION step)

### 2.5 What the Agent MAY NOT do

- Write to any table, including `system.audit_events` except via the existing audit path
- Expose `estimated_cost`, `total_amount`, `planned_amount`, `actual_amount`,
  `minimum_acceptable_margin_rate`, `target_margin_rate`, or any financial amount
- Expose `notes` from `qc_reviews`, `payload` from `audit_events`, or `metadata` from
  `production_jobs` (these fields may contain sensitive data)
- Modify any entity status, approval, QC verdict, or financial record
- Expand the AGENT_ALLOWLIST
- Access data outside its organization scope
- Invoke any LLM or external API

### 2.6 Blockers (Resolved)

| # | Blocker | Required Decision |
|---|---------|-------------------|
| B1 | `GENERATE_OPERATIONAL_REPORT` IntentType | Owner approval + schema migration |
| B2 | `reporting` specialist agent | Owner approval to add to `SPECIALIST_AGENT_REGISTRY` |

### 2.7 Financial and Security Boundaries

- Zero financial write authority
- No amounts, margins, or cost details surfaced (status flags and counts only)
- organizationId always from server-side token, never from agent context
- QC review notes never surfaced
- Audit event payloads never surfaced
- Production job metadata never surfaced

### 2.8 Audit Requirements

| Event | When |
|---|---|
| `REPORTING_STARTED` | Agent task created |
| `REPORTING_COMPLETED` | VERIFY step succeeds |

### 2.9 New Module Structure

```
lib/reporting/
  operational.ts                                   — read-only reporting functions
  __tests__/operational.test.ts
lib/agents/
  reporting-specialist.ts                          — specialist agent + delegateReporting()
  __tests__/reporting-specialist.test.ts
```

---

## 3. Explicitly Prohibited Assumptions

- Do not assume this record authorizes any AGENT_ALLOWLIST expansion.
- Do not assume the Reporting Agent may modify any entity.
- Do not assume the agent may expose internal cost, margin, amounts, or sensitive notes.
- Do not assume the agent may access data outside its organization scope.
- Do not assume any financial write authority.
- Do not assume an LLM or external API call is authorized.

---

## 4. Impact

| File | Change |
|------|--------|
| `docs/decisions/0117-reporting-agent.md` | New — this DR |
| `lib/reporting/operational.ts` | New — read-only operational reporting |
| `lib/reporting/__tests__/operational.test.ts` | New — unit tests |
| `lib/agents/reporting-specialist.ts` | New — specialist agent |
| `lib/agents/__tests__/reporting-specialist.test.ts` | New — unit tests |
| `lib/orchestration/types.ts` | Add `GENERATE_OPERATIONAL_REPORT` to `IntentType` |
| `lib/orchestration/planner.ts` | Add `GENERATE_OPERATIONAL_REPORT` plan template |
| `lib/orchestration/ai-planner.ts` | Add `GENERATE_OPERATIONAL_REPORT` to allowlist |
| `lib/agents/registry.ts` | Add `reporting` entry |
| `lib/agents/index.ts` | Add exports |
| `db/schema/orchestration.ts` | Update `agent_tasks_intent_type_check` |
| `db/migrations/0012_reporting_agent.sql` | Schema migration |

---

## 5. Owner Approval

**Status: APPROVED.**

Blockers resolved:
1. `GENERATE_OPERATIONAL_REPORT` IntentType approved and schema migration created (B1 — resolved)
2. `reporting` entry approved and registered in `SPECIALIST_AGENT_REGISTRY` (B2 — resolved)

Implementation complete.
