# Decision Record 0036 — Phase 08: Delivery Terminal Transition Authority

- **Decision Round:** Phase 08
- **Phase:** 08 — Production Queue
- **Status:** APPROVED — Owner-approved 2026-09-05.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 08 PLAN — "DR 0036: Define who may transition delivery
  to COMPLETED or FAILED. Define server-side authorization."
- **Relationship to prior records:** Does not modify Decision Records 0001–0027
  or 0038–0052. All remain authoritative and unchanged. Specifies the
  triggering authority for `SENDING → COMPLETED` and `SENDING → FAILED`
  transitions established in DR 0011 (Delivery state machine).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**. No statement is promoted above
FACT unless directly grounded in an approved Decision Record or verified schema.

---

## 1. Problem

**FACT (DR 0011):** The Delivery state machine defines two terminal success/
failure transitions: `SENDING → COMPLETED` and `SENDING → FAILED`. It does
not specify what triggers those transitions or which actor (human or system)
is authorized to apply them.

**FACT (Phase 08 PLAN D5):** Higgsfield integration is DEFERRED from Phase 08.
Phase 08 prepares provider-agnostic production infrastructure only. No external
delivery provider is implemented in Phase 08.

**FACT (Phase 08 PLAN):** Without defined terminal transition authority, the
Delivery lifecycle cannot be implemented end-to-end. SENDING → COMPLETED and
SENDING → FAILED must have a specified trigger mechanism.

---

## 2. Decision

**PROPOSED — presented for Owner approval:**

### 2.1 SENDING → COMPLETED: System-Driven

`SENDING → COMPLETED` is a system-driven transition. It is triggered when the
delivery mechanism reports success for all assets in the delivery (per
DR 0037 Phase 08 — completion criteria).

In Phase 08 (provider integration DEFERRED), this transition is triggered by
an explicit admin action — OWNER or ADMIN_OPERATIONS manually marks the
Delivery COMPLETED — because no automated delivery mechanism exists yet.

**Phase 08 implementation:** OWNER or ADMIN_OPERATIONS may call a
`completeDelivery(deliveryId)` service function that transitions SENDING →
COMPLETED and writes the audit event.

**Post-Phase-08 / V1 production model:** when a delivery mechanism is
integrated, the transition becomes system-driven (triggered by a webhook or
async callback from the mechanism), not a manual action. The same service
function is called by the mechanism's handler rather than by an admin user.
Actor in the audit event is then `'SYSTEM'` rather than a user ID.

### 2.2 SENDING → FAILED: System-Driven or Admin-Initiated

`SENDING → FAILED` is triggered when:

1. **System-driven (preferred):** The delivery mechanism reports a permanent
   failure. In Phase 08 (provider DEFERRED), OWNER or ADMIN_OPERATIONS may
   call `failDelivery(deliveryId, reason)` to record a permanent failure.
2. **Admin-initiated on confirmed failure:** OWNER or ADMIN_OPERATIONS may
   trigger FAILED when the delivery is confirmed unrecoverable and no
   automated failure report is available.

A `failure_reason` text field on the Delivery record captures the cause.
This field is set at the time of the FAILED transition and is immutable.

**FACT:** `production.deliveries` does not currently have a `failure_reason`
column. This column is required and must be added in the Phase 08 migration.

### 2.3 COMPLETED and FAILED Are Terminal

**FACT (DR 0011):** COMPLETED and FAILED are terminal states. A Delivery in
COMPLETED or FAILED state may not be re-transitioned. A new Delivery record
must be created for any retry.

### 2.4 No Automatic Financial Event

**APPROVED (reaffirmed from DR 0011 §18):** Delivery COMPLETED does not
represent, and must not be used to infer, any payment, revenue, or financial
event. Financial settlement is governed by the payment lifecycle (DR 0047,
financial schema). Delivery completion has no direct financial consequence.

---

## 3. Scope

This record governs:
- Who or what may trigger `SENDING → COMPLETED`.
- Who or what may trigger `SENDING → FAILED`.
- The `failure_reason` column requirement on `production.deliveries`.
- Phase 08 manual admin authority for terminal transitions (provider deferred).

