# Decision Record 0023 — Phase 02 Round 02B: Approval Target Model & Approvable Target Boundary

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED — the target *shape* (§9) is decided at the
  logical level. The target *type set* (which entities may actually be
  approved) is explicitly **NOT** decided and remains DEFERRED/UNVERIFIED
  per candidate (§8). No field, table, migration, or approvable business
  category is approved by this record.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0022. All remain authoritative and unchanged. This record narrows
  — without closing — the target-type-set question Decision Record 0010
  and Decision Record 0002 D6 deliberately left for a later, separate
  decision.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service and
Package remain **UNVERIFIED** as entities, unchanged from 0013–0022; SKU,
product taxonomy, deliverable taxonomy, and approval-category taxonomy
are not introduced here — none is supported by any Decision Record
0001–0022.

## 1. Context

Decision Record 0002 D6 approved, *in principle*, that Approval uses "a
typed target model with nullable target FK columns and a constraint
requiring exactly one target," while explicitly withholding approval of
the target-type set itself. Decision Record 0010 reaffirmed that
withholding. Decision Record 0022 then showed that Required Approval
qualification and satisfaction do **not** need the target-type set
resolved to function (0022 §7) — narrowing, but not eliminating, the
dependency. This record is asked to resolve what can now be resolved
about the target *model*, and state precisely, with evidence, what
remains open about the target *set*.

## 2. Problem

An actual Approval record must eventually identify what real-world
object or decision it concerns. The architecture must supply: (a) a
logical shape capable of expressing that identification, generically,
for whatever target types are eventually approved; and (b) an honest,
evidence-based accounting of which already-approved entities are
currently supported as candidate target types — without promoting any of
them to "approved" status merely because they exist, and without
inventing new commercial categories to fill the gap.

## 3. Approved Inputs

- **0002 D6:** typed target model, nullable target FK columns, exactly
  one target — approved *in principle*; target-type set explicitly
  **not** approved.
- **0005 (Quote):** "Do not assume Quote is an approved Approval target
  type" (Prohibited Assumptions); "Exact Approval target relationship for
  Quote" (Deferred Items) — Quote is **explicitly named** as an open
  target-type candidate.
- **0006 (Asset):** "Whether Asset is a valid Approval target type"
  (Deferred Items); "Do not assume Asset is an approved Approval target
  type" (Prohibited Assumptions) — Asset is **explicitly named** as an
  open target-type candidate.
- **0010 (Approval):** "Exact target relationships and constraints" and
  the full target-type set remain **DEFERRED**; no candidate is named or
  ruled out.
- **0011 (Delivery):** "Exact Approval ↔ Delivery relationship" named as
  **DEFERRED** (Deferred Items item 9); Delivery does not own approval
  outcomes (§8, "Delivery vs. Approval Separation").
- **0017 §13, 0022 §6/§7/§9:** satisfaction (qualification and
  fulfillment of a Required Approval) is deliberately decoupled from the
  target model; only the *physical* reference mechanism, not the logical
  satisfaction test, depends on the target-type set.

## 4. Required Approval Identity

**Reaffirmed, unchanged from 0022 §4:** an opaque, per-Order-unique
identity distinguishes one Required Approval obligation from another.
Not re-decided here; restated only to anchor the three-layer distinction
in §7.

## 5. Approval Identity

**INFERENCE, consistent with 0002 D2/0010:** an actual Approval record
has its own identity (per the general UUID v7 convention, D2), distinct
from both the Required Approval it may satisfy (0022) and the target it
concerns (§6). This record does not create Approval's identity mechanism
— it already follows from D2 — it only names it as the second of three
layers that must not be collapsed (§7).

## 6. Approval Target

**APPROVED (shape only, not content):** the *target* is whatever
real-world object or decision an Approval record's formal decision
concerns — the thing D6's typed-target-model-in-principle was built to
express. This record confirms the target is a **first-class, separate
concept** from both Approval's own identity (§5) and any Required
Approval's identity (0022 §4); it is not yet populated with any actual
type or value (§8, §10).

