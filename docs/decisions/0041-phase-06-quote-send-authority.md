# Decision Record 0041 — Phase 06: Quote DRAFT → SENT Role Authority

- **Decision Round:** Phase 06
- **Phase:** 06 — Admin Command Center
- **Status:** APPROVED — Owner approved 2026-09-04. The role authority
  conclusions in §7 and the consolidated matrix in §8 are the governing
  authority for which RBAC roles hold authority to execute the `DRAFT → SENT`
  transition on a Quote record. No schema, migration, or implementation is
  authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Repository state at draft:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0040. All remain authoritative and unchanged. This record resolves
  the deferred item explicitly named in DR 0005 § Deferred / Unresolved
  Items: "Exact actor/role permissions for Quote transitions" — for the
  `DRAFT → SENT` transition only.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**, consistent
with the evidentiary standard applied throughout DR 0031–0035. No statement
is promoted above INFERENCE unless a direct, constraint-grade statement in
an authoritative record supports it.

Service and Package remain **UNVERIFIED** as entities, unchanged from
DR 0013–0040.

## 1. Context

Decision Record 0005 established the Quote state machine: six states
(`DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`), six
transitions, and the commercial guard for `DRAFT → SENT` (Cost Check PASS
AND Margin Check PASS). DR 0005 explicitly deferred role authority for all
Quote transitions as an unresolved item: "Exact actor/role permissions for
Quote transitions." (DR 0005 § Deferred / Unresolved Items.)

No Decision Record 0001–0040 has resolved this deferral for any Quote
transition. This record addresses exactly one: `DRAFT → SENT`.

Phase 06 (Admin Command Center) requires the ability for authorized
administrative actors to present a Quote to a client — transitioning a
composed internal Quote into a client-facing commercial offer. Without
a resolved role authority for `DRAFT → SENT`, Phase 06 BUILD cannot safely
implement this action.

## 2. Problem

DR 0005 defines `DRAFT → SENT` as an approved transition with a guard
(Cost Check PASS AND Margin Check PASS), but does not specify which roles
may execute it. Implementing this transition without an authoritative role
authority decision would promote an INFERENCE to an APPROVED architectural
boundary — a violation of the governing evidentiary standard and of
CLAUDE.md's prohibition on guessing.

**The specific question this record answers:**

Which RBAC roles may execute the `DRAFT → SENT` transition on a Quote
record, subject to the Cost Check and Margin Check guards established
in DR 0005?

## 3. Governing Sources

**APPROVED sources used in this record:**