---

## 4. Non-Goals

- **PREPARING → CANCELLED, SENDING → CANCELLED:** governed by DR 0035
  Phase 08 (cancellation authority: OWNER/ADMIN_OPERATIONS).
- **Completion criteria** (what constitutes success): governed by DR 0037
  Phase 08.
- **Delivery actor authority for non-terminal transitions:** governed by
  DR 0035 Phase 08.
- **Provider / mechanism integration:** DEFERRED from Phase 08 (D5).
- **Financial events on Delivery completion:** not applicable.
- **Notification to CLIENT on COMPLETED:** DEFERRED (D10).

---

## 5. Tenant Isolation

All `completeDelivery` and `failDelivery` service calls include:
`WHERE id = :deliveryId AND organization_id = :orgId`
where `orgId` is sourced from the JWT session.

When the transition is system-driven (post-Phase-08), the delivery webhook
handler must verify the `organization_id` from the delivery record (server-
side lookup), not from webhook payload content.

---

## 6. Audit Requirements

**Canonical audit action strings (D14, Owner-approved):**

| Event | `action` string |
|---|---|
| Delivery → COMPLETED | `DELIVERY_COMPLETED` |
| Delivery → FAILED | `DELIVERY_FAILED` |

For COMPLETED: payload includes `delivery_id`, `organization_id`, `actor_id`,
`actor_role` (or `'SYSTEM'` for mechanism-driven), `completed_at`.

For FAILED: payload includes `delivery_id`, `organization_id`, `actor_id`,
`actor_role`, `failure_reason`.

Both transitions write the audit event in the same transaction as the status
update.

---

## 7. Failure / Idempotency

- An attempt to call `completeDelivery` on a Delivery not in SENDING state
  returns `{ok: false, reason: 'Delivery is not in SENDING state'}`.
- An attempt to call `completeDelivery` on a COMPLETED Delivery is a no-op
  with `{ok: true}` (idempotent for retry safety on webhook re-delivery).
- An attempt to call `failDelivery` on a FAILED Delivery is a no-op with
  `{ok: true}` (idempotent).
- Role guard: only OWNER/ADMIN_OPERATIONS (or SYSTEM for automated triggers)
  may call these functions. Unauthorized calls return `{ok: false, reason:
  'Insufficient authority'}`.

---

## 8. Dependencies

- DR 0011 — Delivery state machine (terminal states).
- DR 0035 Phase 08 — Delivery actor authority (OWNER/ADMIN_OPERATIONS as
  Phase 08 manual trigger actors).
- DR 0037 Phase 08 — Completion criteria (what COMPLETED means).
- Phase 08 migration: `failure_reason text` column on `production.deliveries`.

---

## 9. Deferred Items

1. **Automated delivery mechanism** and system-driven COMPLETED/FAILED trigger
   via webhook — DEFERRED (D5, Higgsfield DEFERRED from Phase 08).
2. **`failure_reason` enumeration** — currently free-form text; a CHECK
   constraint on failure reason codes is DEFERRED.
3. **Retry semantics** (creating a new Delivery after a FAILED one) — DEFERRED.
4. **CLIENT notification on COMPLETED** — DEFERRED (D10).

---

## 10. Owner Approval

This record is APPROVED by Owner 2026-09-05.

**Upon Owner approval:**
- OWNER/ADMIN_OPERATIONS manual COMPLETED/FAILED trigger authority is confirmed
  for Phase 08.
- The `failure_reason` column requirement on `production.deliveries` is confirmed.
- System-driven model for post-Phase-08 is framed (not authorized by this record).

---

## Explicitly Prohibited Assumptions

- Do not assume COMPLETED or FAILED Delivery may be re-transitioned.
- Do not assume Delivery COMPLETED has any financial implication.
- Do not assume a delivery webhook or automated mechanism exists in Phase 08.
- Do not assume this record authorizes schema changes, migrations, or code.
