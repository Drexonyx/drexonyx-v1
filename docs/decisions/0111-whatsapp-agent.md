# DR 0111 — WhatsApp Agent

**Status:** PROPOSED — Requires Owner decision on §2.2 blockers before implementation may begin.
**Phase:** Communication Agent
**Date:** 2026-09-17
**Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `00d2d62`
**Relationship to prior records:** Extends DR 0072 (skill architecture), DR 0075 (AGENT_ALLOWLIST),
DR 0108/0109 (specialist agent pattern). Does not modify Decision Records 0001–0110.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout this record set.

---

## 1. Context

**FACT:** The only approved outbound communication channel in DREXONYX V1 is email
via Resend (`RESEND_API_KEY`). Approved uses: delivery notification (DR 0099),
quote notification (DR 0107), orchestration escalation alerts (Architecture v2 §20 P2).

**FACT:** There is zero WhatsApp integration in the codebase. No provider credentials,
no webhook endpoints, no message templates, and no WhatsApp-related environment
variables exist in `.env.example` or any committed file.

**FACT:** The AGENT_ALLOWLIST (DR 0075 §2.2) contains exactly two entries:
`qc.asset.metadata` and `utility.prompt.optimize`. No communication skill
(`communication.whatsapp.*` or equivalent) exists or is approved.

**FACT:** The SPECIALIST_AGENT_REGISTRY (DR 0108) currently holds two agents:
`qc-metadata` and `prompt-optimize`. Neither handles external messaging.

**FACT:** The orchestration schema recognizes a `NOTIFICATION` step type
(`lib/orchestration/types.ts` line 44). It is handled in `runner.ts` case
`'NOTIFICATION'` but is not connected to WhatsApp or any outbound SMS/messaging
channel at the time of this DR.

**FACT:** WhatsApp Business messaging requires a WhatsApp Business Account (WABA)
approved by Meta and either a direct connection to the Meta Cloud API or access
through an approved Business Solution Provider (BSP). No WABA registration, BSP
selection, or Meta approval is on record for DREXONYX.

**FACT:** Meta's WhatsApp Business API requires pre-approved message templates
(HSM — Highly Structured Messages) for business-initiated (outbound) messages
outside an active 24-hour customer service window. No templates have been
submitted or approved.

**REQUIRES OWNER DECISION:** Which WhatsApp API integration path is authorized?
Options are:
  a. Meta Cloud API directly (requires Meta Developer App, WABA, phone number registration)
  b. BSP — Twilio, Vonage/Bird, 360dialog, Infobip, or other (requires BSP account and
     WABA linked to the BSP)
  Until the Owner selects and authorizes a specific path, implementation MUST NOT proceed.

**REQUIRES OWNER DECISION:** Which message templates are needed? Each template
  must be submitted to Meta for approval before it can be sent. No template text
  or category may be invented by this DR.

---

## 2. Decision

### 2.1 Purpose

Authorize the design of a WhatsApp Agent for DREXONYX that enables:
- **Outbound** — proactive client notifications via WhatsApp for key order lifecycle events
  (quote ready, delivery ready, payment confirmation) using Meta-approved templates
- **Inbound** — structured client messages relayed to DREXONYX staff; complex inquiries
  delegated to the Complex Agent for routing

The WhatsApp Agent does not replace the email channel. It is an additional channel.

### 2.2 Blockers (Implementation Gated)

The following items MUST be resolved by the Owner before any code may be written:

| # | Blocker | Required Decision |
|---|---------|-------------------|
| B1 | WhatsApp API provider | Select Meta Cloud API or a specific BSP |
| B2 | WABA registration | Confirm WABA exists or authorize registration |
| B3 | Phone number | Confirm dedicated WhatsApp Business number |
| B4 | Message templates | Provide approved template names, categories, and parameters |
| B5 | Inbound webhook auth | Confirm webhook verification token and signing secret mechanism for chosen provider |
| B6 | BSP API credentials (if BSP path) | Provider API key/secret names for server-side env vars |

### 2.3 Inbound Flow (PROPOSED — gated on B1–B5)