- **DR 0005** — authoritative source for the Quote state machine, the
  `DRAFT → SENT` transition, and the Cost Check + Margin Check commercial
  guards. The deferred item ("Exact actor/role permissions for Quote
  transitions") is sourced directly from DR 0005 § Deferred / Unresolved
  Items. DR 0005 is not modified by this record.

- **Gate 0 RBAC foundation** (recorded as authoritative input in DR 0024
  §3): defines the six roles, their hierarchy, and their operational
  scopes. The Gate 0 text is reproduced in DR 0024 §3 and constitutes the
  constraint-grade input for all role characterizations in this record.
  No role beyond those six is invented here.

  Key Gate 0 facts (**FACT**, from DR 0024 §3):
  - **OWNER:** "highest authority; governs critical financial, system, and
    security decisions."
  - **ADMIN/OPERATIONS:** "operational authority — client/brand/campaign/
    order/production/delivery/notifications/reports; no automatic money
    withdrawal or payment bypass."
  - **CREATIVE/PRODUCTION:** "produces deliverable work."
  - **QC:** "quality control verdicts."
  - **CLIENT:** "external client participant."
  - **AGENT:** "least privilege — explicitly cannot: withdraw money
    unrestrictedly, refund without limit, change pricing, override payment
    or security controls, change permissions, bypass QC, disable audit, or
    spend beyond approved limits."

- **DR 0001 §6** — financial architecture: Payment ≠ Revenue ≠ Profit ≠
  Owner Settlement. Quote sending is not a financial event. "Conceptual
  flow: Financial Ledger → Profit Calculation → Reserves → Distributable
  Profit → Owner Settlement."

- **DR 0002 §6 (Audit Event)** — Audit Event uses a polymorphic reference
  model (`entity_type`, `entity_id`, `organization_id`) and is append-only.
  DR 0002 §7 (Immutability): corrections to financial/audit history are
  represented through controlled new events, never by rewriting historical
  facts.

- **DR 0002 D4 (Idempotency)** — centralized `system.idempotency_keys`
  mechanism for duplicate-operation protection.

- **DR 0002 D1 (Tenant isolation)** — composite foreign keys containing
  `(parent_id, organization_id)`, together with backend organization-scoping.

- **ARCHITECTURE.md** — server-side authorization is mandatory; frontend
  visibility is never authorization; `organizationId` must always come from
  the server-side session, never from client-controlled input.

## 4. Scope of This Record

**This record:**

1. Resolves role authority for the Quote `DRAFT → SENT` transition only.
2. Reaffirms the Cost Check AND Margin Check guards established in DR 0005.
3. States audit, idempotency, tenancy, and financial-boundary requirements
   for any implementation of this transition.
4. Identifies which other Quote transition authorities remain DEFERRED.

**This record does NOT:**

- Resolve role authority for any other Quote transition (`DRAFT → CANCELLED`,
  `SENT → ACCEPTED`, `SENT → REJECTED`, `SENT → EXPIRED`, `SENT → CANCELLED`).
- Define the implementation mechanism for Cost Check or Margin Check.
- Define the expiry mechanism (`SENT → EXPIRED`).
- Define Quote cancellation authority — this remains DEFERRED for all roles.
- Establish Quote acceptance or rejection authority — DEFERRED.
- Establish Order creation logic or triggers.
- Establish client Approval target logic for Quote.
- Establish any financial transaction, payment, revenue recognition, or
  owner settlement.
- Modify DR 0005's state machine or guards.
- Authorize implementation, dependency installation, schema changes,
  migrations, commits, or pushes.

## 5. Why `DRAFT → SENT` Is a Commercial Authority Action

**FACT (DR 0005 § State Definitions):** "`SENT` — Quote has been presented
to the client and awaits the client's decision."

**FACT (DR 0005 § Commercial Guards):** "`DRAFT → SENT` requires successful
Cost Check and Margin Check."

`DRAFT → SENT` is the act of formally presenting a commercial offer — a
priced scope document — to an external client. It is:

1. A consequential commercial act: it initiates the client decision cycle.
2. Guarded by financial checks (Cost Check, Margin Check): it requires
   validated pricing before external presentation.
3. Irreversible in the normal forward path: `SENT` is not reversible to
   `DRAFT` (DR 0005 Boundary 5 — cancel-and-new pattern).

**INFERENCE (not promoted to APPROVED):** the combination of external
presentation and financial guard makes `DRAFT → SENT` an operational
commercial management action, not a creative production or quality control
action. This inference is consistent with Gate 0's role characterizations
but is not itself a constraint-grade statement; the per-role analysis in §6
derives from Gate 0 text directly.

## 6. Role Authority Analysis — Per Role

### 6.1 OWNER — APPROVED

**Basis:** Gate 0 (DR 0024 §3): "OWNER: highest authority; governs
critical financial, system, and security decisions." The "highest authority"
characterization establishes unrestricted authority over operational actions
absent explicit prohibitions. No Decision Record 0001–0040 prohibits OWNER
from executing `DRAFT → SENT`. Presenting a commercial offer to a client is
a fundamental business decision within OWNER's unrestricted authority.

**Classification: APPROVED.** Subject to the Cost Check AND Margin Check
guards (DR 0005) and tenant scope (§9).

### 6.2 ADMIN/OPERATIONS — APPROVED

**Basis:** Gate 0 (DR 0024 §3): "ADMIN/OPERATIONS: operational authority
— client/brand/**campaign**/**order**/production/delivery/notifications/
reports; no automatic money withdrawal or payment bypass."

Quote is the commercial bridge between Campaign and Order (DR 0002;
DR 0005). "Campaign" and "order" appear explicitly in ADMIN/OPERATIONS'
enumerated operational scope per Gate 0. Sending a Quote to a client is a
core commercial management action within that scope: it advances a campaign's
commercial workflow toward order creation by presenting the priced offer for
client decision.

The Cost Check and Margin Check guards mean the action is financially
validated before execution — the operator does not override financial
controls, they execute a transition that has already passed them.
ADMIN/OPERATIONS' restriction ("no automatic money withdrawal or payment
bypass") is not implicated: `DRAFT → SENT` is not a payment action, a money
withdrawal, or a financial bypass (§11 Financial Boundary).

**Classification: APPROVED.** Subject to the Cost Check AND Margin Check
guards (DR 0005), creator/action constraints (none established for this
transition — no separation principle applies here), and tenant scope (§9).

### 6.3 CREATIVE/PRODUCTION — NOT AUTHORIZED

**Basis:** Gate 0 (DR 0024 §3): "CREATIVE/PRODUCTION: produces deliverable
work." The scope characterization describes production of creative content
— not commercial document management, pricing validation, or external client
communication. DR 0005's Cost Check and Margin Check guards confirm that
`DRAFT → SENT` requires validated commercial pricing — an action logically
prior to and independent of creative production activity.

No Decision Record 0001–0040 establishes that CREATIVE/PRODUCTION actors
hold authority over commercial Quote management. Asserting otherwise would
require inventing a business rule not established by any prior record.

**Classification: NOT AUTHORIZED.** This is a closed boundary for Phase 06:
CREATIVE/PRODUCTION may not execute `DRAFT → SENT`. It is not a deferral —
it is a negative determination grounded in Gate 0's scope characterization
and the absence of any authoritative record establishing Quote management
within CREATIVE/PRODUCTION's scope.

### 6.4 QC — NOT AUTHORIZED

**Basis:** Gate 0 (DR 0024 §3): "QC: quality control verdicts." QC's
defined scope is quality assessment of creative work — not commercial
document management. `DRAFT → SENT` involves a Cost Check and Margin Check,
which are commercial financial guards, not quality control verdicts. The QC
role has no established connection to the Quote lifecycle in any Decision
Record 0001–0040.

DR 0029 §8.1 (Quote-targeting Approvals) established that QC's creation
authority for Quote-targeting Approvals is DEFERRED because "Quote does not
pass through QC Review" and "no QC-Quote connection is established in
DR 0001–0028." The same absence of a QC-Quote connection applies to
`DRAFT → SENT` authority: there is no established basis for QC authority
over Quote state transitions.

**Classification: NOT AUTHORIZED.** Closed boundary grounded in Gate 0
scope and the established absence of any QC-Quote connection in
DR 0001–0040.

### 6.5 CLIENT — NOT AUTHORIZED

**Basis:** Gate 0 (DR 0024 §3): "CLIENT: external client participant."
DR 0005 § State Definitions: "SENT — Quote has been presented **to the
client** and awaits the client's decision." The `DRAFT → SENT` transition
is the act of presenting the Quote *to* the CLIENT — the CLIENT is the
recipient of this action, not its initiator. A client actor executing
`DRAFT → SENT` on a Quote directed at themselves would collapse the
distinction between the presenter and the recipient.

No Decision Record 0001–0040 establishes CLIENT authority over internal
Quote workflow states. CLIENT's established decision authority concerns
Approval records targeting client-facing entities (DR 0029) — not internal
Quote lifecycle management.

**Classification: NOT AUTHORIZED.** Closed boundary: CLIENT is the
recipient of the `DRAFT → SENT` action, not an authorized actor for it.

### 6.6 AGENT — NOT AUTHORIZED

**Basis:** Gate 0 (DR 0024 §3): "AGENT: least privilege — explicitly
cannot: withdraw money unrestrictedly, refund without limit, **change
pricing**, override payment or security controls, change permissions, bypass
QC, disable audit, or spend beyond approved limits."

`DRAFT → SENT` executes the transition of a priced commercial offer to
client-facing status. The action advances a Quote — a pricing document —
through a commercial guard (Cost Check, Margin Check) to external
presentation. Executing this action on a pricing document is structurally
adjacent to "change pricing" in Gate 0's prohibitions, and is certainly
within the category of consequential commercial actions that Gate 0's
least-privilege characterization precludes for AGENT.

Furthermore, `DRAFT → SENT` initiates the client decision cycle that leads
toward Quote acceptance and Order creation — a consequential path within
AGENT's least-privilege boundary.

**Classification: NOT AUTHORIZED.** Closed boundary grounded in Gate 0's
least-privilege characterization. This is consistent with AGENT's exclusion
from consequential operational actions established across DR 0024, DR 0029,
and DR 0035.

## 7. Proposed Decision

**PROPOSAL (for Owner approval):**

The following role authority is proposed for the `DRAFT → SENT` transition:

- **OWNER** — AUTHORIZED. Unrestricted, subject to Cost Check AND Margin
  Check guards (DR 0005) and organization tenant scope.
- **ADMIN/OPERATIONS** — AUTHORIZED. Operational authority over commercial
  campaign/order workflow explicitly established by Gate 0. Subject to
  Cost Check AND Margin Check guards (DR 0005) and organization tenant
  scope.
- **CREATIVE/PRODUCTION** — NOT AUTHORIZED. Scope is creative production,
  not commercial document management.
- **QC** — NOT AUTHORIZED. Scope is quality control verdicts; no QC-Quote
  connection established in DR 0001–0040.
- **CLIENT** — NOT AUTHORIZED. CLIENT is the recipient of the SENT Quote,
  not the authorized actor for its presentation.
- **AGENT** — NOT AUTHORIZED. Gate 0 least-privilege boundary precludes
  consequential commercial actions.

## 8. Role Authority Matrix — Quote DRAFT → SENT

| Transition | OWNER | ADMIN/OPS | CREATIVE/PROD | QC | CLIENT | AGENT |
|---|---|---|---|---|---|---|
| DRAFT → SENT | AUTHORIZED | AUTHORIZED | NOT AUTHORIZED | NOT AUTHORIZED | NOT AUTHORIZED | NOT AUTHORIZED |

**Guards (from DR 0005, unchanged):** the transition requires:

1. `quote.status = 'DRAFT'` — precondition on current state.
2. Cost Check PASS — the quote's cost structure has been validated.
3. Margin Check PASS — the quote's margin meets the required threshold.

An actor holding AUTHORIZED status may execute `DRAFT → SENT` only when all
three conditions are satisfied. A Cost Check or Margin Check failure blocks
the transition regardless of the actor's role.

The implementation mechanism for Cost Check and Margin Check (computed
on-request, persisted result, or other) remains **DEFERRED** (DR 0005
§ Deferred / Unresolved Items — unchanged by this record).

## 9. Tenant Isolation

**APPROVED principle (from DR 0002 D1, ARCHITECTURE.md):**

Any actor executing `DRAFT → SENT` must satisfy all of the following:

1. **Same organization:** the actor's `organization_id` (sourced from the
   server-side session, never from client-controlled input) must match the
   Quote's `organization_id`. Cross-tenant Quote transitions are never
   permitted.
