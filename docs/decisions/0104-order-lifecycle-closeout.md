# Decision Record 0104 — Phase 18: Order Lifecycle Close-out

- **Decision Round:** Phase 18
- **Phase:** 18 — Production Hardening (Minimum Viable Ops)
- **Status:** PROPOSED — Awaiting Owner approval. No schema, migration,
  application-code change, or action is authorized by this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-09
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Head commit `a866ee9` (Phase 16 complete)
- **Resolves:** Phase 17 finding H-1 — No `completeOrder` or `cancelOrder`
  service exists. Orders remain in `ACTIVE` status indefinitely after
  fulfillment completes, because the `ACTIVE → COMPLETED` and
  `ACTIVE → CANCELLED` transitions have never been implemented.
- **Relationship to prior records:** Does not modify Decision Records 0001–0103.
  All remain authoritative and unchanged. Directly implements the deferred
  items in DR 0007 (Order state machine) and DR 0012 (Order completion guard).
  Depends on DR 0007 (states and terminal behavior), DR 0011 (Delivery state
  machine), DR 0012 (guard conjunction), DR 0034 (Delivery creation gate),
  DR 0035 Phase 08 (Delivery actor authority), DR 0036 Phase 08 (Delivery
  terminal transition authority), DR 0037 Phase 08 (Delivery completion
  criteria), DR 0039 (authentication), DR 0046 (Order creation). References
  DR 0001/0002 (financial architecture and audit event patterns).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0103. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or verified source code.

---

## 1. Context

### 1.1 Current State

**FACT (Phase 17 inspection, `lib/admin/deliveries.ts`, `lib/admin/queries.ts`):**
No `completeOrder` function, `cancelOrder` function, or admin server action
exists anywhere in the codebase. A full-text search for `completeOrder` and
`cancelOrder` returns zero results.

**FACT (Phase 17 inspection, `lib/admin/queries.ts:376`):** The admin
dashboard counts `ordersActive` as all orders with `status = 'ACTIVE'`. No
count for `ordersCompleted` or `ordersCancelled` is surfaced, though those
statuses are valid per the schema constraint.

**FACT (commercial schema, `db/schema/commercial.ts:159–166`):** The `orders`
table has a `CHECK` constraint enforcing `status IN ('ACTIVE','COMPLETED',
'CANCELLED')`. Both terminal states are schema-valid but unreachable through
the application.

**FACT (`lib/portal/accept-quote.ts:133–143`):** Orders are created with
`status = 'ACTIVE'` when a CLIENT accepts a SENT Quote. No other code
transitions Order status.

**FACT (`lib/admin/deliveries.ts`, `lib/admin/approvals.ts`,
`lib/admin/revisions.ts`, `lib/admin/production-jobs.ts`):** All admin
services gate on `status = 'ACTIVE'`. A COMPLETED or CANCELLED Order is
implicitly blocked from further production, approval, revision, and
delivery operations because those services check for ACTIVE status before
proceeding. The gate is already present; only the ACTIVE→COMPLETED and
ACTIVE→CANCELLED transitions are missing.

### 1.2 Approved Guard Structure (DR 0012)

**FACT (DR 0012 §3, §8):** The `ACTIVE → COMPLETED` guard is a conjunction.
Both conditions must hold simultaneously:

```
(a) DELIVERY CONDITION
    For every Delivery record required for this Order:
      Delivery.status = COMPLETED
    AND no Delivery required for this Order is in
      PREPARING, SENDING, FAILED, or CANCELLED

AND

(b) APPROVAL CONDITION
    For every Approval record required for this Order:
      Approval.status = APPROVED
    AND no Approval required for this Order is in
      PENDING, REJECTED, CANCELLED, or EXPIRED
```

**FACT (DR 0012 §5, §7):** "Required for this Order" membership — specifically
which Deliveries and Approvals count as required — was left explicitly
unresolved in DR 0012, pending the Approval target model (DR 0010) and
Delivery cardinality model (DR 0011).