## 7. Satisfaction Reference

**Reaffirmed, unchanged from 0022 §7:** the mechanism by which a
Required Approval is satisfied uses a reference to the Required
Approval's own identity, **independent of** the Approval's target (§6).
This record confirms that independence continues to hold regardless of
how the target-type set is eventually resolved — nothing in this
record's analysis (§8–§13) requires revisiting 0022's conclusion.

## 8. Candidate Approvable Targets

Evaluated strictly against evidence already on record — no candidate is
approved merely because the underlying entity exists:

- **Asset — DEFERRED.** Explicitly named as an open question by 0006
  itself ("Whether Asset is a valid Approval target type"). Strongest
  evidentiary candidate: the question was anticipated, not merely
  absent.
- **Quote — DEFERRED.** Explicitly named as an open question by 0005
  ("Exact Approval target relationship for Quote"). Same evidentiary
  standing as Asset.
- **Delivery — DEFERRED**, with an explicit caution against default
  adoption. 0011 §17 item 9 names "Exact Approval ↔ Delivery
  relationship" as unresolved; 0011 §8 keeps Delivery from owning
  approval outcomes but does not rule out Delivery being *approved on*.
  Per this task's explicit instruction, Delivery is **not** made
  automatically approvable (§15).
- **Campaign — UNVERIFIED.** No Decision Record 0001–0022 discusses
  Campaign as a candidate Approval target at all (confirmed by full-text
  search across all records for "Approval target"/"target type" —
  Campaign never appears in that context). Absence of discussion, not
  absence of merit — genuinely unaddressed.
- **Brief — UNVERIFIED**, for the identical reason as Campaign. Brief's
  own internal `APPROVED` state (0004) is a Brief-lifecycle value, not a
  statement about the separate Approval entity, and 0004 never connects
  the two.
- **Order — UNVERIFIED**, for the identical reason. Order is discussed
  extensively as a *consumer* of Approval's completion-relevant outcome
  (0007, 0012–0022) but never as something an Approval record's target
  could itself point at.
- **Brand DNA — UNVERIFIED**, for the identical reason; discussed only
  in the D3 versioning context (0002), never in an Approval-target
  context.

**No candidate reaches APPROVED status.** This record does not promote
any of them — doing so would resolve Decision Record 0010's own reserved
question without the dedicated decision 0002/0010 both anticipated.

## 9. Target Identity Model

Evaluated per the task's five candidates:

- **A. Target type + target identity.** **Distinguishability:** full —
  a type discriminator plus an identity within that type uniquely
  resolves any target. **Historical stability:** conditional on §13's
  immutable-reference principle, not automatic by itself.
  **Tenant isolation:** compatible — the referenced row's own
  `organization_id` can be cross-checked against the Approval's, per the
  existing composite-FK pattern (0002 D1). **Satisfaction semantics:**
  fully compatible — orthogonal to §7's already-decoupled satisfaction
  mechanism. **DR 0010 compatibility:** this **is** exactly what 0002 D6
  already approved in principle. **False-completion risk:** none
  introduced by the shape itself. **Implementation implications:**
  physical columns/constraints remain undesigned. **Classification:
  APPROVED** — reaffirmed, not newly invented.
- **B. Target identity only (no type discriminator).** **Evidence:**
  none; would require either a single universal target table (not
  approved) or globally-unique cross-entity identifiers (not
  established). **Contradictions:** conflicts directly with D6's
  "typed" requirement. **Classification: REJECTED.**
- **C. Opaque Approval target identity** (an identity with no resolvable
  type at all). **Evidence:** none — without a type, a bare identity
  cannot be dereferenced to any actual row. **Classification:
  REJECTED** as underspecified/non-functional.