```
WhatsApp user message
  → Provider webhook POST /api/webhooks/whatsapp
  → Signature verification (provider-specific HMAC or token challenge)
  → org resolution (phone number → organizationId, server-side)
  → message classification (text / media / interactive)
  → if routine inquiry → enqueue NOTIFICATION task (ESCALATED to staff review queue)
  → if complex intent detected → delegate to Complex Agent (ROUTE_APPROVAL or new intent)
  → best-effort acknowledgement reply (approved template) within webhook response window
```

No inbound message modifies any financial record. No inbound message authorizes
any approval, payment, or state transition. Inbound processing is read-and-route only.

### 2.4 Outbound Flow (PROPOSED — gated on B1–B4)

Outbound messages are sent only via Meta-approved templates.

Triggered by server-side events (never by client-initiated action alone):

| Trigger | Proposed Template Category | Gate Required |
|---------|---------------------------|---------------|
| Quote DRAFT→SENT | UTILITY | None (mirrors DR 0107 email) |
| Delivery PREPARED | UTILITY | None (mirrors DR 0099 email) |
| Payment confirmed (PAID) | UTILITY | None |
| Escalation / staff action needed | UTILITY | None (OWNER notification) |

**PROPOSED:** Outbound is best-effort. WhatsApp API failure does not roll back
the triggering business event (same semantics as DR 0099 §2.3 and DR 0107 §2.5).

### 2.5 Complex Agent Delegation (PROPOSED — gated on B1–B5)

Inbound messages routed to the Complex Agent create an `AGENT` task with a new
intent type `ROUTE_WHATSAPP_INQUIRY` (requires schema migration — Owner must
explicitly approve schema change before implementation). The Complex Agent may:
- Delegate to `qc-metadata` or `prompt-optimize` sub-tasks per DR 0108/0109
- Escalate to a human approval gate (no autonomous reply to client)

The Complex Agent may NOT:
- Send a WhatsApp reply autonomously without a human-approved template
- Authorize any financial transaction from an inbound WhatsApp message
- Create, update, or delete any commercial record based on inbound message content alone

### 2.6 Required New Skills (PROPOSED — AGENT_ALLOWLIST expansion requires Owner approval)

The following skills are NOT yet in the AGENT_ALLOWLIST and MUST NOT be added
until the Owner explicitly approves each one with a new or amended decision record:

| Proposed Skill ID | Purpose |
|------------------|---------|
| `communication.whatsapp.send` | Send an outbound template message via approved WhatsApp provider |
| `communication.whatsapp.classify` | Classify inbound message intent (text parsing, no AI generation) |

**No AGENT_ALLOWLIST expansion is authorized by this record.**

### 2.7 Required New IntentType (PROPOSED — schema change gated on Owner approval)

`ROUTE_WHATSAPP_INQUIRY` — routes an inbound WhatsApp message to the appropriate
handler. Requires adding to the `agent_tasks.intent_type` CHECK constraint
(schema migration). **Not authorized by this record.**

### 2.8 Permissions

The WhatsApp Agent inherits the DREXONYX RBAC model. Additional constraints:
- Outbound sends: server-side only, triggered by approved lifecycle events
- Inbound: webhook endpoint is unauthenticated from client perspective but
  verifies provider signature before processing
- `organizationId` is resolved server-side from the registered WhatsApp number;
  it is never derived from message content
- No `CLIENT` or `AGENT` role may trigger an outbound send directly

### 2.9 Financial and Security Boundaries

- Zero financial authority. The WhatsApp Agent reads no `financial.*` tables.
- No outbound message contains internal cost, margin, `estimated_cost`, or
  gross profit data.
- No payment, refund, settlement, or budget modification may be initiated via
  WhatsApp message.
- No cross-client data. `organizationId` is always resolved server-side.
- Webhook endpoint enforces provider signature verification before any processing.
- Provider API credentials (`WHATSAPP_API_KEY` or BSP equivalent) are server-side only;
  no `NEXT_PUBLIC_` prefix; never committed to source control.
- Message content from inbound WhatsApp is untrusted external data. It must be
  sanitized before use in any DB query or AI prompt.

### 2.10 Human Approval Gates

| Scenario | Gate |
|----------|------|
| Inbound message requires DREXONYX staff response | ESCALATION gate → OWNER or ADMIN_OPERATIONS |
| Sending a new template category not yet approved | Blocked until Owner approves new template |
| Any financial action implied by inbound message | BLOCKED — financial actions require separate authorization path |

