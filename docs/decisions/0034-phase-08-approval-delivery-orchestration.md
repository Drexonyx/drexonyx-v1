# Decision Record 0034 — Phase 08: Approval ↔ Delivery Orchestration

- **Decision Round:** Phase 08
- **Phase:** 08 — Production Queue
- **Status:** APPROVED — Owner-approved 2026-09-05.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 08 PLAN blocker — "D7: QC PASS does NOT auto-create
  Approval; Approval creation is explicit. DR 0034: delivery requires all
  required approvals to be APPROVED."
- **Relationship to prior records:** Does not modify Decision Records 0001–0027
  or 0038–0052. All remain authoritative and unchanged. Extends DR 0011
  (Delivery state machine) and DR 0010 (Approval state machine) with an
  explicit orchestration gate at Delivery creation time.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**. No statement is promoted above
FACT unless directly grounded in an approved Decision Record or verified schema.

---

## 1. Problem

**FACT (DR 0011):** The Delivery state machine defines `PREPARING → SENDING →
COMPLETED | FAILED | CANCELLED` and `PREPARING → CANCELLED`. It does not specify
what conditions must be met before Delivery creation is permitted.

**FACT (DR 0010):** Approval records track client decisions (PENDING, APPROVED,
REJECTED, CANCELLED, EXPIRED). The relationship between the Approval satisfaction
track and Delivery initiation was explicitly deferred.

**FACT (Phase 08 PLAN D7):** QC PASS does NOT automatically create an Approval.
Approval creation is a separate explicit admin workflow step. This means that at
Delivery creation time, the system cannot assume Approvals exist for every asset.

**FACT (Phase 08 PLAN):** Without a defined gate, Delivery creation could proceed
on assets that have not been approved by the client. This would violate the
commercial intent of client approval.

---

## 2. Decision

**PROPOSED — presented for Owner approval:**

### 2.1 The Gate: Delivery Creation Requires All Approvals APPROVED

A Delivery record may only be created (status = `PREPARING`) for an Order when
ALL of the following conditions are simultaneously true at Delivery creation time:

1. **All existing Approval records for the Order are in APPROVED state.**
   Approval records in PENDING, REJECTED, CANCELLED, or EXPIRED state block
   Delivery creation.
2. **At least one Approval record exists for the Order.** An Order with zero
   Approval records does not satisfy the gate. (See §2.3 — zero-Approval
   semantics.)
3. **The Order is in ACTIVE state.** Delivery may only be initiated for an
   active Order.

This gate is evaluated at the moment the create-delivery service function is
called. It is not a database-enforced constraint; it is an application-layer
check performed in the same transaction as the Delivery insert.

### 2.2 Delivery ↔ Approval Independence

**APPROVED (reaffirmed from DR 0010, DR 0011):**

Approval and Delivery are independent satisfaction tracks. An Approval does not
directly trigger Delivery. A Delivery does not directly affect Approval status.

- An Approval record's status is not modified when a Delivery is created,
  progresses, or reaches a terminal state.
- A Delivery record's status is not modified when an Approval is decided.
- The orchestration gate in §2.1 is a pre-condition check at Delivery creation
  time only. Once a Delivery record exists (has passed the gate), subsequent
  changes to Approval records (e.g., an Approval is cancelled after Delivery
  is in SENDING) do not roll back or cancel the Delivery.

### 2.3 Zero-Approval Semantics

**Owner-confirmed (D12):** An Order with zero Approval records MUST NOT have
a Delivery created for it. This rule is not subject to DR 0019 zero-requirement
semantics. The requirement that at least one Approval exists (§2.1 item 2)
is not vacuously satisfied by an empty Approval set.

Rationale: Approval creation is an explicit admin workflow step (D7). Zero
Approval records means the admin workflow was never initiated — not that
approval is implicitly satisfied. An Order must have at least one APPROVED
Approval before any Delivery is created, regardless of whether the Order's
Requirements Snapshot contains Required Approval obligations. This prevents
accidental delivery of unreviewed work.

**DR 0019 interaction (resolved, D12):** DR 0019's zero-requirement Order
completion semantics (vacuous satisfaction of zero required elements) do NOT
apply to the Delivery creation gate. The gate in §2.1 item 2 is a hard
pre-condition at Delivery creation time, not a satisfaction check against the
Requirements Snapshot framework. The two rules operate at different checkpoints
and are not in conflict.

### 2.4 QC PASS Does Not Auto-Create Approval

**PROPOSED (Owner direction D7):**

When an Asset passes QC (QC verdict = PASS, Asset transitions to
`CLIENT_PREVIEW`), no Approval record is automatically created. Approval
creation is a separate, explicit admin action (OWNER or ADMIN_OPERATIONS).

Rationale: separating QC clearance from Approval creation allows:
- Batching multiple assets into a single approval workflow.
- Admin review before presenting to the client.
- Flexibility in which assets require formal approval.

### 2.5 Rejected or Failed Approval Handling

