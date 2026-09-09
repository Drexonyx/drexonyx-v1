# Decision Record 0013 — Phase 02 Round 02B: Order Completion Requirements

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED (scope limited — see §24; most substantive questions
  resolve to DEFERRED / architecture-gap, not to a new approved design)
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0012. All remain authoritative and unchanged. This record answers
  the two open questions Decision Record 0012 identified (what makes a
  Delivery "required," what makes an Approval "required") to the extent
  the approved baseline allows, and states plainly where it does not
  allow an answer.

## Governance Note (read before the rest of this record)

Per the standing source-of-truth hierarchy (`CLAUDE.md`): the DREXONYX V1
Engineering Constitution is treated as an authoritative external document
that exists but whose text has never been provided to this session or
appeared in any prior conversation. **No claim in this record is
attributed to the Constitution as fact.** Every substantive statement
below is labeled one of: **FACT** (verifiable directly from repository
state), **APPROVED** (explicitly decided in Decision Records 0001–0012),
**INFERENCE** (necessarily follows from an APPROVED item), **PROPOSAL**
(a candidate this record does not adopt as approved), **DEFERRED**
(explicitly left open), or **UNVERIFIED** (asserted by the requesting
task text but not found in any Decision Record 0001–0012 or in any
Constitution text actually available to this session).