Autonomous client replies without human approval are not authorized.

### 2.11 Audit

All WhatsApp events write to the existing `system.audit_log`:
- `WHATSAPP_INBOUND_RECEIVED` — inbound message received and classified
- `WHATSAPP_OUTBOUND_SENT` — outbound template dispatched
- `WHATSAPP_OUTBOUND_FAILED` — outbound dispatch failed (best-effort, not fatal)
- `WHATSAPP_ESCALATED` — inbound message escalated to staff queue

Standard orchestration audit events apply to any resulting Agent task.

### 2.12 Retry and Escalation

- **Outbound retry:** At most 1 retry on transient provider error (5xx). Permanent
  failures (4xx, invalid template, opt-out) are not retried. Best-effort semantics
  apply; failure does not roll back the triggering business event.
- **Inbound escalation:** Any message the classifier cannot confidently route is
  escalated immediately to the staff review queue (same `escalateTask()` path as
  the existing orchestration escalation, DR §escalation).
- **Webhook timeout:** Provider webhook response must return within the provider's
  deadline (varies by BSP; typically 20 seconds). If processing cannot complete
  within the window, an acknowledgement is returned and processing continues
  asynchronously via an Agent task.

### 2.13 Required WhatsApp API/Integration Dependencies

The following must be provisioned before implementation can begin:

| Dependency | Owner Action Required |
|------------|-----------------------|
| WhatsApp Business Account (WABA) | Register with Meta or link to BSP |
| Dedicated phone number | Register and verify with Meta |
| Provider account | Create and fund BSP account (if BSP path) |
| API credentials | Provision and store as Vercel server-side env vars |
| Webhook URL | Register with provider (Preview env only until Owner approves Production) |
| Message templates | Submit to Meta and obtain approval; share approved names/params |
| Webhook signing secret | Provision and store as Vercel server-side env var |

### 2.14 New Module Structure (PROPOSED — not implemented by this record)

```
lib/whatsapp/
  client.ts          — provider API client (send only, reads WHATSAPP_API_KEY)
  webhook.ts         — inbound webhook handler and signature verifier
  templates.ts       — approved template ID registry (constants, no hardcoded text)
  classifier.ts      — intent classifier for inbound messages
  outbound.ts        — outbound send orchestration (best-effort wrapper)
app/api/webhooks/whatsapp/
  route.ts           — POST handler for provider webhook
```

No file in `app/api/webhooks/whatsapp/` may write financial records or approve gates.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume this record authorizes any AGENT_ALLOWLIST expansion.
- Do not assume any WhatsApp API endpoint, parameter, or behavior not confirmed
  by the selected provider's official documentation.
- Do not assume WABA registration, phone number, or template approval exist.
- Do not assume any existing BSP account or credentials are available.
- Do not assume inbound WhatsApp messages may authorize financial transactions.
- Do not assume the Complex Agent may reply autonomously to clients via WhatsApp.
- Do not assume `ROUTE_WHATSAPP_INQUIRY` is an approved IntentType — it is PROPOSED.
- Do not assume this record authorizes schema changes or database migrations.
- Do not assume outbound messages may contain internal cost, margin, or financial data.
- Do not implement code based on this DR until all B1–B5 blockers are resolved.

---

## 4. Impact

| File | Change |
|------|--------|
| `docs/decisions/0111-whatsapp-agent.md` | New — this DR |

No code changes. Implementation is blocked pending Owner decisions on §2.2.

---

## 5. Owner Approval

**Status: PENDING.**

Required Owner decisions before implementation may begin:
1. Select WhatsApp API integration path (B1 — Meta Cloud API or specific BSP)
2. Confirm or authorize WABA registration (B2)
3. Confirm dedicated phone number (B3)
4. Provide approved message template names and parameter schemas (B4)
5. Confirm webhook authentication mechanism for selected provider (B5)
6. Explicitly approve AGENT_ALLOWLIST expansion for `communication.whatsapp.send`
   and `communication.whatsapp.classify` (requires new or amended DR)
7. Explicitly approve `ROUTE_WHATSAPP_INQUIRY` IntentType addition and
   associated schema migration