If any Approval for an Order is in REJECTED, CANCELLED, or EXPIRED state,
Delivery creation is blocked until:
- A new Approval is created (by OWNER/ADMIN_OPERATIONS) for the relevant
  asset, AND
- That new Approval is decided APPROVED by the CLIENT.

A REJECTED Approval does not automatically trigger asset revision. The admin
team must initiate a new production cycle (new Asset upload → QC → new
Approval) manually.

### 2.6 Partial Delivery

**DEFERRED.** This record does not address partial delivery (delivering a
subset of approved assets). Delivery is currently modeled as a single record
per Order initiation. Partial delivery semantics are DEFERRED.

---

## 3. Scope

This record governs:
- The application-layer pre-condition check for Delivery creation.
- The zero-Approval gate (at least one APPROVED Approval required).
- The QC PASS ≠ Approval creation rule.
- The independence of Approval and Delivery status after Delivery creation.

---

## 4. Non-Goals

- **Delivery actor authority (who may call create-delivery):** governed by
  DR 0035 Phase 08.
- **Delivery completion criteria:** governed by DR 0037 Phase 08.
- **Delivery ↔ Asset join table schema:** governed by Phase 08 migration (D2).
- **Order completion guard (DR 0012):** NOT modified by this record. DR 0012's
  AND-semantics (Delivery COMPLETED AND all Required Approvals satisfied) remain
  unchanged.
- **Financial events:** Delivery creation and completion have no direct
  financial consequence per this record.
- **Notification to CLIENT on Approval creation:** DEFERRED (D10).
- **Automatic state cascades from Approval to Asset:** DEFERRED.

---

## 5. Tenant Isolation

1. The Delivery creation gate check queries Approvals with:
   `WHERE order_id = :orderId AND organization_id = :orgId`.
   The `organization_id` is sourced from the admin JWT session, never from
   client-supplied parameters.
2. The Delivery record's `organization_id` is set from the JWT session.
3. No cross-tenant Approval records are ever visible in the gate check.

---

## 6. Audit Requirements

**Canonical audit action strings (D14, Owner-approved):**

| Event | `action` string |
|---|---|
| Delivery created (gate passed) | `DELIVERY_CREATED` |
| Delivery gate failed (blocked) | `DELIVERY_CREATION_BLOCKED` |

`DELIVERY_CREATION_BLOCKED` audit event must include:
- `order_id`, `organization_id`, `actor_id`, `actor_role`
- `blocking_approvals`: array of `{approval_id, status}` for non-APPROVED
  Approvals that caused the block.

---

## 7. Failure / Idempotency

- If the gate check fails, the service returns `{ok: false, reason: '...'}`.
  No Delivery record is created. The audit event `DELIVERY_CREATION_BLOCKED`
  is written (best-effort; may be omitted if the check failure is before
  transaction open).
- Gate check and Delivery insert are performed in a single database transaction
  to prevent a TOCTOU race between the check and the insert.
- Delivery creation is NOT idempotent by default. Creating a second Delivery
  for an Order that already has an active Delivery (PREPARING or SENDING) is
  a service-layer error. (Multiple deliveries per Order: DEFERRED.)

---

## 8. Dependencies

- DR 0028 Phase 08 — Approval target types (gate queries Approval records).
- DR 0029 Phase 08 — Approval role authority (who creates and decides
  Approvals before gate is satisfied).
- DR 0010 — Approval state machine (APPROVED terminal state).
- DR 0011 — Delivery state machine (PREPARING initial state).
- DR 0035 Phase 08 — Delivery actor authority (who calls create-delivery).
- DR 0039 — QC authority (QC PASS transitions Asset to CLIENT_PREVIEW;
  does not create Approval).

---

## 9. Deferred Items

1. **Partial delivery** — DEFERRED.
2. **Multiple deliveries per Order** — DEFERRED.
3. **Post-creation Approval change effects on active Delivery** — currently
   scoped as: no effect. A future DR may introduce hold/recall semantics.
4. **Expiry-driven Approval re-creation workflow** — DEFERRED.
5. **Notification to admin when all Approvals are APPROVED** (gate condition
   newly met) — DEFERRED (D10).
6. **Order completion guard integration:** DR 0012 is unchanged. The
   orchestration gate here is at Delivery creation, not at Order completion.

---

## 10. Owner Approval

This record is APPROVED by Owner 2026-09-05.

**Upon Owner approval:**
- The Delivery creation gate (§2.1) is mandatory in all Phase 08
  create-delivery implementations.
- QC PASS ≠ Approval auto-creation is confirmed (D7).
- Zero-Approval block (§2.3) is confirmed.

---

## Explicitly Prohibited Assumptions

- Do not assume QC PASS automatically creates an Approval record.
- Do not assume an Order with zero Approvals may have a Delivery created.
- Do not assume a subsequent Approval change (after Delivery creation)
  affects the Delivery's status.
- Do not assume Delivery creation is idempotent (duplicate delivery
  prevention is a service error, not a silent no-op).
- Do not assume this record authorizes schema changes, migrations, or code.
- Do not assume DR 0012 (Order completion guard) is modified.