2. **Server-side authorization required:** ARCHITECTURE.md: "server-side
   authorization is mandatory; frontend visibility is never authorization."
   The role check and state precondition check must be performed server-side
   on every invocation, not delegated to client-side visibility.
3. **URL params are untrusted:** the Quote's ID arriving in a URL path
   parameter is not proof of ownership. The server-side query must include
   `AND organization_id = session.organization_id` to prevent cross-tenant
   data access.

The enforcement mechanism (session JWT claim, middleware, RLS policy) is
**DEFERRED** and is not implemented by this record.

## 10. Security Requirements

1. **Authorization check order:** the implementation must check role
   authorization *before* executing the Cost Check and Margin Check. An
   unauthorized actor must never learn whether a Cost Check or Margin Check
   would pass or fail.
2. **State precondition check:** the implementation must verify
   `quote.status = 'DRAFT'` in the same database transaction as the
   state update, using a read-then-write pattern that guards against
   concurrent state changes (e.g., a `WHERE status = 'DRAFT'` clause in
   the UPDATE statement or an equivalent atomic check).
3. **No client input for organizationId:** `organizationId` must be sourced
   exclusively from the server-side session.
4. **password_hash:** the implementation must never select or return
   `identity.users.password_hash` in any query associated with this action.

## 11. Financial Boundary