**FACT (DR 0034 §2.3, §9 item 1):** Partial delivery semantics are DEFERRED.
The Delivery cardinality model is not finalized. DR 0034 confirmed that each
Delivery creation requires at least one APPROVED Approval, and that multiple
Deliveries per Order are DEFERRED.

**FACT (DR 0028 Phase 08, DR 0029 Phase 08):** Approval target types include
`ASSET`. ASSET-type Approvals are the only type implemented and the only
type the CLIENT may decide on.

### 1.3 Filling in the "Required" Membership Test

**FACT:** At HEAD, an Order's Approvals are the set of all non-archived
Approval records with `order_id = orderId AND organization_id = orgId`.
An Order's Deliveries are the set of all non-archived Delivery records with
`order_id = orderId AND organization_id = orgId`.

**PROPOSED (to Owner for resolution):** For Phase 18, "required for this
Order" is operationalized as:

- **Delivery condition:** every non-archived Delivery record for the Order
  has `status = 'COMPLETED'`, AND at least one non-archived Delivery record
  exists. (Zero Deliveries: ACTIVE → COMPLETED is blocked, consistent with
  DR 0034 §2.3 zero-Approval semantics applied symmetrically to Deliveries.)
- **Approval condition:** every non-archived Approval record for the Order
  has `status = 'APPROVED'`, AND at least one non-archived Approval record
  exists. (Zero Approvals: ACTIVE → COMPLETED is blocked, consistent with
  DR 0034 §2.3 zero-Approval prohibition.)

This operationalization is the minimum that satisfies DR 0012's guard shape
without inventing cardinality or partial-delivery rules that remain DEFERRED.
It is consistent with DR 0034 §2.3 and degrades correctly to a single
Delivery and a single Approval in the common V1 case.

**REQUIRES OWNER DECISION:** Owner must confirm the above operationalization,
or provide an alternative, before Phase 18 BUILD may proceed for this DR.

---

## 2. Decision

**What is being decided:**

1. Who may trigger `ACTIVE → COMPLETED`.
2. Who may trigger `ACTIVE → CANCELLED`.
3. The exact guard for `ACTIVE → COMPLETED`.
4. The guard for `ACTIVE → CANCELLED`.
5. CAS protection for both transitions.
6. Idempotency semantics.
7. Audit events for both transitions.
8. Financial consequences (or confirmed absence thereof).
9. Relationship to Delivery completion.
10. Behavior of in-flight related entities on cancellation.
11. Tenant isolation.
12. Terminal-state behavior.

---

## 3. Proposed Decisions

### 3.1 ACTIVE → COMPLETED: Actor Authority

**PROPOSED:** `ACTIVE → COMPLETED` may only be triggered by users with role
`OWNER` or `ADMIN_OPERATIONS`.

**Rationale (consistent with DR 0035 Phase 08 — Delivery terminal transition
authority):** Order close-out is an administrative commercial-completion
decision. CLIENT role must not be authorized to complete an Order.
CREATIVE_PRODUCTION and QC roles are not appropriate actors for commercial
lifecycle decisions. AGENT role is not authorized for Order mutations.

**PROPOSED:** The service function `completeOrder` accepts `organizationId`
and `actorId` sourced from the server-side admin JWT only. It asserts
`hasAnyRole(['OWNER', 'ADMIN_OPERATIONS'])` before any database operation,
consistent with `lib/auth/authorization.ts` patterns.

### 3.2 ACTIVE → COMPLETED: Guard

**PROPOSED (implementing DR 0012 §8 with the operationalization in §1.3):**
The guard evaluated atomically within a single database transaction:

1. Fetch all non-archived Delivery records for `(orderId, organizationId)`.
2. If zero Delivery records: block — return `{ok: false, reason: 'NO_DELIVERY'}`.
3. If any Delivery record has `status ≠ 'COMPLETED'`: block — return
   `{ok: false, reason: 'DELIVERY_NOT_COMPLETE', blockers: [...]}`.
