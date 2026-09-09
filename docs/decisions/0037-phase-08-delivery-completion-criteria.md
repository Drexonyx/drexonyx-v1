# Decision Record 0037 — Phase 08: Delivery Completion Criteria

- **Decision Round:** Phase 08
- **Phase:** 08 — Production Queue
- **Status:** APPROVED — Owner-approved 2026-09-05.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 08 PLAN — "DR 0037: Define objective requirements for
  SENDING → COMPLETED."
- **Relationship to prior records:** Does not modify Decision Records 0001–0027
  or 0038–0052. All remain authoritative and unchanged. Provides the Phase 08
  operationalization of `Delivery.COMPLETED` (DR 0011 §4).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**. No statement is promoted above
FACT unless directly grounded in an approved Decision Record or verified schema.

---

## 1. Problem

**FACT (DR 0011 §4):** `COMPLETED` is defined as: "The delivery mechanism
successfully made the content available; Delivery's own execution responsibility
is discharged." This is the minimum definition — it does not enumerate which
candidate criteria are required, excluded, or deferred.

**FACT (Phase 08 PLAN D5):** No external delivery provider or mechanism is
implemented in Phase 08. "Mechanism success" must be operationalized without
assuming a provider.

**FACT (Phase 08 PLAN D2):** Delivery ↔ Asset relationship uses a join table
(`delivery_assets`). A Delivery can reference multiple Asset rows. "All assets
in the delivery" is the unit of completion.

---

## 2. Decision

**PROPOSED — presented for Owner approval:**

### 2.1 Completion Definition (Phase 08)

A Delivery is COMPLETED when:

1. **All assets referenced in `delivery_assets` for this Delivery have been
   confirmed as available to the client.** In Phase 08, this means: the admin
   (OWNER or ADMIN_OPERATIONS) manually confirms that the assets have been
   shared with the client through whatever delivery channel was used (e.g.,
   email with attachment, shared drive, secure download link).
2. **The confirmation is recorded** by calling the `completeDelivery` service
   function (DR 0036 Phase 08), which transitions the Delivery to COMPLETED
   and writes the audit event.
3. **No client acknowledgement is required** for COMPLETED. Client
   acknowledgement (the client confirming receipt) is DEFERRED.

### 2.2 What COMPLETED Means

**APPROVED (reaffirmed from DR 0011 §4, DR 0020 §4):**

`Delivery.COMPLETED` is scoped to the single Delivery record's own execution.
It does not mean:
- All Order requirements are satisfied (that is DR 0012, the Order completion
  guard — unchanged).
- The client has confirmed receipt.
- Payment has been received.
- Any financial event has occurred.

It means only: the delivery mechanism's execution responsibility for this
Delivery record is discharged.

### 2.3 All-or-Nothing Per Delivery Record

**PROPOSED:** Completion is all-or-nothing for a single Delivery record. There
is no partial-COMPLETED state (e.g., "3 of 5 assets delivered"). Either the
Delivery record as a whole is COMPLETED (all its assets delivered) or it is
not yet COMPLETED (or FAILED, or CANCELLED).

Partial delivery semantics (a Delivery for a subset of Order assets) are
addressed at the delivery creation level (which assets are included in
`delivery_assets`), not at the completion level.

### 2.4 Required Candidates (Confirmed)

The following criteria are REQUIRED for COMPLETED (in addition to §2.1):
- The Delivery must be in SENDING state (cannot transition from PREPARING
  or any terminal state).
- All `delivery_assets` rows for this Delivery must exist at transition time
  (zero-asset delivery is not COMPLETED — it is a configuration error).

### 2.5 Excluded Candidates

The following are NOT required for COMPLETED:
- Client acknowledgement of receipt — DEFERRED.
- Payment in PAID state — financial separation (DR 0011 §18, reaffirmed).
- All Approvals being APPROVED — Approval is an independent satisfaction
  track; the gate was at Delivery creation (DR 0034 Phase 08).