**Unchanged from DR 0001 §6 and all prior records:**

`DRAFT → SENT` is a commercial communication act — presenting a priced offer
to a client. It is NOT:

- A payment event.
- A revenue recognition event.
- A profit recognition event.
- An Owner Settlement event.
- A Financial Ledger entry.
- A Provider Credit consumption.
- A Reserve allocation or release.

The financial separations established in DR 0001 §6 are fully preserved:

- Payment ≠ Revenue
- Order Budget ≠ Profit
- Provider Credit ≠ Cash/Profit
- Profit ≠ Owner Settlement

Sending a Quote does not trigger any financial record creation, financial
ledger mutation, reserve movement, or settlement action. Any such events
belong to later, separately authorized workflows (Quote acceptance, Order
creation, payment processing). These remain outside the scope of this record.

## 12. Audit Requirements

**APPROVED (from DR 0002 §6 and §7):**

Any implementation of `DRAFT → SENT` must produce an Audit Event record.

**Audit Event requirements:**

1. The Audit Event must be written in the **same database transaction** as
   the Quote status update. If the transaction rolls back, no Audit Event
   must be written. An Audit Event written without a corresponding committed
   state change would be a false historical record.
2. The Audit Event must use the polymorphic reference model established in
   DR 0002 §6: `entity_type` (e.g., `'quote'`), `entity_id` (the Quote's
   UUID), `organization_id` (from the server-side session).