4. Fetch all non-archived Approval records for `(orderId, organizationId)`.
5. If zero Approval records: block — return `{ok: false, reason: 'NO_APPROVAL'}`.
6. If any Approval record has `status ≠ 'APPROVED'`: block — return
   `{ok: false, reason: 'APPROVAL_NOT_APPROVED', blockers: [...]}`.
7. If all conditions pass: proceed to CAS UPDATE.

**PROPOSED:** The guard query uses `AND organization_id = :orgId` on every
fetch — no cross-tenant data is visible.

**Rationale (DR 0012 §10, §12):** Delivery `COMPLETED` alone or Approval
`APPROVED` alone is not sufficient. Neither Payment `PAID` alone, Production
Job `COMPLETED` alone, nor any other single entity is sufficient per DR 0012.

### 3.3 ACTIVE → COMPLETED: CAS Protection

**PROPOSED:** The UPDATE is executed as:
```sql
UPDATE commercial.orders
SET status = 'COMPLETED', updated_at = now()
WHERE id = :orderId
  AND organization_id = :organizationId
  AND status = 'ACTIVE'
RETURNING id
```

If `updated.length === 0`, the service throws `CONCURRENT_MODIFICATION`,
consistent with the CAS pattern used throughout the codebase.

**Rationale:** Without a CAS guard, a concurrent `completeOrder` call or a
future `cancelOrder` call could race and produce an invalid terminal transition.

### 3.4 ACTIVE → COMPLETED: Idempotency

**PROPOSED:** `completeOrder` uses the idempotency table with key
`ORDER_COMPLETED:{orderId}` scoped to `organizationId`, following the
PROCESSING→COMPLETED lifecycle established in DR 0002.

If the key is already COMPLETED, the service returns `{ok: true}` without
re-executing the guard or the UPDATE. If the key is PROCESSING, the service
returns `{ok: false, reason: 'IN_PROGRESS'}`.

### 3.5 ACTIVE → COMPLETED: Audit Event

**PROPOSED:**

```
entity_type: 'order'
entity_id:   <orderId>
organization_id: <orgId>
actor_id:    <actorId>
actor_role:  <role>
action:      'ORDER_COMPLETED'
payload:
  order_id:           <orderId>
  previous_status:    'ACTIVE'
  new_status:         'COMPLETED'
  delivery_ids:       [<id>, ...]   (all non-archived Delivery ids that were COMPLETED)
  approval_ids:       [<id>, ...]   (all non-archived Approval ids that were APPROVED)
```

### 3.6 ACTIVE → CANCELLED: Actor Authority

**PROPOSED:** `ACTIVE → CANCELLED` may only be triggered by users with role
`OWNER` or `ADMIN_OPERATIONS`.

**REQUIRES OWNER DECISION:** Owner must confirm whether CLIENT role should
ever be authorized to request Order cancellation. If so, a separate DR is
required to address the CLIENT-facing cancellation path and any resulting
financial obligations. This record proposes admin-only cancellation for
Phase 18.

### 3.7 ACTIVE → CANCELLED: Guard

**PROPOSED:** No fulfillment-state guard is required for cancellation.
An ACTIVE Order may be cancelled by an authorized actor regardless of the
state of its Deliveries, Approvals, or Production Jobs. This is consistent
with DR 0007 ("business decision / authorized actor") and DR 0012 §11
(cancellation is a separate decision from Delivery/Approval failure).

**PROPOSED exception — financial guard:** If a Payment record for the Order
has `status = 'PAID'`, the service must:
- **Not** block cancellation (Payment `PAID` alone does not prevent
  cancellation per DR 0007 §"Cancellation / Refund Boundary").
- Log a `ORDER_CANCELLED_WITH_PAYMENT` audit event with the payment_id.
- **Not** automatically initiate a refund or financial reversal. Any
  financial consequence is a separate process per DR 0007 §"Cancellation /
  Refund Boundary" and the approved financial architecture.

**REQUIRES OWNER DECISION:** Owner must confirm whether cancellation should
be blocked (rather than just logged) when an active payment exists, or
whether the proposed log-only approach is correct for Phase 18.