- **D. Direct identity through the Required Approval** (the target
  collapses into the obligation itself; substantive meaning, if any,
  lives only in the Required Approval's own description). **Evidence:**
  this is the same "Model E" 0022 §6/§9 already named as a plausible
  future convergence and explicitly declined to adopt. **Necessity
  check:** not needed for Order-completion purposes, since §7 confirms
  satisfaction already works without it. **Classification: PROPOSAL/
  DEFERRED**, unchanged from 0022 — not adopted as the general Approval
  target model, since Approval is a general-purpose entity (0001
  decision 8) serving needs beyond Order completion alone.
- **E. Another model.** **None found.**

**Selected: Model A**, exactly as already approved in principle by 0002
D6 — this record does not change it, only confirms it survives the
additional evaluation criteria posed here.

## 10. Target Type Boundary

**APPROVED (the structural conclusion this record actually adds):** the
target *shape* (Model A, §9) and the target *type set* (§8) are two
separate decisions, and **resolving the shape does not require, and must
not be read as, resolving the set.** Consistent with 0002 D6's own
framing ("will be decided separately before physical schema design"),
this record leaves every candidate in §8 exactly where the evidence
places it — no candidate is silently admitted to the type set as a side
effect of confirming the shape.

## 11. Multiple Approval Records

**Reaffirmed, unchanged from 0017 §8/0018 §8/0022 §12:** for one
Required Approval, `A1 = REJECTED`, `A2 = EXPIRED`, `A3 = APPROVED`
results in the requirement being satisfied by `A3`; earlier unsuccessful
records neither erase the requirement nor need reconciliation. No
`RETRY` state or reopening of a terminal Approval is introduced. This
record's target-model findings do not alter that conclusion — target
identity (§6) is orthogonal to how many attempts occur.

## 12. One Approval → One Requirement

**Reaffirmed, unchanged from 0018 §9/0022 §13:** by default, one actual
Approval record's satisfaction reference resolves to exactly one
Required Approval. A future target-based shared-approval model (one
Approval, via a shared target, satisfying several Required Approvals at
once) is conceivable but **not adopted or designed here** — marked
**DEFERRED**, consistent with 0018 §9's treatment of the equivalent
question and with 0022 §13's explicit deferral of bundled Approval
satisfaction.

## 13. Target Mutability

**APPROVED principle, an INFERENCE from already-established precedent
rather than a new invention:** if and when a target type is approved,
an Approval's target reference must identify an **immutable, historically
-fixed row** — never a live or mutable concept that could later change
meaning out from under a terminal Approval decision. This follows
necessarily from applying the same historical-integrity discipline
already used throughout this chain: 0006's new-row-per-revision principle
for Asset, and 0014 §14/0015 §16's captured-snapshot-not-live-derivation
principle for the Order Requirements Snapshot itself. Concretely: Asset
revision, Campaign phase changes, Brief revisions, Brand DNA versioning
(0002 D3), and Quote replacement (0005 boundary 5, cancel+new rather than
edit-in-place) all already produce **new, distinct rows** rather than
mutating history — so an Approval's target reference, once resolved,
naturally stays pinned to whichever specific row existed at the moment
of reference, without this record needing to invent a separate
"versioning" mechanism. **Whether the eventual implementation expresses
this as "target row identity" or introduces a distinct "target version"
concept is a physical decision, left DEFERRED** — the *principle*
(immutable reference, never live) is decided now; the *mechanism* is
not.

## 14. Asset Revision Boundary

**APPROVED conclusion, consistent with 0006 and §13:** an Approval can
logically refer to a specific Asset version **without inventing any new
concept**, because 0006 already makes each Asset revision a distinct row
with its own identity — referring to that row's identity **is** referring
to that version; no separate "target version" field or mechanism needs
to be invented. This does not decide *whether* Asset will ever be an
approved target type (§8, still DEFERRED) — it only confirms that *if*
Asset is ever approved as one, no additional versioning concept would be
needed beyond what 0006 already provides.

## 15. Delivery Boundary

**APPROVED — explicit, per instruction:** Delivery is **not** made
automatically approvable by this record. Per §8's evidence, the
Approval↔Delivery relationship remains exactly as **DEFERRED** as 0011
§17 item 9 already left it. This record adds no new evidence for or
against Delivery specifically, beyond what 0011 already states, and does
not resolve it in either direction.

## 16. Historical Integrity

**Reaffirmed and extended by §13:** the Order Requirements Snapshot's
Required Approvals remain anchored as already established (0014 §14,
0015 §16, 0016 §10, 0018 §16, 0020 §13, 0021 §11, 0022 §14); this record
adds that, symmetrically, any eventual Approval *target* reference must
be equally immutable and non-live, so that neither side of an Approval
decision — the obligation it addresses nor the object it concerns — can
be silently redefined by a later, unrelated change.

## 17. Order Completion Interaction

**No change to Decision Record 0012, and none is necessary.** As §7
confirms, satisfaction (the only mechanism 0012's guard actually
depends on, via 0018 §12's formula) was already fully decoupled from the
target model by Decision Record 0022. Resolving the target *shape*
(§9) and clarifying the target *type-set boundary* (§10) therefore has
**zero effect** on the guard's implementability or logic — the guard was
neither blocked by, nor waiting on, this record's conclusions.

## 18. Zero-Requirement Boundary

**Not resolved here — Decision Record 0019 unchanged.** The target model
(§6–§13) only ever applies to actual Approval records addressing actual
Required Approval obligations; if the Required Approval collection is
empty, there are no such records to consider, and no conflict arises.
This record states only that structural compatibility, consistent with
0022 §17's identical conclusion on the Required Approval side.

## 19. Security / Tenancy

**APPROVED principle:** whatever target type is eventually approved, its
referenced row must belong to the same Organization as the Approval and
the Order it ultimately serves — cross-tenant target references are
never permitted, consistent with the existing composite-FK/tenant-
scoping pattern (0002 D1). This is stated as a mandatory constraint on
any future physical design, not as new schema. No RLS or authorization
mechanism is designed or implemented by this record.

## 20. Financial Separation

Unchanged from every prior record in this chain: the Approval target
model does not represent, and must not be used to infer, Payment,
Revenue, Expense, Profit, Refund, or Owner Settlement.

## 21. Rejected Alternatives

- Model B (target identity only, no type) and Model C (a bare opaque
  target identity) — rejected (§9); both are underspecified and conflict
  with D6's typed-model requirement.
- Model D (collapsing target into the Required Approval) as the general
  solution — rejected as unnecessary and premature (§9); remains a noted
  future possibility only, per 0022.
- Promoting any of Asset, Quote, Delivery, Campaign, Brief, Order, or
  Brand DNA to an APPROVED target type — rejected (§8); no Decision
  Record supplies that authority, and doing so here would resolve 0010's
  own reserved question without its dedicated decision.
- Making Delivery automatically approvable — rejected outright (§15),
  per explicit instruction.
- Treating a live/mutable object reference as an acceptable target —
  rejected (§13); an immutable-reference principle is adopted instead.
- Inventing a new Asset "version" concept to support target references —
  rejected (§14); unnecessary given 0006's existing row-per-revision
  design.
- Inventing Service, Package, SKU, or any product/deliverable/approval-
  category taxonomy to populate the target-type set — rejected outright
  (Governance Note).

## 22. Deferred Decisions

1. The approvable target-type set itself — which of Asset, Quote,
   Delivery, Campaign, Brief, Order, Brand DNA (or others) will actually
   be approved, if any (§8) — the single largest remaining item in this
   entire chain.
2. The Approval↔Delivery relationship specifically (0011 §17 item 9,
   unchanged).
3. The physical mechanism expressing target immutability — "target row
   identity" vs. a distinct "target version" concept (§13).
4. Whether a future shared/bundled-target Approval model will ever be
   adopted (§12).
5. Whether Model D's future convergence (target = Required Approval
   itself) will ever be adopted for some or all target types (§9).
6. Any physical database representation of the target model (§9, §19).
7. Exact tenant/RLS implementation (§19).
8. All items already deferred by 0010 and untouched here: actor/role,
   authorization, expiry mechanics.

## 23. Final Recommendation

The Approval target **shape** is confirmed as Model A — target type plus
target identity, exactly as Decision Record 0002 D6 already approved in
principle — and this record adds the discipline that this shape decision
must never be read as resolving the target **type set**, which remains
genuinely open. Of the candidates evaluated, Asset and Quote carry the
strongest evidentiary standing (each explicitly named as an open question
by its own governing record), Delivery remains an explicitly deferred,
not-automatically-adopted candidate, and Campaign, Brief, Order, and
Brand DNA are entirely unaddressed (UNVERIFIED) rather than rejected.
Target references, once the type set is resolved, must be immutable and
historically pinned — never live — mirroring the discipline already
applied throughout this chain, and Asset specifically needs no new
"version" concept to support this, since 0006's row-per-revision design
already provides it. None of this affects Decision Record 0012's guard,
which Decision Record 0022 had already made independent of the target
model. The target-type-set decision itself remains the largest,
deliberately unresolved item in the entire Order-completion chain.

## Consistency with Decision Records 0001–0022

- Consistent with 0001/0002: reaffirms D6's typed-target-model-in-
  principle without expanding or resolving its reserved target-set
  question.
- Consistent with 0003/0004 (Campaign, Brief): both remain UNVERIFIED
  candidates, per an honest absence of evidence, not a ruling either way.
- Consistent with 0005 (Quote): reaffirms its explicit open question
  without resolving it.
- Consistent with 0006 (Asset): reaffirms its explicit open question
  without resolving it; confirms its versioning design already suffices
  for any future target reference (§14).
- Consistent with 0007 (Order): remains UNVERIFIED as a target candidate;
  its role as completion-guard consumer is unaffected.
- Consistent with 0008/0009 (Production Job, AI Generation): neither is
  discussed as a target candidate; not addressed by this record.
- Consistent with 0010 (Approval): directly implements, without
  resolving, its own reserved target-type-set question.
- Consistent with 0011 (Delivery): reaffirms its explicit, still-open
  Approval↔Delivery dependency without resolving it (§8, §15).
- Consistent with 0012 (Completion Guard): unaffected (§17).
- Consistent with 0013/0014/0015: reuses their finding that upstream
  commercial content remains unapproved, without re-litigating it.
- Consistent with 0016/0017/0018: reaffirms qualification/satisfaction
  conclusions without altering them.
- Consistent with 0019: zero-requirement question unaffected (§18).
- Consistent with 0020: no partial/joint satisfaction reintroduced.
- Consistent with 0021: Required Delivery's shape is unaffected; this
  record concerns Approval's target model only.
- Consistent with 0022: builds directly on its Required Approval vs.
  target separation (§6, §7, §9), extending rather than revisiting it.
- No Decision Record 0001–0022 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume any candidate in §8 (Asset, Quote, Delivery, Campaign,
  Brief, Order, Brand DNA) has been approved as a target type.
- Do not assume Delivery has been made automatically approvable (§15).
- Do not assume Model D (target = Required Approval) has been adopted as
  the general Approval target model (§9).
- Do not assume a live or mutable object reference is an acceptable
  Approval target (§13).
- Do not assume a new Asset "version" concept has been invented (§14) —
  0006's existing design already suffices.
- Do not assume Decision Record 0012 has been modified, or that its
  guard now depends on this record's conclusions (§17).
- Do not assume the zero-requirement legitimacy question (0019) has been
  resolved (§18).
- Do not assume a shared/bundled-target Approval model has been adopted
  (§12).
- Do not assume any physical schema, column, or identifier mechanism for
  the target model has been decided (§9, §22).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0022 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