3. The Audit Event must record the actor: `actor_id` (the executing user's
   UUID) and `actor_role` (the executing user's role from the session).
4. The Audit Event must be append-only. It must never be updated or deleted
   after the transaction commits (DR 0002 §7).
5. The action field should identify the event as a Quote send (e.g.,
   `'quote.sent'`).
6. The payload should include at minimum the Quote's previous status
   (`'DRAFT'`) and new status (`'SENT'`). The exact payload structure is
   not mandated beyond this minimum — implementation may include additional
   relevant context.

The exact database schema for `system.audit_events` (columns, indexes,
constraints) is established by the existing schema and is not modified by
this record.

## 13. Idempotency Requirements

**APPROVED (from DR 0002 D4):**

Any implementation of `DRAFT → SENT` must be idempotent and must prevent
duplicate execution of the same transition.

**Requirements:**

1. Each invocation of the `DRAFT → SENT` action must be associated with
   an idempotency key.
2. The idempotency key must be checked against `system.idempotency_keys`
   before the state mutation is executed. If the key is already present
   and the operation COMPLETED, the implementation must return the
   previously committed result without re-executing the state transition.
3. The idempotency key record and the Quote state update must be written in
   the same database transaction.
4. The idempotency key's `operation_type` must identify this as a Quote
   send operation (e.g., `'quote.draft_to_sent'`).
5. The exact physical columns and generation strategy for idempotency keys
   are established by the existing `system.idempotency_keys` schema and
   DR 0002 D4 — neither is modified by this record.

## 14. Transactional Requirements

**APPROVED (from DR 0002 §6, §7, D4):**

Any implementation of `DRAFT → SENT` must execute the following atomically
in a single database transaction:

1. State precondition check (`quote.status = 'DRAFT'`).
2. Cost Check and Margin Check validation (or confirmation of their PASS
   result, per the implementation mechanism chosen when that mechanism is
   decided).
3. Quote status update (`status = 'SENT'`, `updated_at = now()`).
4. Audit Event insert (per §12).
5. Idempotency key write (per §13).

If any step fails, the entire transaction must roll back. A partial
execution — e.g., status updated but no Audit Event — is not permitted.

## 15. Quote Cancellation Authority — Explicitly Not Resolved

**DR 0005 approves two cancellation transitions:**
- `DRAFT → CANCELLED`
- `SENT → CANCELLED`

**FACT:** No Decision Record 0001–0040 establishes role authority for either
of these transitions. The deferred item "Exact actor/role permissions for
Quote transitions" (DR 0005 § Deferred / Unresolved Items) encompasses
cancellation authority as well as send authority.

**This record does NOT resolve Quote cancellation authority.** Implementing
Quote cancellation requires a separate decision record. Quote cancellation
authority is explicitly carried as a deferred item after this record (§16).

## 16. Deferred Items

The following remain explicitly DEFERRED after this record:

1. **Quote cancellation authority (`DRAFT → CANCELLED`, `SENT → CANCELLED`)
   for all roles** — not resolved by this record. Requires a separate
   decision record.
2. **Quote acceptance authority (`SENT → ACCEPTED`)** — not resolved. This
   is part of the client decision workflow (connected to CLIENT Approval
   authority and Order creation) and requires a separate decision.
3. **Quote rejection authority (`SENT → REJECTED`)** — not resolved.
4. **Quote expiry mechanism and authority (`SENT → EXPIRED`)** — the
   mechanism is deferred in DR 0005 and unchanged by this record.
5. **Cost Check and Margin Check implementation mechanism** — deferred in
   DR 0005 and unchanged by this record.
6. **Cost Check and Margin Check audit records** — deferred in DR 0005
   ("Whether Cost Check and Margin Check require persisted audit records")
   and unchanged by this record.
7. **Quote validity duration** — deferred in DR 0005 and unchanged.
8. **Concurrency handling around expiration/acceptance** — deferred in
   DR 0005 and unchanged.
9. **Tenant/RLS enforcement mechanism** for actor authority on Quote
   transitions — the organizational-scope principle is APPROVED (§9); the
   enforcement mechanism (session JWT, RLS policy, middleware) is DEFERRED.
10. **All deferred items from DR 0001–0040 not addressed here** remain
    independently open and unchanged.

## 17. Interactions

### 17.1 DR 0005 (Quote State Machine)

**Consistent. No change.** All six states and six transitions are preserved
exactly. The Cost Check AND Margin Check guards for `DRAFT → SENT` are
reaffirmed, not modified. No new states or transitions are introduced.
This record fills in the role authority detail that DR 0005 explicitly
deferred; it does not replace, modify, or supersede DR 0005.

### 17.2 DR 0001 §6 (Financial Architecture)

**Consistent. No change.** Financial separations are explicitly preserved
in §11 of this record. Quote sending does not trigger any financial event.

### 17.3 DR 0002 (D1, D4, §6, §7)

**Consistent.** Tenant isolation (D1), idempotency (D4), Audit Event model
(§6), and immutability (§7) are all applied and preserved. No modification
to DR 0002.

### 17.4 DR 0024 (Approval Actor Authority)

**Consistent. No change.** Approval lifecycle and actor authority are
unaffected. Quote `DRAFT → SENT` is not an Approval transition. No Approval
record is created by this record's proposed action.

### 17.5 DR 0029 (Approval Target Role Authority)

**Consistent. No change.** Quote-targeting Approval authority (DR 0029
§8) is unchanged. `DRAFT → SENT` is a Quote state machine transition;
it is not an Approval creation or decision event. The two are independent
actions.

### 17.6 DR 0039 (Phase 05 Authentication)

**Consistent. No change.** Phase 05 authentication governs the CLIENT-only
portal session. Admin Command Center authentication (Phase 06) is a
separately decided concern (Phase 06 PLAN §12 BLOCKER 1). This record does
not depend on the admin auth strategy being resolved; it establishes role
authority only.

## 18. Consistency with Decision Records 0001–0040

- **Consistent with 0001/0002:** no new entity, no new role; D1 tenant
  scope (§9); D4 idempotency (§13); D5 archive/status independence
  preserved; D8 TEXT+CHECK state representation unchanged; Audit Event
  polymorphic model (§12); immutability (§12).
- **Consistent with 0003–0004:** Campaign and Brief state machines
  unmodified. `DRAFT → SENT` is a Quote transition only.
- **Consistent with 0005:** state machine and guards reaffirmed, not
  modified. The deferred item "Exact actor/role permissions for Quote
  transitions" is resolved for `DRAFT → SENT` only; all other deferred
  items from DR 0005 remain open (§16).
- **Consistent with 0006–0011:** Asset, Order, Production Job, AI
  Generation, Approval, and Delivery state machines unmodified.
- **Consistent with 0012–0022:** Order completion guard and Requirements
  Framework unaffected.
- **Consistent with 0023–0029:** Approval target types and role authority
  unmodified. No new Approval target type introduced.
- **Consistent with 0030–0037:** Approval/Delivery temporal, precondition,
  and orchestration boundaries unaffected.
- **Consistent with 0038:** Brand DNA unchanged.
- **Consistent with 0039:** Phase 05 authentication unchanged.
- **Consistent with 0040:** Client asset content boundaries unchanged.
- No Decision Record 0001–0040 is modified, reinterpreted, or superseded.

## 19. Rejected Alternatives

- **Treating Gate 0 ADMIN/OPERATIONS operational scope as sufficient
  authority without a Decision Record** — rejected per the governing rule
  established in the Phase 06 planning session: "if role authority for this
  transition is not explicitly established by an APPROVED Decision Record,
  DR 0041 must explicitly resolve that authority rather than treating
  operational scope as sufficient authority." A Decision Record is the
  correct resolution mechanism.

- **Granting CREATIVE/PRODUCTION authority over `DRAFT → SENT`** —
  rejected. Gate 0 characterizes CREATIVE/PRODUCTION as "produces
  deliverable work." No record in DR 0001–0040 establishes CREATIVE/
  PRODUCTION authority over commercial Quote management. The inference that
  creative actors might initiate commercial offers is not constraint-grade.

- **Granting QC authority over `DRAFT → SENT`** — rejected. Gate 0
  characterizes QC as "quality control verdicts." DR 0029 §8.1 explicitly
  established that Quote has no QC lifecycle involvement. The same absence
  applies to `DRAFT → SENT`.

- **Granting CLIENT authority over `DRAFT → SENT`** — rejected. DR 0005's
  own definition of `SENT` ("presented to the client") establishes CLIENT
  as the recipient. A client cannot formally present a commercial offer to
  themselves within this model.

- **Resolving Quote cancellation authority in this record** — rejected per
  explicit instruction. Cancellation is a separate, independently deferred
  item and requires its own decision record.

- **Resolving Quote acceptance, rejection, or expiry authority in this
  record** — rejected. These transitions involve CLIENT decision authority,
  Order creation logic, and expiry mechanisms that are each independently
  deferred and require separate decision records.

- **Treating `DRAFT → SENT` as a financial event** — rejected. DR 0001 §6
  and every financial-separation boundary established in DR 0001–0040
  confirm Quote sending is a commercial communication act, not a financial
  transaction (§11).

## 20. Explicitly Prohibited Assumptions

- Do not assume CREATIVE/PRODUCTION may execute `DRAFT → SENT` — NOT
  AUTHORIZED (§6.3).
- Do not assume QC may execute `DRAFT → SENT` — NOT AUTHORIZED (§6.4).
- Do not assume CLIENT may execute `DRAFT → SENT` — NOT AUTHORIZED (§6.5).
- Do not assume AGENT may execute `DRAFT → SENT` — NOT AUTHORIZED (§6.6).
- Do not assume `DRAFT → SENT` may be executed without Cost Check PASS
  AND Margin Check PASS — both guards are required (DR 0005, §8).
- Do not assume `DRAFT → SENT` constitutes a payment, revenue recognition,
  profit event, or Owner Settlement — financial boundary explicitly
  preserved (§11).
- Do not assume Quote cancellation authority has been resolved — DEFERRED
  (§15, §16 item 1).
- Do not assume Quote acceptance, rejection, or expiry authority has been
  resolved — DEFERRED (§16 items 2–4).
- Do not assume the Cost Check or Margin Check implementation mechanism has
  been decided — DEFERRED (§16 item 5).
- Do not assume this record resolves any deferred item from DR 0001–0040
  other than "Exact actor/role permissions for Quote transitions" — and even
  that is resolved only for `DRAFT → SENT`.
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, database changes, commits,
  or pushes.
- Do not assume Decision Records 0001–0040 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.

## 21. Owner Approval

**This record is PROPOSED and requires explicit Owner approval before
any implementation may proceed.**

To approve this record, the Owner should state:

> "Approve DR 0041 as written."

Upon Owner approval, the following take effect:

1. The role authority matrix in §8 becomes the governing authority for
   Quote `DRAFT → SENT`.
2. The preconditions in §8 (state check, Cost Check, Margin Check) and
   the requirements in §9–§14 become mandatory requirements for any
   implementation of this transition.
3. Implementation of `DRAFT → SENT` in Phase 06 BUILD may proceed, subject
   to Phase 06 BUILD authorization and all other Phase 06 blockers being
   resolved (including admin authentication design — Phase 06 PLAN §12
   BLOCKER 1).

**No implementation is authorized by approval of this record alone.**
Phase 06 BUILD authorization is a separate, subsequent decision.

This record does not claim Owner approval. The status remains PROPOSED
until the Owner explicitly approves it.