**Important finding surfaced by this analysis:** the task that requested
this record describes "Service," "Package," and a pipeline
("PACKAGE → BASE PRICE + ADD-ONS + EXTRA PRODUCTION + EXTRA REVISION →
QUOTE → COST CHECK → MARGIN CHECK → CLIENT APPROVAL → PAYMENT") as part
of "the approved commercial architecture." A full-text search of Decision
Records 0001–0012 finds **no mention of "Service" or "Package" as
entities anywhere**, and no approval of "BASE PRICE," "ADD-ONS," "EXTRA
PRODUCTION," or "EXTRA REVISION" as concepts. Cost Check and Margin Check
*are* approved (Decision Record 0005, as unpersisted `DRAFT` → `SENT`
Quote guards) but are never connected to "Package" in any approved
record. This record therefore treats Service and Package as **UNVERIFIED
candidate concepts**, not as approved entities, and analyzes them only
because the requesting task explicitly asked for that analysis — not
because their existence is established. This is reported per `CLAUDE.md`
("if a requirement is unclear, or conflicts with an approved document...
STOP and report the conflict instead of guessing") rather than silently
treated as settled.

## 1. Context

Decision Record 0012 resolved the *logical shape* of the Order
`ACTIVE` → `COMPLETED` guard as a conjunction of a Delivery coverage
condition and an Approval coverage condition, but explicitly left open
the membership test for each: which Delivery records, and which Approval
records, count as "required for the Order." This record's sole purpose
is to determine, from Decision Records 0001–0012 and from the entities
they establish, whether that membership test can now be answered, by
which entity, and how.

## 2. Problem

"Required" cannot be operationalized without an authoritative source
that both (a) has been approved to exist and (b) has been approved to
carry the specific information needed (how many Deliveries an Order
needs, how many Approvals, of what target). This record must identify
that source if one already exists in the approved baseline, or state
plainly that none does, without inventing one to make the model
convenient.

## 3. Inputs from Decision Record 0007 (Order)

**APPROVED:** Order states `ACTIVE`/`COMPLETED`/`CANCELLED`; the
`ACTIVE` → `COMPLETED` guard requires "required Delivery/Approval
conditions"; Order carries no Payment, Production, QC, Approval, or
Delivery state of its own; Order → Order Budget is 1:1 and Order Budget
tracks planned/estimated/actual internal spend only — not deliverable or
approval counts. **DEFERRED (0007):** the exact guard mechanics (item 1
of its deferred list) — this is the item Decision Record 0012 partially
resolved and this record continues resolving.

## 4. Inputs from Decision Record 0010 (Approval)

**APPROVED:** Approval is a separate entity with states
`PENDING`/`APPROVED`/`REJECTED`/`CANCELLED`/`EXPIRED`; a typed
target model with nullable target FK columns and "exactly one target" is
approved *in principle* (Decision Record 0002, D6). **DEFERRED (0010):**
the approvable target type set itself — no concrete `target_type` value
(e.g. an Order-level approval, a Delivery-level approval, a Quote-level
approval) has ever been approved. Decision Record 0010 explicitly states
this record "does not invent the final Order completion guard" and that
the required-approvals question is deferred.

## 5. Inputs from Decision Record 0011 (Delivery)

**APPROVED:** Delivery is a separate entity with states
`PREPARING`/`SENDING`/`COMPLETED`/`FAILED`/`CANCELLED`. **DEFERRED
(0011):** Delivery → Asset cardinality, Delivery → Order cardinality
(whether an Order may have multiple Deliveries), partial-delivery
semantics, and exact delivery-completion criteria beyond "the mechanism
itself succeeded." Decision Record 0011 §17 states it supplies only the
*fact* the guard would consult (whether an associated Delivery reached
`COMPLETED`), not which Deliveries are associated/required.

## 6. Inputs from Decision Record 0012 (Completion Guard)

**APPROVED:** the guard is `Delivery condition AND Approval condition`;
neither alone is sufficient; nine specific single-signal shortcuts are
rejected as insufficient (Payment `PAID`, Production Job `COMPLETED`, AI
Generation `SUCCEEDED`, QC `PASS`, Client Preview, Asset
`CLIENT_PREVIEW`, Campaign `DELIVERY`, Delivery `COMPLETED` alone,
Approval `APPROVED` alone); Order cancellation stays non-automatic
relative to Delivery/Approval terminal-failure states; the guard is
financially inert and does not auto-link to Campaign `CLOSED`.
**DEFERRED (0012):** exactly the two questions this record was asked to
resolve — the membership test for "required" on each side.

## 7. Candidate Authoritative Sources

The task identifies ten candidates (Service, Package, Quote, Order,
Campaign, Brief, Asset set, Delivery records, Approval records, and
combinations). Each is evaluated below against two tests: (1) **Does
Decision Record 0001–0012 approve this entity to exist at all, with the
specific content needed?** (2) **Would using it as the completion-
requirement source violate an existing separation?**

## 8. Service Analysis

**UNVERIFIED as an entity.** No Decision Record 0001–0012 names
"Service." There is nothing to analyze as approved architecture. As a
hypothetical (per the task's request only): if a Service concept existed
as a catalog-level definition of a unit of work, it could *in principle*
define a template count of expected Deliveries/Approvals for that unit of
work — but templating is a different concept from *this specific Order's*
actual requirement, and nothing approved establishes that an Order's
requirements are copied from a template at Order-creation time. **Cannot
be authoritative:** it does not exist in the approved baseline.

## 9. Package Analysis

**UNVERIFIED as an entity**, for the same reason as §8. The task's
"PACKAGE → BASE PRICE + ADD-ONS + EXTRA PRODUCTION + EXTRA REVISION"
pipeline is not found in any Decision Record. As a hypothetical: a
Package, like a Service, could conceivably define a commercial bundle
that implies a deliverable count (e.g., "3 revisions included") — but
"implies" is doing unapproved work here; nothing in 0001–0012 approves
that Package-level commercial terms become Order-level fulfillment
requirements automatically, nor that Package exists at all. **Cannot be
authoritative:** it does not exist in the approved baseline, and even if
it did, the automatic commercial-terms-to-fulfillment-requirements
translation would itself need separate approval (this would collapse
Order Budget/commercial scope into fulfillment scope, a merge no record
approves).

## 10. Quote Analysis

**APPROVED to exist**, with a state machine (0005) and a 1:1 relationship
to Order (0002, 0005). **What it can legitimately define:** the
commercial event sequence (`DRAFT`→`SENT`→`ACCEPTED`, gated by Cost Check
and Margin Check). **What it cannot define:** Decision Record 0005 never
approves Quote *content* — no line items, deliverable list, or approval
requirements are part of the approved Quote state machine; 0005 explicitly
separates Quote `ACCEPTED` from "Client Approval" and Order creation as
"three separate events/records, not one" (0005, Architectural
Consequences). **Authoritative?** Not on the current approved baseline —
Quote's *schema* (what fields it holds) has never been decided by any
Decision Record; only its *lifecycle* has. Asserting Quote content
defines completion requirements would invent schema this record has no
mandate to invent.

## 11. Order Analysis

**APPROVED to exist**, with a state machine (0007) and 1:1 relationship
to Order Budget (0002). **What it can legitimately define:** its own
`ACTIVE`/`COMPLETED`/`CANCELLED` status; nothing else about its own
content has been approved. **What it cannot define (yet):** Order's
schema — what fields it holds beyond `status`, `archived_at`, and
tenant/identity columns implied by D1/D2/D5/D8 — has never been decided.
The task asks whether "the Order itself should be the authoritative
snapshot of completion requirements." **Conceptually, this is the most
architecturally natural place** for such a snapshot to eventually live
(an Order-scoped record of what fulfillment obligations this specific
Order carries, captured at Order-creation time from whatever commercial
source is used), because it would avoid re-deriving requirements from a
Quote/Package/Service that may itself change or be superseded after the
Order exists. **This record does not create any field or table for this**
— per explicit task instruction — and marks the idea itself as
**PROPOSAL / DEFERRED**, not approved schema.

## 12. Campaign Analysis

**APPROVED to exist**, with a 14-state ordered lifecycle (0003) including
`DELIVERY` and `CLOSED`. **What it can legitimately define:** its own
narrative phase. **What it cannot define:** Decision Record 0003 Rule 4
explicitly states "Campaign completion must not be inferred merely from
payment, production completion, or client preview," and Decision Record
0012 §10/§13 already rejects Campaign `DELIVERY` as proof of Order
completion and rejects any automatic Order-`COMPLETED`-to-Campaign-
`CLOSED` link. Using Campaign as the Order-completion-requirement source
would invert this — Campaign is *downstream* of Order in the approved
relationship (`ORDERED` means an Order was created), not upstream of it.
**Cannot be authoritative** for Order-level requirements without
violating 0003's own completion-inference rule and 0012's separation.

## 13. Asset Analysis

**APPROVED to exist**, with a 6-state lifecycle and versioning principle
(0006). **What it can legitimately define:** the state of each individual
Asset. **What it cannot define:** which Assets are *required* for an
Order — no cardinality between Order/Delivery and Asset is approved
(0006 leaves lineage/traceability deferred; 0011 §16 leaves Delivery→Asset
cardinality deferred). "Derived from final deliverable Assets" (one of
the task's candidate Delivery-requirement sources) would require first
knowing which Assets are "final" and "required," which is exactly the
undecided cardinality question, not an answer to it. **Cannot be
authoritative** on its own; it is a downstream fact-source once Delivery
cardinality is decided, not a decision-source itself.

## 14. Delivery Analysis

**APPROVED to exist** (0011). Delivery *records* can report their own
completion fact — this is exactly what Decision Record 0012's Delivery
condition already consumes. But a Delivery record cannot report whether
*other, not-yet-created* Deliveries are also required — that is a
scope/expectation question that must be known independent of any single
Delivery record's existence. **Cannot be authoritative** for defining
what is required; it is the object being measured against the
requirement, not the source of the requirement.

## 15. Approval Analysis

**APPROVED to exist** (0010), target model explicitly unresolved. Same
reasoning as §14: an Approval record reports its own decision outcome; it
cannot define which Approval target types are required for a given
Order, because the target-type set itself is undecided. **Cannot be
authoritative** for defining what is required, for the same
object-vs.-requirement reason as Delivery.

## 16. Recommended Source of Truth

**No combination of currently-approved entities can serve as the
authoritative source for Order completion requirements**, because:

- Quote and Order are approved to exist but their *content/schema* — the
  only place such requirements could actually be recorded — has never
  been decided by any Decision Record (§10, §11).
- Campaign is disqualified by its own completion-inference rule and its
  downstream position relative to Order (§12).
- Asset, Delivery, and Approval records are measured *against* the
  requirement; they cannot supply it (§13–§15).
- Service and Package are not approved entities at all (§8–§9).

**INFERENCE:** the closest legitimate conceptual home, if and when this
gap is closed, is an Order-scoped record of fulfillment requirements —
consistent with Order being the entity Decision Record 0007 already
identifies as the thing whose completion is being gated, and consistent
with keeping the requirement snapshot stable even if the originating
Quote/commercial source later changes. This is recorded as **PROPOSAL /
DEFERRED**, explicitly **not** as an approved entity, schema, or field,
per the task's own instruction not to invent an entity for convenience.

## 17. Required Delivery Determination

**DEFERRED.** No approved entity currently defines how many Deliveries,
or covering which Assets, an Order requires. Per the task's explicit
fallback instructions:

- Partial Delivery = **DEFERRED** (unchanged from 0011 §15; nothing in
  the approved baseline requires V1 to support it).
- Multiple-Delivery semantics = **DEFERRED** (unchanged from 0011 §16;
  nothing approved requires or forbids more than one Delivery per Order).
- No assumption of exactly one Delivery per Order is made.
- **Architecture gap identified (not filled):** if required Deliveries
  must eventually be explicitly recorded rather than always computed
  ad hoc, no currently-approved entity can hold that record. This is
  flagged as a gap per the task's explicit instruction ("mark that
  architecture gap clearly instead of inventing a schema"), not resolved
  by inventing a "Deliverable Requirement" entity.

## 18. Required Approval Determination

**DEFERRED**, for the same structural reason, compounded by Decision
Record 0010's own unresolved target-type set. This record does **not**
invent a target type (no "Completion Approval," "Order Approval," or
"Final Approval" state is created or implied). Until Decision Record 0010
or a successor resolves the approvable target-type set, "which Approvals
are required for an Order" cannot be answered without inventing that
resolution here, which is out of this record's scope.

## 19. Order Completion Guard (Restated)

The guard's logical structure from Decision Record 0012 is **unchanged
and not weakened**:

```
Order.ACTIVE
  -> ALL REQUIRED DELIVERIES COMPLETED
  AND ALL REQUIRED APPROVALS APPROVED
  -> Order.COMPLETED
```

This record adds no new resolution to the *shape* of the guard. It
narrows what "required" cannot yet mean (§10–§15) and confirms that the
membership test remains genuinely unresolved (§17–§18) — this limitation
is preserved explicitly, not implemented around.

## 20. Rejected Alternatives

- Treating Service or Package as approved, authoritative entities —
  rejected; neither is established in Decision Records 0001–0012 (§8–§9).
- Treating Quote `ACCEPTED` as itself defining completion requirements —
  rejected; Quote's approved scope is lifecycle only, not content (§10).
- Treating Campaign `DELIVERY`/`CLOSED` as the requirement source —
  rejected; violates 0003's completion-inference rule and 0012's
  separation (§12).
- Deriving requirements purely from existing Asset/Delivery/Approval
  records — rejected; these are measured against the requirement, not
  the source of it (§13–§15).
- Inventing a new "Completion Requirement" / "Deliverable Requirement" /
  "Approval Requirement" / "Order Deliverable" / "Fulfillment
  Requirement" entity to close the gap — rejected as **approved
  architecture**; recorded only as an unadopted **PROPOSAL / DEFERRED**
  idea in §16, per explicit task instruction not to create such an entity
  without authoritative support.
- Assuming exactly one Delivery or exactly one Approval per Order —
  rejected; not supported by any approved record (§17–§18).
- Inventing an Approval target type to make this record's conclusion
  tidy — rejected (§18).

## 21. Architectural Consequences

- The Order `ACTIVE` → `COMPLETED` guard (0012) remains **correct but not
  yet fully evaluable** — its logical form is sound, but no
  implementation can compute "required Deliveries" or "required
  Approvals" for a real Order today without either (a) a future Decision
  Record closing the target-type/cardinality gaps, or (b) a future
  Decision Record approving a requirements-snapshot mechanism (§16).
- This is a genuine, reportable architecture gap, not a defect in
  Decision Records 0007/0010/0011/0012 — each of those records correctly
  scoped itself and deferred exactly this question.
- Any future schema-design work must not silently default to "one
  Delivery, one Approval per Order" to make the guard implementable;
  doing so would be an undocumented invention this record explicitly
  declines to make.

## 22. Security and Tenant Boundaries

No new security or tenant-isolation decision is made by this record. Any
future requirements-snapshot mechanism (§16) would need to inherit the
existing tenant-scoping architecture (`organization_id` + composite FK,
Decision Record 0002 D1) like every other tenant-owned entity — this is
noted as a constraint on any future design, not as new approved schema.
No RLS, authorization, or access-control implementation is created or
altered by this record.

## 23. Deferred Decisions

1. Whether an Order-scoped fulfillment-requirements record will ever be
   approved as an entity (§16 — PROPOSAL only).
2. The approvable Approval target-type set (0010, unchanged — a
   prerequisite for §18).
3. Delivery → Order and Delivery → Asset cardinality (0011, unchanged —
   a prerequisite for §17).
4. Partial-delivery semantics (0011 §15, unchanged).
5. Multiple-Delivery-per-Order semantics (0011 §16, unchanged).
6. Multiple-Approval-per-Order semantics (0010, unchanged).
7. Whether Service and/or Package will ever be approved as entities, and
   if so, whether they may define fulfillment requirements or only
   commercial terms.
8. Whether Quote content/schema will ever be approved, and if so,
   whether it may serve as a fulfillment-requirements source.
9. Whether Order content/schema will ever be approved to include a
   requirements snapshot (§11, §16).
10. Exact database implementation of the eventual requirements source,
    whatever it turns out to be.
11. Exact tenant/RLS implementation for any such future mechanism.

## 24. Final Recommendation

**No new entity, field, or schema is approved by this record.** The
architecturally honest conclusion is that Decision Records 0001–0012, as
they stand, do not yet contain a source capable of authoritatively
defining "required Deliveries" or "required Approvals" for an Order —
this is a gap in the approved baseline, not an ambiguity this record can
resolve by choosing among Quote, Order, Campaign, Asset, Delivery, or
Approval, because none of them currently carries the necessary content.
The single candidate direction worth carrying forward — an Order-scoped
requirements snapshot captured at Order-creation time — is recorded here
strictly as **PROPOSED FUTURE ARCHITECTURE / DEFERRED**, pending a
future, explicitly-approved decision round; it must not be treated as
approved, implemented, or schema-ready as a result of this record.
Decision Record 0012's guard *shape* stands unweakened; only its
membership test remains open, exactly as this record found it.

## Consistency with Decision Records 0001–0012

- Consistent with 0001/0002: does not invent schema, does not assume the
  Approval target set (D6) or any versioning/idempotency design point has
  been decided, and does not treat Service/Package as within the
  approved entity list established across 0001–0011 (Organization, User,
  Membership, Campaign, Brief, Quote, Order, Order Budget, Expense,
  Asset, Production Job, AI Generation, Approval, Delivery, Financial
  Ledger, Reserve, Owner Settlement, Audit Event) — none of which
  includes Service or Package.
- Consistent with 0003 (Campaign): preserves its completion-inference
  rule and does not use `DELIVERY`/`CLOSED` as an Order-requirements
  source (§12).
- Consistent with 0005 (Quote): preserves the separation of Quote
  `ACCEPTED`, Client Approval, and Order creation as distinct events,
  and does not invent Quote content/schema (§10).
- Consistent with 0006 (Asset): does not decide Asset lineage or
  cardinality, and does not treat Asset as a self-sufficient
  requirements source (§13).
- Consistent with 0007 (Order): completes the analysis 0007 deferred,
  without inventing the guard mechanics wholesale — narrows the open
  question to a named, still-open architecture gap.
- Consistent with 0008/0009 (Production Job, AI Generation): does not
  read either as a completion signal, consistent with 0012 §17.
- Consistent with 0010 (Approval): does not invent a target type or
  resolve the target-type set (§18).
- Consistent with 0011 (Delivery): does not resolve cardinality or
  partial-delivery semantics (§17).
- Consistent with 0012 (Completion Guard): preserves its conjunctive
  guard shape unweakened (§19) and directly continues its own named
  deferred items (its §19 list, items 1–2).
- No Decision Record 0001–0012 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume Service or Package are approved entities — they are not
  found in any Decision Record 0001–0012 (Governance Note, §8, §9).
- Do not assume Quote, Order, or Campaign content/schema has been
  approved beyond what 0001–0012 explicitly state (§10, §11, §12).
- Do not assume an Order-scoped requirements-snapshot entity has been
  approved — it is a PROPOSAL only (§16, §24).
- Do not assume the Approval target-type set or Delivery cardinality has
  been decided by this record (§17, §18).
- Do not assume exactly one Delivery or exactly one Approval per Order.
- Do not assume the Order `ACTIVE` → `COMPLETED` guard has become fully
  implementable as a result of this record — its shape is confirmed, its
  membership test is not (§19).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0012 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