### 3.8 ACTIVE → CANCELLED: CAS Protection

**PROPOSED:** The UPDATE is executed as:
```sql
UPDATE commercial.orders
SET status = 'CANCELLED', updated_at = now()
WHERE id = :orderId
  AND organization_id = :organizationId
  AND status = 'ACTIVE'
RETURNING id
```

If `updated.length === 0`, the service throws `CONCURRENT_MODIFICATION`.

### 3.9 ACTIVE → CANCELLED: Idempotency

**PROPOSED:** `cancelOrder` uses the idempotency table with key
`ORDER_CANCELLED:{orderId}` scoped to `organizationId`.

### 3.10 ACTIVE → CANCELLED: Audit Event

**PROPOSED:**

```
entity_type:    'order'
entity_id:      <orderId>
organization_id: <orgId>
actor_id:       <actorId>
actor_role:     <role>
action:         'ORDER_CANCELLED'
payload:
  order_id:        <orderId>
  previous_status: 'ACTIVE'
  new_status:      'CANCELLED'
  reason:          <actor-supplied string, optional>
  had_paid_payment: <boolean>
  payment_id:      <payment_id or null>
```

### 3.11 In-flight Related Entities on Cancellation

**PROPOSED (consistent with DR 0007 §"Cancellation / Refund Boundary"
and DR 0012 §11):**

- In-flight Production Jobs (`QUEUED`, `RUNNING`) are **not** automatically
  cancelled by `cancelOrder`. No cascade to Production Job status.
- In-flight Deliveries (`PREPARING`, `SENDING`) are **not** automatically
  cancelled by `cancelOrder`. No cascade to Delivery status.
- Pending Approvals are **not** automatically cancelled by `cancelOrder`.
  No cascade to Approval status.
- Asset records are **not** archived by `cancelOrder`.
- Financial records (ledger entries, payments) are **not** modified.
  Financial history is additive and immutable per DR 0001/0002.

**Rationale:** Cascading cancellation to in-flight entities would require
designing new authorization, compensation, and audit rules for each affected
entity type, exceeding this record's Phase 18 scope. Operators are expected
to manage in-flight work manually or via future DRs. The ORDER_CANCELLED
audit event provides a clear signal that the commercial engagement has ended.

**REQUIRES OWNER DECISION:** Owner must confirm that no automatic cascade
to Production Jobs or Deliveries is required for Phase 18. If automatic
cascade is required, each entity type needs a separate DR section.

### 3.12 Terminal-State Behavior

**APPROVED (from DR 0007):** `COMPLETED` and `CANCELLED` are terminal.
An Order that has reached either state must not be re-opened or transitioned
further. The `completeOrder` and `cancelOrder` services must verify
`status = 'ACTIVE'` in their CAS UPDATE and return a meaningful error if the
current status is already terminal. Consistent with DR 0007: `COMPLETED →
anything` and `CANCELLED → anything` are not allowed.

### 3.13 Relationship to Delivery Completion

**FACT (DR 0037 Phase 08):** Delivery `COMPLETED` does not automatically
trigger Order `COMPLETED`. Order close-out is an explicit admin action.

**PROPOSED:** The `completeOrder` guard (§3.2) checks that all Deliveries
are in `COMPLETED` status, but the trigger for calling `completeOrder`
is an explicit admin action (via an admin server action), not an automatic
callback from `completeDelivery`.

**PROPOSED:** The admin UI for Order close-out is adjacent to or on the
same page as the Delivery detail. The exact UI placement is not prescribed
by this record and is DEFERRED to the Phase 18 BUILD step.

### 3.14 Relationship to Financial Settlement

**APPROVED (from DR 0001/0002, DR 0007 §"Cancellation / Refund Boundary",
DR 0012 §12):** Order `COMPLETED` is not a financial event. It does not
write to the financial ledger, does not trigger owner profit settlement,
does not create a Revenue record, and does not constitute any automatic
financial settlement.

