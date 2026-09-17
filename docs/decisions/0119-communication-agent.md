# DR 0119 — Communication Agent

**Status:** APPROVED — Design authorized. Blockers B1 and B2 resolved. Implementation complete.
**Phase:** Communication Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `283d751`
**Relationship to prior records:** Extends DR 0071 (orchestration), DR 0075 (AGENT_ALLOWLIST),
DR 0108/0109 (specialist agent pattern), DR 0099 (delivery email), DR 0107 (quote email).
Reuses `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, `ORCHESTRATION_ALERT_EMAIL`.
Does not modify Decision Records 0001–0118.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** The only approved outbound communication channel in DREXONYX V1 is email
via Resend (`RESEND_API_KEY`). Approved uses: delivery notification (DR 0099),
quote notification (DR 0107), escalation alert (Architecture v2 §20 P2 / `lib/orchestration/email.ts`),
boundary violation alert (`lib/orchestration/email.ts`).

**FACT:** All existing email sends are wired into specific business event handlers.
There is no orchestration-managed, specialist-agent-dispatched internal operational
notification capability. The Finance Monitoring, Reporting, and Analytics agents each
emit a `NOTIFICATION` step, but that step currently writes only an audit event —
it has no structured outbound email path for their specific operational events.

**FACT:** `VERIFY`, `NOTIFICATION`, `FINANCIAL_CHECK`, and other step types exist.
`NOTIFICATION` is already in the CHECK constraint. A new IntentType
`COORDINATE_INTERNAL_NOTIFICATION` is required (blocker B1 — resolved by this record).

**FACT:** No WhatsApp, SMS, push, or social messaging infrastructure exists in the
codebase. DR 0111 (WhatsApp Agent) has PROPOSED/PENDING status; its blockers are
unresolved. WhatsApp is explicitly OUT OF SCOPE for this DR.

**FACT (standing security constraint):** Internal financial data (estimated_cost,
gross_margin, AI cost, provider rates) is NEVER included in any outbound notification.

---

## 2. Decision

### 2.1 Purpose

Authorize design and implementation of a Communication Agent that provides a
structured, auditable specialist-agent path for dispatching internal operational
email notifications to DREXONYX staff via Resend.

Covered event types:
- `JOB_FAILED` — production job failure alert to ADMIN_OPERATIONS
- `QC_COMPLETED` — QC review completed (pass or fail) alert
- `MONITORING_ALERT` — finance/analytics monitoring event alert
- `ANOMALY_DETECTED` — operational anomaly (from analytics) alert
- `REPORT_READY` — operational or intelligence report available for review

Explicitly excluded from this DR:
- Escalation and boundary violation alerts (already handled by `lib/orchestration/email.ts`)
- Client-facing notifications (DR 0099, DR 0107)
- WhatsApp, SMS, push, social (OUT OF SCOPE — DR 0111 is blocked)
- Marketing or growth messaging (DR 0112 is OUT OF SCOPE)

### 2.2 Blockers (Resolved)

| # | Blocker | Resolution |
|---|---------|------------|
| B1 | IntentType `COORDINATE_INTERNAL_NOTIFICATION` requires schema change | APPROVED by this record — migration provided |
| B2 | `communication` entry in `SPECIALIST_AGENT_REGISTRY` requires Owner approval | APPROVED by this record |

No AGENT_ALLOWLIST expansion. Uses existing `NOTIFICATION` step type only.

### 2.3 Module — `lib/communication/notifications.ts`

New read-only module. Exports:
- `InternalNotificationEventType` — union of 5 approved event types
- `buildNotificationEmailContent()` — pure function; returns `{ subject, html }`
- `sendInternalNotification()` — best-effort Resend dispatch to `ORCHESTRATION_ALERT_EMAIL`

**Best-effort semantics:** email failures do not propagate to the caller and do not
roll back any orchestration state. Missing env vars produce a no-op (consistent with
`lib/orchestration/email.ts`).

No financial amounts, margins, costs, or provider rates appear in email content.

### 2.4 Specialist Agent — `lib/agents/communication-specialist.ts`

`delegateCommunication()` creates a sub-task via `delegateSubTask()`.

**Plan:** single `NOTIFICATION` step carrying `{ eventType, title, detail }` in `input`.

**IntentType:** `COORDINATE_INTERNAL_NOTIFICATION`

**Initiator roles:** OWNER, ADMIN_OPERATIONS only. Runtime guard rejects all other roles.

`organizationId` always from server-side session token, never from agent context or
client-supplied input.

### 2.5 Authorization

| Role | May initiate |
|------|-------------|
| OWNER | Yes |
| ADMIN_OPERATIONS | Yes |
| CREATIVE_PRODUCTION | No |
| QC | No |
| CLIENT | No |

### 2.6 Security Boundaries

- No financial data, cost, margin, or provider rate in any notification
- `RESEND_API_KEY` is server-side only; never `NEXT_PUBLIC_`; never committed
- `ORCHESTRATION_ALERT_EMAIL` is server-side only; never exposed to client
- All notification text is built from server-side-controlled parameters; no
  client-supplied free-text passes directly to email HTML without escaping
- Organization isolation: `organizationId` always from server-side token

### 2.7 Audit

Notification dispatches are audit-event-recorded via the NOTIFICATION step
executor in the orchestration runner. The Communication Agent itself does not
write audit events directly.

---

## 3. Impact

| File | Change |
|------|--------|
| `docs/decisions/0119-communication-agent.md` | New — this DR |
| `lib/communication/notifications.ts` | New — `sendInternalNotification`, `buildNotificationEmailContent` |
| `lib/communication/__tests__/notifications.test.ts` | New — unit tests |
| `lib/agents/communication-specialist.ts` | New — `delegateCommunication` |
| `lib/agents/__tests__/communication-specialist.test.ts` | New — unit tests |
| `lib/agents/registry.ts` | Modified — `communication` entry added |
| `lib/agents/index.ts` | Modified — exports added |
| `lib/orchestration/types.ts` | Modified — `COORDINATE_INTERNAL_NOTIFICATION` added |
| `lib/orchestration/planner.ts` | Modified — plan template added |
| `lib/orchestration/ai-planner.ts` | Modified — allowlist + system prompt updated |
| `db/schema/orchestration.ts` | Modified — intent_type CHECK constraint updated |
| `db/migrations/0014_communication_agent.sql` | New — schema migration |
