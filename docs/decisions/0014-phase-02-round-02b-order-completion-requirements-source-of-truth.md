# Decision Record 0014 — Phase 02 Round 02B: Order Completion Requirements Source of Truth

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED — at the logical/architectural-concept level only.
  No field, table, migration, or physical schema is approved by this
  record (see §24, "Important Limitation" honored throughout).
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0013. All remain authoritative and unchanged. This record resolves
  the architecture gap Decision Record 0013 identified — which entity, if
  any, can authoritatively define "required" Deliveries/Approvals for an
  Order — at the level of architectural concept, without inventing
  physical schema.

## Governance Note

Per the standing source-of-truth hierarchy (`CLAUDE.md`): no Constitution
text has ever been provided to this session. Every claim below is
labeled **FACT**, **APPROVED**, **INFERENCE**, **PROPOSAL**,
**DEFERRED**, or **UNVERIFIED**. "Existing repository documentation" was
checked (`ARCHITECTURE.md`, full-text search for "Service," "Package,"
"commercial," "Quote," "Order," "Deliverable"): `ARCHITECTURE.md` uses
the word "Services" only for its UI→Application→Domain→**Services**→
Infrastructure code layer (application-facing interface abstractions) —
an unrelated, code-architecture meaning, **not** a commercial domain
entity. No repository documentation, and no Decision Record 0001–0013,
supports "Service" or "Package" as commercial domain entities. This
finding, first raised in Decision Record 0013, is reconfirmed here
against the broader source set the task specifies.

## 1. Context

Decision Record 0012 fixed the Order `ACTIVE` → `COMPLETED` guard's
logical shape as a conjunction of a Delivery coverage condition and an
Approval coverage condition. Decision Record 0013 found that no
currently-approved entity (Quote, Order, Campaign, Asset, Delivery,
Approval — Service and Package being unverified as entities at all) can
supply the membership test for "required" on either side, and proposed,
without adopting, an Order-scoped requirements-snapshot concept. This
record is asked to resolve that gap at the architectural-concept level.

## 2. Architecture Gap (Restated from Decision Record 0013)

**FACT/APPROVED (established in 0013, unchanged):** no approved entity's
content/schema currently holds "how many Deliveries does this Order
need" or "how many Approvals, of what kind, does this Order need."
Existing entities either (a) don't exist in the approved baseline
(Service, Package), (b) exist but were only approved for lifecycle/state,
never content/schema (Quote, Order), (c) are structurally disqualified
(Campaign, by its own completion-inference rule and its downstream
position), or (d) are the objects measured against the requirement, not
the source of it (Asset, Delivery, Approval).

## 3. Existing Approved Constraints Relevant to This Decision

- **D1** (composite-FK tenant isolation), **D2** (UUID v7), **D5**
  (`status` + `archived_at`, `ON DELETE RESTRICT` default), **D8**
  (`TEXT`+`CHECK`, no native `ENUM`) — apply to any future entity,
  unchanged (0002).
