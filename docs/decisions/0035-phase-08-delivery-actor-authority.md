# Decision Record 0035 — Phase 08: Delivery Actor Authority

- **Decision Round:** Phase 08
- **Phase:** 08 — Production Queue
- **Status:** APPROVED — Owner-approved 2026-09-05.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 08 PLAN blocker D8 — "Delivery and ProductionJob
  cancellation authority: OWNER and ADMIN_OPERATIONS."
- **Relationship to prior records:** Does not modify Decision Records 0001–0027
  or 0038–0052. All remain authoritative and unchanged. Establishes per-role
  authority for Delivery creation and state transitions (DR 0011 state machine).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**. No statement is promoted above
FACT unless directly grounded in an approved Decision Record or verified schema.

---

## 1. Problem

**FACT (DR 0011):** The Delivery state machine was established without
specifying which RBAC roles hold authority over each state transition.
Creation authority, PREPARING → SENDING authority, and cancellation authority
were all deferred.

**FACT (Phase 08 PLAN, D8):** Owner direction: OWNER and ADMIN_OPERATIONS
hold Delivery (and ProductionJob) cancellation authority. CREATIVE_PRODUCTION
is excluded unless an approved DR explicitly requires it.

**FACT (Phase 08 PLAN item 8):** Without a defined role authority matrix for
Delivery, Phase 08 cannot implement server-side role guards on delivery
service functions.

---

## 2. Decision

**PROPOSED — presented for Owner approval:**

### 2.1 Delivery Role Authority Matrix

| Action | OWNER | ADMIN_OPS | CREATIVE_PROD | QC | CLIENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Create (→PREPARING) | ✓ | ✓ | — | — | — |
| PREPARING → SENDING | ✓ | ✓ | — | — | — |
| SENDING → COMPLETED | system | system | — | — | — |
| SENDING → FAILED | system | — | — | — | — |
| Any → CANCELLED | ✓ | ✓ | — | — | — |

Legend:
- **system** — transition is mechanism-driven; no human actor required.
  See DR 0036 Phase 08 for terminal transition authority detail.
- **—** — role has no authority for this action.

### 2.2 OWNER and ADMIN_OPERATIONS

OWNER and ADMIN_OPERATIONS hold full Delivery management authority:
- Create a Delivery record (→PREPARING), subject to the orchestration gate
  in DR 0034 Phase 08.
- Advance to SENDING.
- Cancel a Delivery from PREPARING or SENDING.

### 2.3 CREATIVE_PRODUCTION Exclusion

CREATIVE_PRODUCTION has no Delivery management authority. Rationale: Delivery
is a client-facing fulfillment action. CREATIVE_PRODUCTION is scoped to
production execution (creating and managing production jobs, uploading assets).
Delivery authority is an operations-level responsibility.

Owner direction (D8) confirms: CREATIVE_PRODUCTION does not hold cancellation
authority unless an existing approved DR explicitly requires it. No such DR
exists.

### 2.4 QC Exclusion

QC has no Delivery management authority. QC's role is limited to asset verdict
submission (DR 0039).

### 2.5 CLIENT Exclusion

CLIENT has no Delivery management authority. CLIENT is the recipient of
deliveries, not the initiator. CLIENT's interaction with Delivery is
read-only (portal delivery status view, if implemented). No Delivery state
transition is ever initiated by CLIENT.

### 2.6 ProductionJob Cancellation Authority

**PROPOSED (D8 — also applies to ProductionJob):**

For ProductionJob and AiGeneration cancellation:
- Cancel (→CANCELLED from any non-terminal state): OWNER, ADMIN_OPERATIONS only.
- CREATIVE_PRODUCTION may NOT cancel a ProductionJob or AiGeneration.

Rationale: cancellation of an active production job may have cost and
coordination implications. This is an operations-level decision.

---

## 3. Scope

This record governs:
- RBAC authority for all Delivery state transitions.
- RBAC authority for ProductionJob and AiGeneration cancellation (§2.6).
- The system-driven nature of terminal Delivery transitions (§2.1).