Order `CANCELLED` is similarly not a financial event. Cancellation does not
automatically reverse any financial ledger entry, initiate a refund, or
trigger any financial cascade. If a refund is warranted, it must be
initiated through the existing payment refund pathway (DR 0047/0048),
not through this record's cancel pathway.

**PROPOSED:** Both `completeOrder` and `cancelOrder` are financially inert:
they write only to `commercial.orders` and `system.audit_events` within
their transaction. They do not write to `financial.*` tables.

### 3.15 Tenant Isolation

**PROPOSED:** Both service functions enforce tenant isolation by:
1. Accepting `organizationId` exclusively from the server-side admin JWT
   (via `getAdminSession()`), never from client-controlled parameters.
2. Every database query includes `AND organization_id = :organizationId`.
3. Guard queries (Delivery, Approval, Payment) are each scoped to
   `(orderId, organizationId)` — no cross-tenant data is accessible.

### 3.16 Admin Action Surface

**PROPOSED:** Two new `'use server'` admin actions are created:
- `actionCompleteOrder(orderId: string)` — calls `completeOrder`; role check
  `OWNER | ADMIN_OPERATIONS`; calls `revalidatePath('/admin/orders')` on success.
- `actionCancelOrder(orderId: string, reason?: string)` — calls
  `cancelOrder`; role check `OWNER | ADMIN_OPERATIONS`; calls
  `revalidatePath('/admin/orders')` on success.

Both actions derive `organizationId` and `actorId` from `getAdminSession()`
and pass them to the service layer. `orderId` comes from the server action
argument, which is caller-supplied but validated against the org scope in
the service layer before any mutation.

---

## 4. Non-Goals

- Automatic Order completion triggered by a Delivery COMPLETED event —
  DEFERRED. Order close-out remains an explicit admin action for Phase 18.
- CLIENT-facing Order cancellation — DEFERRED pending Owner decision on
  financial obligations.
- Campaign `CLOSED` dependency on Order `COMPLETED` — DEFERRED per DR 0007
  and DR 0012 §13. This record does not create any automatic Campaign→Order
  dependency.
- Cascade cancellation of Production Jobs, Deliveries, or Approvals —
  DEFERRED per §3.11.
- Refund initiation as part of cancellation — DEFERRED.
- Partial delivery semantics — DEFERRED per DR 0034 §2.6.
- Multiple Deliveries per Order — DEFERRED per DR 0034 §9 item 2.

---

## 5. Deferred Items

1. Automatic trigger of `completeOrder` from `completeDelivery` — DEFERRED.
2. CLIENT-initiated Order cancellation — DEFERRED.
3. Cascade cancellation of in-flight Production Jobs on `cancelOrder` — DEFERRED.
4. Campaign `CLOSED` linkage to Order `COMPLETED` — DEFERRED.
5. Refund initiation from `cancelOrder` — DEFERRED.
6. Partial delivery guard (some Deliveries COMPLETED, others not) — DEFERRED.
7. Admin UI exact placement for Order close-out controls — DEFERRED to BUILD.
8. Idempotency key expiry value — DEFERRED to BUILD (consistent with
   existing codebase defaults).

---

## 6. Explicitly Prohibited Assumptions

- Do not assume `completeOrder` automatically fires when `completeDelivery`
  is called. These are separate explicit operations.
- Do not assume Order `COMPLETED` triggers any financial ledger entry,
  refund, or owner settlement.
- Do not assume Order `CANCELLED` initiates a refund or reversal.
- Do not assume in-flight Production Jobs or Deliveries are automatically
  cancelled when an Order is cancelled.
- Do not assume the guard evaluates which Deliveries or Approvals are
  "required" by any cardinality rule not established in this record.
- Do not assume CLIENT role is authorized to complete or cancel an Order.
- Do not assume Campaign `CLOSED` is automatically triggered by
  Order `COMPLETED`.
- Do not assume this record authorizes implementation, schema changes,
  migrations, dependency installation, or any code changes.
- Do not assume Decision Records 0001–0103 are altered by this record.