- **D3** (versioning) — scoped explicitly to Price Configuration and
  Brand DNA only; not expanded by this record (0002, reaffirmed by 0006's
  own care not to conflate Asset's separate versioning principle with
  D3's scope).
- **Immutability principle** (0002, "Approved Relationships" item 7):
  financial/audit history must not be freely mutable; corrections are new
  events, never rewritten facts. This principle is not itself scoped to
  finance only in its stated rationale ("Corrections are represented
  through controlled new events, never by rewriting historical facts")
  and is the closest existing precedent for how this record reasons about
  historical integrity in §14.
- **Campaign's completion-inference rule** (0003, Rule 4): Campaign
  completion must not be inferred merely from payment, production, or
  client preview — reused by analogy in 0013 §12 to disqualify Campaign
  as an Order-requirements source, unchanged here.
- **Quote/Order separation** (0005): Quote `ACCEPTED`, Client Approval,
  and Order creation are three separate events, never collapsed.
- **Pattern of "new record instead of in-place mutation"** used
  throughout: Asset revision (0006), Quote replacement via cancel+new
  (0005), Production Job/AI Generation retry (0008/0009), Approval
  retry (0010) — an established house convention, not new to this record.

## 4. Candidate Sources (A–I)

Evaluated in §5–§12 and summarized in §18: Service (A), Package (B),
Quote (C), Order (D), Campaign (E), Asset set (F), Delivery/Approval
records (G), Order-scoped requirements snapshot (H), other existing
mechanism (I).

## 5. Service Analysis

**UNVERIFIED as an entity** — confirmed again in the Governance Note
above, now also checked against `ARCHITECTURE.md`, which uses "Services"
only as a code layer, not a domain entity. **Not selectable** as a
source: there is nothing approved to select. If a commercial "Service"
catalog entity is ever approved in a future round, its relationship to
fulfillment requirements would need its own explicit decision — recorded
here only as a **dependency**, not as implemented architecture.

## 6. Package Analysis

**UNVERIFIED as an entity**, for the same reason as §5. The
"PACKAGE → BASE PRICE + ADD-ONS + EXTRA PRODUCTION + EXTRA REVISION"
pipeline referenced in earlier task wording remains absent from every
Decision Record and from `ARCHITECTURE.md`. **Not selectable.** Recorded
as a future **dependency** only if and when Package is separately
approved.

## 7. Quote Analysis

**Can the accepted Quote legitimately be the continuously-referenced
source? No.** Two independent reasons:

1. **Content gap:** Decision Record 0005 approves Quote's *lifecycle*
   (`DRAFT`→`SENT`→`ACCEPTED`/etc.) and its Cost Check/Margin Check
   guards, but never approves what fields/content a Quote holds — no
   line items, deliverable list, or approval requirement is part of the
   approved Quote model. There is nothing on Quote today to point to.
2. **Stability gap:** even if Quote content existed, 0005 Boundary 5
   states a `SENT` Quote is never edited in place — a changed Quote is
   cancelled and replaced by a new Quote. A live Order cannot safely keep
   referencing "the Quote" as an ongoing source, because the specific
   Quote row that produced the Order is a fixed historical fact, while a
   *replacement* Quote (for a different, later commercial round) is a
   different row entirely and must not be confused with the one that
   actually produced this Order.

**If the answer were yes** (i.e., if Quote content were ever approved),
the additional conceptual information needed would be: a deliverable/
scope description and an approval-purpose description attached to the
Quote, **copied into the Order at Order-creation time** rather than
referenced live — which is precisely the snapshot mechanism analyzed in
§13, not a reason to treat Quote itself as the ongoing source.

## 8. Order Analysis

**Can Order directly define requirements? Not today**, because Order's
own schema/content has never been approved beyond `status`,
`archived_at`, and identity/tenant columns implied by D1/D2/D5/D8
(0007). **Conceptually, Order is still the correct place for the
*meaning* of "required" to be anchored**, because Order is the entity
whose completion the guard (0012) actually gates, and anchoring the
answer anywhere upstream (Quote, Campaign) reintroduces the stability
problem in §7. This supports Option H (§13) rather than Option D taken
literally — the distinction matters: Order does not *originate* its own
requirements independently; it *holds* a requirements snapshot captured
at its creation from whatever commercial source produced it.

## 9. Campaign Analysis

**Reaffirmed rejected**, per 0013 §12: Campaign's own completion-
inference rule (0003, Rule 4) forbids using Campaign progress to imply
completion of anything, and Campaign is downstream of Order in the
approved relationship (`ORDERED` means an Order already exists), not
upstream of it. Using Campaign to define Order's requirements would also
collapse two separate lifecycle axes this record is explicitly asked not
to collapse (Campaign Boundary section of the requesting task).

## 10. Asset Analysis

**Reaffirmed rejected** as a direct source, per 0013 §13: which Assets
are "final"/"required" is exactly the undecided Delivery↔Asset
cardinality question (0011 §16), not an answer to it. An Asset set could
become part of *what a snapshot conceptually references* once cardinality
is resolved, but cannot supply the requirement on its own today.

## 11. Delivery Analysis

**Reaffirmed rejected** as a self-defining source, per 0013 §14: a
Delivery record reports its own completion fact; it cannot report
whether other, not-yet-created Deliveries are also owed. It remains the
object measured against the requirement (0012's Delivery condition),
never the requirement's source.

## 12. Approval Analysis

**Reaffirmed rejected** as a self-defining source, per 0013 §15, and
newly compounded by the target-type gap already named in 0010: an
Approval record cannot define which Approval target types are required,
because the target-type set itself remains unapproved. No target type is
invented here to close this gap.

## 13. Requirements Snapshot Analysis (Option H)

**PROPOSAL, adopted at the concept level in §18 — not as schema.**

**What it is, logically:** a controlled record, associated 1:1 with an
Order and established at Order-creation time, whose role is to state —
in whatever form a later, separate decision defines — what Deliveries
and what Approvals that specific Order requires for `ACTIVE` →
`COMPLETED`. It is not a table, column list, or migration; it is a
statement about *where the answer lives conceptually*, so that future
schema design has an agreed anchor instead of re-litigating this
question.

**Why it is preferable to continuous derivation from Campaign, Assets,
Delivery, or Approval records** (as the task explicitly asks):

- **Stability.** Campaign, Brief, Asset, and pricing/commercial
  configuration are all independently mutable after an Order exists (new
  Campaign phases, Brief revisions, new Asset versions, superseding
  Quotes). If Order completion were continuously *derived* from their
  current state, a later, unrelated change to any of them could silently
  change what an already-created Order is required to complete — exactly
  the failure mode the task's "Requirements Snapshot Principle" section
  warns against.
- **Historical integrity.** This mirrors the already-established house
  convention (§3) that historical meaning is preserved through captured
  facts, not live derivation from currently-mutable state — the same
  reasoning behind Asset's new-row-per-revision, Quote's cancel+new
  instead of in-place edit, and the general immutability principle.
- **Decoupling repeated in every other axis.** Order already must not
  infer Payment, Production, QC, or Delivery/Approval state (0007); by
  the same logic, Order's *requirements* should not be an ambient,
  continuously-recomputed function of other entities' current state —
  it should be a fact fixed once, at the point the commercial engagement
  became an Order.
- **Direct alternative rejected:** deriving "required" live from
  Campaign/Asset/Delivery/Approval state was evaluated in §9–§12 and
  fails independently of the stability argument — those entities cannot
  even supply a correct answer today, stability aside.

**What such a snapshot would conceptually need to capture** (logical
only, no fields/tables): identity of the deliverable scope this Order
owes (in whatever form Delivery cardinality is eventually resolved,
§16), and identity of the approval obligations this Order owes (in
whatever form the Approval target-type set is eventually resolved,
§17) — plus enough reference to the commercial scope that produced it
(e.g., which Quote, conceptually) to explain *why* the requirement is
what it is, without that reference becoming a live dependency (§7).

## 14. Historical Integrity

Consistent with §3's house convention, a captured-at-creation snapshot
does not need to be declared unconditionally immutable to preserve
history — what matters is that it is never **silently** overwritten by
an unrelated later change (a new Campaign phase, a new Brief revision, a
new Asset version, a new commercial configuration). Per the task's own
instruction not to assume immutability without justification: this
record does **not** mandate a hard immutability rule; it mandates that
any change to an Order's requirements be a **controlled, deliberate,
traceable act** — consistent with how every other historically-
significant fact in this architecture is changed (a new Quote row, a new
Asset row, a new Approval row — never an in-place rewrite that erases
what was true before). The exact mechanism (versioned rows, an
append-only change log, or another controlled-change pattern) is
**DEFERRED** — this record fixes the *principle* (no silent rewrite),
not the *mechanism*.

Three concepts are kept distinct, per the task's explicit instruction:

- **Historical commercial truth** — what was agreed (Quote, and any
  future Service/Package) at the time it was agreed; owned by the
  commercial entities themselves and their own state machines.
- **Operational fulfillment requirements** — what a specific Order is
  required to complete; the subject of this record (§13).
- **Current Campaign state** — the narrative phase the Campaign is in
  right now; owned by Campaign (0003) and never a source for the other
  two.

## 15. Revision Implications

**Not every revision changes Order requirements.** The task explicitly
warns against assuming otherwise, and existing precedent supports the
warning: Asset revision (0006) and Production Job retry/revision (0008)
already occur *within* an Order without altering Order's own state
(0007) — a revision cycle that stays within already-agreed scope
(fixing/improving a deliverable that was already required) does not need
to touch the requirements snapshot at all.

**A genuine scope expansion is different.** If a revision introduces a
new commercial requirement (e.g., a deliverable that was never part of
the original agreement), that is a new commercial fact, not a correction
to an existing one. This record does **not** decide how such an
expansion is captured (a new Quote, an Order amendment mechanism, or
something else) — it identifies that decision as its own future decision
boundary, **DEFERRED**, and explicitly warns against silently treating
every revision as either "never changes requirements" or "always changes
requirements." The distinguishing test (in-scope fix vs. scope
expansion) is itself **DEFERRED** — this record does not invent it.

## 16. Delivery Requirement Model

To say "these are the Deliveries required for this Order," the
architecture must eventually know, at minimum: deliverable identity
(what is owed), required quantity/scope, and how partial/failed/
cancelled Deliveries against that scope are treated. **None of this can
be safely represented today**, because Decision Record 0011 leaves
Delivery→Asset cardinality, multiple-Delivery-per-Order, and partial-
delivery semantics all explicitly deferred. Per the task's own
instruction, this limitation is stated plainly rather than worked
around: **the Delivery requirement model's content is DEFERRED in full**;
only its conceptual container (§13) is established by this record.

## 17. Approval Requirement Model

To say "these are the Approvals required for this Order," the
architecture must eventually know: which Approval target(s) apply, the
purpose of each, how many are required, and how each relates to a final
deliverable or to Order completion directly. **Exactly what must be
resolved later** (naming it precisely, per the task's instruction): the
approvable target-type set itself (Decision Record 0010's own deferred
item) — without that set existing, there is no vocabulary in which to
even name "the Approval this Order needs." No target type (e.g., an
"Order completion" or "final deliverable" target) is invented here. The
Approval requirement model's content is **DEFERRED in full**, same as
§16; only its conceptual container (§13) is established here.

## 18. Recommended Source of Truth

**Option H — an Order-scoped requirements snapshot, as a logical
architectural concept — is recommended over A, B, C, D (taken alone), E,
F, and G.** No Option I (another existing approved mechanism) was found;
§5–§12 exhausted the approved entity list from Decision Records
0001–0013, and none qualifies alone. This is an **architectural-concept-
level APPROVAL**: the *role* (Order-anchored, captured-at-creation,
change-controlled-not-silently-derived) is decided; the *content* (what
fields, what target types, what cardinality) is explicitly not decided
and remains gated on Decision Record 0010's target-type resolution and
Decision Record 0011's cardinality resolution (§16, §17).

## 19. Order Completion Relationship

Decision Record 0012's guard is unchanged:

```
Order.ACTIVE
  -> ALL REQUIRED DELIVERIES COMPLETED
  AND ALL REQUIRED APPROVALS APPROVED
  -> Order.COMPLETED
```

This record's contribution is narrow and specific: "required Deliveries"
and "required Approvals" are now understood to mean *the contents of
this Order's requirements snapshot* (§13), once that snapshot's content
model exists — rather than an open question with no candidate answer at
all. The guard does not become implementable as a result of this record;
it becomes **conceptually well-formed**, pending §16/§17.

## 20. Security and Tenant Boundary

Conceptually, any future requirements snapshot inherits the same
tenant-isolation architecture as every other tenant-owned entity —
`organization_id` scoping plus the composite-FK pattern (Decision Record
0002, D1) — so that one Organization's Order requirements can never be
read or written by another Organization's context. This is stated as a
constraint on any future design, not as new approved schema. No
authorization or RLS mechanism is designed or implemented by this
record.

## 21. Financial Boundary

A requirements snapshot states what fulfillment work is owed — it is not
a financial event and must not be read as one. Consistent with every
prior record (0001, 0002, 0007, 0012, 0013): no revenue, profit, owner
settlement, refund, or payment-success fact is inferred from, or implied
by, an Order's completion requirements. Financial consequences remain
the exclusive concern of the Financial Ledger and the approved financial
architecture.

## 22. Rejected Alternatives

- Service (A) and Package (B) as sources — rejected; neither is an
  approved entity in any Decision Record or in `ARCHITECTURE.md` (§5,
  §6).
- Quote (C) as a continuously-referenced source — rejected; no approved
  content to reference, and Quote rows are not guaranteed stable across
  an Order's life (§7).
- Order (D) as an independent originator of its own requirements —
  rejected in that literal form; Order is the right *anchor* but not an
  independent *source* (§8).
- Campaign (E) as a source — rejected; violates its own completion-
  inference rule and its downstream position relative to Order (§9).
- Asset set (F) as an implicit source — rejected; blocked by undecided
  cardinality, and is the object measured, not the source (§10).
- Delivery/Approval records (G) as self-defining their own requirement —
  rejected; they report outcomes, not scope (§11, §12).
- Hard, unconditional immutability for the requirements snapshot —
  rejected as unjustified by itself; a controlled-change discipline is
  adopted instead, consistent with house convention (§14).
- Assuming every revision changes Order requirements, or that no
  revision ever does — both rejected; the distinguishing test itself is
  deferred (§15).
- Inventing an Approval target type or a Delivery cardinality rule to
  make this record's content model complete — rejected; both remain
  DEFERRED (§16, §17).

## 23. Deferred Decisions

1. The approvable Approval target-type set (Decision Record 0010,
   unchanged — blocks §17's content).
2. Delivery→Order and Delivery→Asset cardinality, multiple-Delivery, and
   partial-delivery semantics (Decision Record 0011, unchanged — blocks
   §16's content).
3. The exact content model of the requirements snapshot (fields, target
   references, quantities) — depends on items 1–2.
4. The physical database representation of the requirements snapshot
   (table, columns, constraints, or otherwise) — not designed by this
   record.
5. The exact mechanism for controlled (non-silent) changes to an Order's
   requirements — versioned rows, append-only change log, or another
   pattern (§14).
6. The scope-expansion-vs-in-scope-revision distinguishing test (§15).
7. The future decision boundary for how a genuine scope expansion is
   captured (new Quote, Order amendment mechanism, or otherwise) (§15).
8. Whether Service and/or Package will ever be approved as entities, and
   if so, their relationship (if any) to the requirements snapshot's
   commercial-scope reference (§5, §6, §13).
9. Whether Quote content/schema will ever be approved (§7).
10. The trigger mechanics for when exactly the snapshot is captured
    (e.g., precisely at Order-row creation vs. a defined step
    immediately after).
11. Exact tenant/RLS implementation (§20).
12. Exact `CHECK`/constraint implementation for any future schema.

## 24. Final Recommendation

Answering the task's eight framing questions:

1. **Where do Order completion requirements originate?** From whatever
   commercial scope produced the Order (today, only Quote is approved to
   exist in that role; Service/Package remain unverified dependencies).
2. **When are they established?** At Order-creation time — captured
   once, not re-derived continuously afterward.
3. **Where is their authoritative meaning held?** In an Order-scoped
   requirements snapshot (Option H) — a logical concept only; no schema
   is approved.
4. **How are required Deliveries determined?** Not yet determinable in
   full — the snapshot is the right container, but its Delivery content
   is blocked on Decision Record 0011's cardinality/partial-delivery
   resolution (§16).
5. **How are required Approvals determined?** Not yet determinable in
   full — blocked on Decision Record 0010's target-type resolution
   (§17).
6. **How does the system preserve historical Order scope?** Through a
   controlled-change discipline (no silent overwrite by later Campaign/
   pricing/Brief/Asset changes), consistent with the house convention
   already used for Asset, Quote, and financial history — exact
   mechanism deferred (§14).
7. **How do revisions interact with the requirements?** In-scope
   revisions (Asset/Production Job style) do not change them; genuine
   scope expansions do, through a future, separately-decided boundary
   (§15).
8. **What remains deferred?** Everything with physical or content
   specificity — see §23's twelve items. What is **not** deferred is the
   architectural role: an Order-scoped, creation-time, controlled-change
   requirements snapshot is the correct home, and continuous derivation
   from Campaign, Asset, Delivery, or Approval state is rejected as
   unstable and, independently, as currently impossible to compute
   correctly (§9–§12).

**ARCHITECTURAL SOURCE OF TRUTH = RESOLVED** (Option H, at the concept
level). **PHYSICAL DATABASE IMPLEMENTATION = DEFERRED**, pending
Decision Records 0010 and 0011's own still-open target-type and
cardinality resolutions, and a future schema-design decision round. This
record does not claim more than that.

## Consistency with Decision Records 0001–0013

- Consistent with 0001/0002: introduces no schema, no new versioning
  scope expansion of D3 (the controlled-change discipline in §14 is
  reasoned by analogy to D3/D5/the immutability principle, not a
  rewriting of D3's Price-Configuration/Brand-DNA-only scope), and does
  not touch the approved entity list.
- Consistent with 0003 (Campaign): preserves its completion-inference
  rule; does not use Campaign as a requirements source (§9).
- Consistent with 0004 (Brief): does not fold Brief revision into Order
  requirements handling; Brief remains Campaign-scoped and pre-Order.
- Consistent with 0005 (Quote): preserves the three-separate-events
  principle (Quote `ACCEPTED` / Client Approval / Order creation) and
  the cancel-and-replace convention used in §7's reasoning.
- Consistent with 0006 (Asset): reuses its new-row-per-revision
  convention as precedent (§3, §14) without expanding Asset's own
  versioning scope.
- Consistent with 0007 (Order): keeps Order free of Payment/Production/
  QC/Approval/Delivery state, and does not invent Order schema (§8).
- Consistent with 0008/0009 (Production Job, AI Generation): reuses
  their revision/retry-is-a-new-record convention as precedent (§15)
  without altering their own approved behavior.
- Consistent with 0010 (Approval): does not invent a target type or
  resolve the target-type set (§17).
- Consistent with 0011 (Delivery): does not resolve cardinality or
  partial-delivery semantics (§16).
- Consistent with 0012 (Completion Guard): preserves its conjunctive
  guard shape unweakened (§19).
- Consistent with 0013 (Requirements gap): adopts, at the concept level
  only, the PROPOSAL that record raised without endorsing, and answers
  exactly the two questions 0013 left open — without contradicting any
  of 0013's own findings.
- No Decision Record 0001–0013 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume Service or Package are approved entities — neither is
  found in any Decision Record 0001–0013 or in `ARCHITECTURE.md`
  (Governance Note, §5, §6).
- Do not assume the Order-scoped requirements snapshot (§13, §18) has
  any approved field, table, column, or migration — only its conceptual
  role is approved.
- Do not assume the requirements snapshot is unconditionally immutable —
  a controlled-change discipline is adopted instead, with the exact
  mechanism deferred (§14).
- Do not assume every revision changes Order requirements, or that no
  revision ever does (§15).
- Do not assume the Approval target-type set or Delivery cardinality has
  been decided by this record (§16, §17).
- Do not assume Quote content/schema has been approved (§7).
- Do not assume the Order `ACTIVE` → `COMPLETED` guard has become fully
  implementable as a result of this record — it is conceptually
  well-formed, not implementation-ready (§19).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0013 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