---

## 4. Non-Goals

- **Terminal transition mechanics** (what triggers COMPLETED or FAILED):
  governed by DR 0036 Phase 08 and DR 0037 Phase 08.
- **Delivery creation gate** (Approval pre-condition): governed by
  DR 0034 Phase 08.
- **Delivery ↔ Asset schema:** governed by Phase 08 migration.
- **Notification on state change:** DEFERRED (D10).
- **CLIENT portal delivery status view:** a read-only portal view is in
  Phase 08 scope but does not constitute Delivery management authority.

---

## 5. Tenant Isolation

1. All Delivery mutation service functions include:
   `WHERE id = :deliveryId AND organization_id = :orgId`
   where `orgId` is sourced from the admin JWT session.
2. The `organization_id` on a new Delivery record is set from the JWT session.
3. No cross-tenant Delivery operations are permitted.

---

## 6. Audit Requirements

**Canonical audit action strings (D14, Owner-approved):**

| Event | `action` string |
|---|---|
| Delivery created | `DELIVERY_CREATED` |
| Delivery → SENDING | `DELIVERY_SENDING` |
| Delivery → COMPLETED | `DELIVERY_COMPLETED` |
| Delivery → FAILED | `DELIVERY_FAILED` |
| Delivery → CANCELLED | `DELIVERY_CANCELLED` |
| ProductionJob → CANCELLED | `PRODUCTION_JOB_CANCELLED` |
| AiGeneration → CANCELLED | `AI_GENERATION_CANCELLED` |

All audit events include `organization_id`, `actor_id`, `actor_role`, and the
relevant entity ID in the payload.

---

## 7. Failure / Idempotency

- An attempt to cancel a Delivery already in COMPLETED, FAILED, or CANCELLED
  state must return `{ok: false, reason: 'Delivery is already in terminal state'}`.
- An attempt to advance a CANCELLED Delivery must return an error.
- Role guard failures return `{ok: false, reason: 'Insufficient authority'}`.
  No information about the Delivery's existence is revealed to unauthorized callers.

---

## 8. Dependencies

- DR 0011 — Delivery state machine.
- DR 0034 Phase 08 — Delivery creation gate (orchestration pre-condition).
- DR 0036 Phase 08 — Delivery terminal transition authority.
- DR 0037 Phase 08 — Delivery completion criteria.
- DR 0042 — Admin authentication strategy (JWT claims; role extraction).
- DR 0008 Phase 02 — ProductionJob state machine.
- DR 0009 Phase 02 — AiGeneration state machine.

---

## 9. Deferred Items

1. **CREATIVE_PRODUCTION access to Delivery status reads** — DEFERRED.
   Whether CREATIVE_PRODUCTION can view Delivery records in the admin UI is
   a read-only visibility question not addressed here.
2. **CLIENT portal delivery status view** — in Phase 08 scope as a read-only
   view; delivery read authority for CLIENT is scoped to their organization's
   Deliveries only.
3. **Multi-delivery management** (cancelling one of multiple Deliveries for
   an Order) — DEFERRED; single-delivery-per-Order is the V1 model.

---

## 10. Owner Approval

This record is APPROVED by Owner 2026-09-05.

**Upon Owner approval:**
- RBAC matrix in §2.1 is authoritative for Phase 08 build.
- CREATIVE_PRODUCTION and QC exclusion from Delivery management is confirmed.
- OWNER/ADMIN_OPERATIONS ProductionJob and AiGeneration cancellation authority
  is confirmed (§2.6).

---

## Explicitly Prohibited Assumptions

- Do not assume CREATIVE_PRODUCTION may cancel a ProductionJob, AiGeneration,
  or Delivery.
- Do not assume CLIENT may initiate or cancel a Delivery.
- Do not assume a terminal Delivery may be re-opened or re-advanced.
- Do not assume this record authorizes schema changes, migrations, or code.