- Any QC review verdict — QC clearance is a pre-condition for CLIENT_PREVIEW
  (DR 0039), not for Delivery completion.

### 2.6 No Invented Provider Semantics

**FACT (D5):** Higgsfield integration is DEFERRED from Phase 08. This record
does not invent provider-specific completion signals (webhooks, status polling,
CDN confirmation). The Phase 08 completion trigger is manual admin confirmation
(§2.1).

---

## 3. Scope

This record governs:
- The operationalization of `Delivery.COMPLETED` for Phase 08.
- The all-or-nothing completion model.
- The exclusion of client acknowledgement, payment, and QC from the
  completion gate.

---

## 4. Non-Goals

- **Delivery terminal transition authority (who triggers COMPLETED):**
  governed by DR 0036 Phase 08.
- **Delivery ↔ Asset schema** (which assets are in a Delivery): governed by
  Phase 08 migration and DR 0053 / DR 0054.
- **Client acknowledgement:** DEFERRED.
- **Provider-specific completion signal:** DEFERRED (D5).
- **Order completion guard (DR 0012):** NOT modified. Order COMPLETED requires
  DR 0012's AND-semantics; Delivery.COMPLETED is one component.
- **Financial events:** not triggered by Delivery completion.

---

## 5. Tenant Isolation

No specific tenant isolation requirements beyond those in DR 0035 and DR 0036
Phase 08. The `completeDelivery` service function queries `delivery_assets`
with `WHERE delivery_id = :deliveryId AND organization_id = :orgId`.

---

## 6. Audit Requirements

Covered by DR 0036 Phase 08 §6 (`DELIVERY_COMPLETED` action string).

Additional payload for COMPLETED audit event: `asset_count` (number of
`delivery_assets` rows confirmed), `completed_at`.

---

## 7. Failure / Idempotency

Per DR 0036 Phase 08 §7: `completeDelivery` on an already-COMPLETED Delivery
is idempotent (`{ok: true}`).

A `completeDelivery` call where the Delivery has zero `delivery_assets` rows
returns `{ok: false, reason: 'Delivery has no associated assets'}`. This is
a configuration error that must be corrected before COMPLETED can be achieved.

---

## 8. Dependencies

- DR 0011 — Delivery state machine and state definition for COMPLETED.
- DR 0034 Phase 08 — Delivery creation gate (Approval pre-conditions already
  satisfied at this point).
- DR 0036 Phase 08 — Who triggers the COMPLETED transition.
- Phase 08 migration — `delivery_assets` join table (D2 direction).

---

## 9. Deferred Items

1. **Client acknowledgement requirement** for COMPLETED — DEFERRED.
2. **Provider-driven completion signal** (automated webhook, CDN confirmation)
   — DEFERRED (D5).
3. **Partial delivery** (delivering a subset of assets) — DEFERRED.
4. **`delivery_assets` record-level confirmation** (per-asset delivery status
   tracking within a Delivery) — DEFERRED; Phase 08 treats the Delivery as a
   whole.

---

## 10. Owner Approval

This record is APPROVED by Owner 2026-09-05.

**Upon Owner approval:**
- All-or-nothing completion (§2.3) is confirmed.
- Client acknowledgement exclusion (§2.5) is confirmed.
- Financial separation at COMPLETED is confirmed.
- Manual admin confirmation as Phase 08 trigger is confirmed.

---

## Explicitly Prohibited Assumptions

- Do not assume client acknowledgement is required for COMPLETED.
- Do not assume Payment PAID is required for Delivery COMPLETED.
- Do not assume a provider webhook or automated mechanism triggers COMPLETED
  in Phase 08.
- Do not assume a Delivery with zero `delivery_assets` rows may be COMPLETED.
- Do not assume DR 0012 (Order completion guard) is modified.
- Do not assume this record authorizes schema changes, migrations, or code.
