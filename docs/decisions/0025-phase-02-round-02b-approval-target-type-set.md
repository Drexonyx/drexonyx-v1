# Decision Record 0025 — Phase 02 Round 02B: Approval Target-Type Set

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** PROPOSED — awaiting explicit Owner decision. The candidate
  analysis (§6–§13) and evidentiary hierarchy (§14) are complete; no
  candidate is promoted to APPROVED status by this record alone. The V1
  approvable target-type set (§15) requires an explicit Owner
  determination that this record frames but does not itself supply.
  Until that determination is made, every candidate remains at the
  classification assigned here. No schema, implementation, or physical
  design is authorized.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0024. All remain authoritative and unchanged. This record
  consolidates, deepens, and supersedes the candidate-analysis portions
  of Decision Record 0023 §8, without altering 0023's structural
  decisions (target shape, immutable-reference principle, target-type-
  set/target-shape separation). It directly addresses Decision Record
  0002 D6's statement that the target-type set "will be decided
  separately before physical schema design."

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service
and Package remain **UNVERIFIED** as entities, unchanged from 0013–0024.
No target type is promoted to APPROVED without explicit Owner decision;
no candidate is rejected without authoritative basis. The Engineering
Constitution / Operating Manual are cited by name where relevant but
have not been provided; any statement attributed solely to them is
labeled **UNVERIFIED**.

## 1. Context

Decision Record 0002 D6 established, in principle, a typed target model
for Approval (target type + target identity, Model A), while explicitly
reserving the target-type set for a later, separate decision "before
physical schema design." Decision Records 0005 (Quote), 0006 (Asset),
and 0010 (Approval) each named specific candidates as open questions
without resolving them. Decision Record 0023 confirmed the target shape
(Model A) and evaluated all known candidates, leaving every candidate
at DEFERRED or UNVERIFIED. Decision Records 0022, 0023, and 0024
established that satisfaction, target shape, and actor authority are
each independently complete without requiring the target-type set to be
resolved first. This record is the dedicated, final pre-schema analysis
of which entity types may be Approval targets in V1 — the last deferred
item 0002 D6 anticipated — and presents it for Owner decision.

## 2. Problem

Every prior decision that depends on the target-type set has deliberately
postponed it. The set is now the last architectural decision separating
the logical model from physical schema design for Approval (0002 D6,
0023 §22 item 1, 0024 §23 item 1). The problem is to determine which
of the known candidate entity types is: (a) authoritatively supported
as a V1 target, (b) authoritatively excluded, or (c) still genuinely
unresolved. The analysis must not invent business requirements, must
not promote a candidate merely because it exists as an approved entity,
and must apply the same labeling discipline used throughout this chain.

## 3. Four Identity Layers

**APPROVED distinction, per 0022–0023 (restated here to anchor
subsequent analysis):**

1. **Approval identity:** the unique identity of an Approval record
   itself (UUID v7, per 0002 D2). One Approval record = one formal
   decision event.
2. **Required Approval identity:** the unique identity of a Required
   Approval obligation within an Order's Requirements Snapshot (0022
   §4). Separate from — and independent of — the Approval record that
   satisfies it.
3. **Approval target identity:** the identity of the specific row (or
   object) that the Approval record's formal decision concerns — which
   actual Asset revision, Quote, or other entity is being approved
   (0023 §5–§6). Expressed via Model A (target type + target identity),
   per 0002 D6 and 0023 §9.
4. **Target type:** the *class* of entity the Approval target belongs
   to (e.g., "Asset", "Quote") — the discriminator that makes Model A's
   typed-target-model functional. **This is the set this record
   analyzes; it is distinct from the specific target identity (layer 3),
   the Required Approval obligation (layer 2), and the Approval record
   (layer 1).**

These four layers must remain distinct in any implementation. No record
in this chain collapses them, and this record does not collapse them.

## 4. Approved Inputs for Target-Type Analysis

- **0002 D6:** "typed target model" approved in principle; target-type
  set explicitly reserved; target set "will be decided separately before
  physical schema design."
- **0005 (Quote) Deferred Item:** "Exact Approval target relationship
  for Quote." Prohibited Assumption: "Do not assume Quote is an approved
  Approval target type."
- **0006 (Asset) Deferred Item:** "Whether Asset is a valid Approval
  target type." Prohibited Assumption: "Do not assume Asset is an
  approved Approval target type."
- **0010 (Approval) Deferred Items 1–2:** "Exact approvable target
  types" and "Exact target model/database representation."
- **0011 (Delivery) Deferred Item 9:** "Exact Approval ↔ Delivery
  relationship." §8 states that Delivery does not own approval/
  authorization outcomes; if client acceptance is required, "it is an
  Approval-relationship dependency … with exact orchestration
  **DEFERRED**."
- **0023 §8:** full candidate inventory (Asset, Quote, Delivery,
  Campaign, Brief, Order, Brand DNA) with evidentiary standing assessed;
  no candidate promoted to APPROVED; §15 prohibits doing so here without
  the dedicated decision 0002/0010 anticipated.
- **0023 §13:** immutable-reference principle — any approved target must
  identify an immutable, historically fixed row; never a live or mutable
  concept. **This is an existing approved constraint that applies to any
  candidate the Owner promotes.**
- **0023 §14:** Asset already satisfies §13 via 0006's row-per-revision
  design; no new versioning concept needed.
- **0024:** actor/authority boundaries — who may create and decide
  Approvals — established independently of the target-type set.

## 5. Candidate Inventory

**FACT:** the following candidates appear in Decision Records 0001–0024
with some form of documented relationship to the Approval target
question. No candidate is added by this record; no candidate is omitted
that appears in prior records.

| Candidate | Status in 0023 | Evidentiary Basis |
|---|---|---|
| Asset | DEFERRED | Explicitly named by 0006 itself |
| Quote | DEFERRED | Explicitly named by 0005 itself |
| Delivery | DEFERRED + caution | Named by 0011 as open dependency |
| Campaign | UNVERIFIED | Absent from any target-type discussion |
| Brief | UNVERIFIED | Absent from any target-type discussion |
| Order | UNVERIFIED | Discussed as completion-guard consumer only |
| Brand DNA | UNVERIFIED | Appears only in 0002 D3 versioning context |

Production Job (0008) and AI Generation (0009) do not appear in any
Decision Record 0001–0024 as Approval target candidates. No evidence
supports adding them here; they are neither evaluated nor implicitly
excluded — their relationship to the target-type question is simply
undiscussed.

## 6. Asset as Candidate

**Evidentiary standing: strongest of all candidates — DEFERRED.**

- **FACT:** Decision Record 0006 itself identifies "Whether Asset is a
  valid Approval target type" as a Deferred Item, and explicitly
  prohibits assuming it is. This is the strongest possible evidentiary
  signal short of an authoritative affirmative decision: the question
  was anticipated, named, and deferred within Asset's own governing
  record — not merely absent from it.
- **FACT:** Decision Record 0023 §14 confirmed that Asset already
  satisfies the immutable-reference principle (0023 §13) via 0006's
  row-per-revision design. An Approval targeting a specific Asset
  revision row requires no new versioning concept. Structural
  compatibility with §13 is **CONFIRMED**.
- **FACT:** Decision Record 0006's Asset lifecycle includes states
  (`READY_FOR_QC`, `CLIENT_PREVIEW`) that imply a progression toward
  client review — language that is consistent with, but does not
  authoritatively establish, a formal Approval step on Asset.
- **INFERENCE:** of all candidate types, Asset is the most likely V1
  Approval target, given the convergence of: (a) explicit anticipation
  in 0006, (b) immutable-reference compatibility already confirmed in
  0023, and (c) a lifecycle that progresses toward external review.
  This INFERENCE does not constitute approval.
- **Not resolved here:** whether Asset is approved as a V1 Approval
  target requires explicit Owner decision. **Status: DEFERRED.**

## 7. Quote as Candidate

**Evidentiary standing: equally strong as Asset — DEFERRED.**

- **FACT:** Decision Record 0005 itself identifies "Exact Approval
  target relationship for Quote" as a Deferred Item, and explicitly
  prohibits assuming Quote is an approved Approval target type. Same
  evidentiary standing as Asset (§6): anticipated, named, deferred
  within Quote's own governing record.
- **FACT:** Decision Record 0005 Boundary 5 establishes that Quote
  follows a cancel-and-new pattern rather than in-place editing.
  Decision Record 0023 §13 cited this explicitly as satisfying the
  immutable-reference principle. Structural compatibility with §13 is
  **CONFIRMED**.
- **FACT:** Quote governs pricing agreements; the business logic of
  client approval of a pricing commitment is coherent, though no
  authoritative document states it is a V1 requirement.
- **INFERENCE:** Quote's standing is equivalent to Asset's: explicitly
  anticipated as a candidate, structurally compatible, but not yet
  authoritatively approved.
- **Not resolved here:** whether Quote is approved as a V1 Approval
  target requires explicit Owner decision. **Status: DEFERRED.**

## 8. Delivery as Candidate

**Evidentiary standing: named dependency — DEFERRED with explicit
caution.**

- **FACT:** Decision Record 0011 Deferred Item 9 names "Exact Approval
  ↔ Delivery relationship" as unresolved. Decision Record 0011 §8
  explicitly states that Delivery does not own approval/authorization
  outcomes, and that if client acceptance is required, it is an
  "Approval-relationship dependency" with "exact orchestration
  DEFERRED."
- **FACT:** Decision Record 0023 §15 states: "Delivery is **not** made
  automatically approvable by this record" — an explicit, instruction-
  driven exclusion from automatic adoption. **This caution is reaffirmed
  unchanged here.**
- **ASSESSMENT — immutable-reference compatibility:** Decision Record
  0011's Delivery lifecycle does not include an explicit row-per-revision
  or cancel-and-new design pattern equivalent to Asset's (0006) or
  Quote's (0005). Whether Delivery rows are sufficiently immutable for
  Approval targeting — i.e., whether a Delivery record, once created,
  identifies a stable object whose identity remains historically fixed
  — is not established by any Decision Record 0001–0024. This is a
  necessary prerequisite for any future approval of Delivery as a
  target type, per 0023 §13, and it remains **unverified for Delivery
  specifically**.
- **Not resolved here:** whether Delivery is approved as a V1 Approval
  target requires explicit Owner decision *and* confirmation of
  immutable-reference compatibility. **Status: DEFERRED (with
  immutable-reference compatibility unconfirmed).**

## 9. Campaign as Candidate

**Evidentiary standing: no discussion as a target — UNVERIFIED.**

- **FACT:** No Decision Record 0001–0024 mentions Campaign as a
  candidate Approval target type. Decision Record 0023 confirmed this
  via full-text review ("Campaign never appears in that context").
- **ASSESSMENT — immutable-reference compatibility:** Decision Record
  0003 governs the Campaign state machine. Campaigns move through
  lifecycle states (including a `CANCELLED` terminal state and a
  potentially terminal `APPROVED` state in the Campaign's own
  lifecycle). The Campaign state machine does not establish a row-per-
  revision design equivalent to Asset's. Whether Campaign rows are
  sufficiently stable for Approval targeting per 0023 §13 is not
  established. **Unverified.**
- **ASSESSMENT — Brief's own APPROVED state:** The Campaign lifecycle's
  own states are separate from the Approval entity. A Campaign having a
  lifecycle state called `APPROVED` (in its own state machine) does not
  constitute evidence that a separate Approval record has ever targeted
  a Campaign row.
- **Not resolved here:** no authoritative basis exists to approve or
  reject Campaign as a target type. **Status: UNVERIFIED.**

## 10. Brief as Candidate

**Evidentiary standing: no discussion as a target — UNVERIFIED.**

- **FACT:** No Decision Record 0001–0024 mentions Brief as a candidate
  Approval target type. Decision Record 0023 confirmed this via full-
  text review.
- **ASSESSMENT — Brief's own APPROVED state:** Decision Record 0004
  includes an `APPROVED` state within Brief's own lifecycle state
  machine. This is a Brief-lifecycle value governing Brief's own
  progression — it is not a statement that a separate Approval entity
  targets a Brief row. The two are distinct: a Brief can reach its own
  `APPROVED` lifecycle state via a process not governed by the Approval
  entity, or via one — the two are compatible but the prior records do
  not establish which. The existence of a lifecycle `APPROVED` state in
  Brief is therefore **not evidence for or against Brief as an Approval
  target.**
- **Not resolved here:** no authoritative basis exists to approve or
  reject Brief as a target type. **Status: UNVERIFIED.**

## 11. Order as Candidate

**Evidentiary standing: no discussion as a target; structural
observation — UNVERIFIED.**

- **FACT:** No Decision Record 0001–0024 discusses Order as a candidate
  Approval target type. Decision Record 0023 confirmed this via full-
  text review. Order is discussed extensively as the *consumer* of
  Approval outcomes (via the Order completion guard — DR 0007, 0012,
  0014–0022), never as the object an Approval record's formal decision
  *concerns*.
- **STRUCTURAL OBSERVATION (INFERENCE — not a rejection):** Order is the
  aggregate whose completion depends, in part, on Approvals being
  satisfied. If Order itself were an Approval target type, the system
  would need a mechanism to distinguish: (a) an Approval that concerns
  the Order-as-a-whole (targeting Order) vs. (b) Approvals that concern
  specific elements *within* the Order (targeting Asset, Quote, etc.)
  and that collectively contribute to Order completion. This structural
  distinction is not established in any prior Decision Record and is
  not resolved by this one. The observation is recorded as an open
  question, not a reason to reject Order, since no authoritative source
  excludes it.
- **Not resolved here:** no authoritative basis exists to approve or
  reject Order as a target type. **Status: UNVERIFIED.**

## 12. Brand DNA as Candidate

**Evidentiary standing: appears only in versioning context — UNVERIFIED.**

- **FACT:** Decision Record 0002 D3 mentions Brand DNA in the context
  of versioning (brand guidelines, brand taxonomy). No Decision Record
  0001–0024 discusses Brand DNA as a candidate Approval target type.
  Decision Record 0023 confirmed this via full-text review.
- **ASSESSMENT — immutable-reference compatibility:** 0002 D3
  establishes that Brand DNA is versioned (brand guidelines are
  versioned). Versioned rows are naturally compatible with the
  immutable-reference principle (0023 §13), since each version is a
  distinct row. However, compatibility with §13 is a necessary
  condition for being an Approval target, not a sufficient one. No
  authoritative source establishes that Brand DNA changes require formal
  Approval records.
- **Not resolved here:** no authoritative basis exists to approve or
  reject Brand DNA as a target type. **Status: UNVERIFIED.**

## 13. Other Candidates

**Production Job (0008) and AI Generation (0009):**

Neither entity appears in any Decision Record 0001–0024 in the context
of Approval targets. Decision Record 0010 separates Approval from
provider-specific AI states (`HIGGSFIELD_APPROVED`, `AI_APPROVED`,
`GENERATION_APPROVED` — all explicitly rejected in 0010 § Rejected
Alternatives), which is evidence against AI Generation or Production
Job being Approval targets in the sense this architecture uses the
term, though it is not a formal decision. **Status: UNVERIFIED.** No
further analysis is warranted by this record, since neither entity has
any documented Approval-target relationship.

## 14. Evidentiary Hierarchy

**APPROVED analytical output — ranking by strength of authoritative
basis, not by likelihood of business adoption:**

**Tier 1 — Explicitly anticipated by the candidate entity's own
governing record:**
- Asset (0006 Deferred Item + Prohibited Assumption)
- Quote (0005 Deferred Item + Prohibited Assumption)

Both entities' own Decision Records name the target-type question as
an explicitly open item. This is the strongest evidentiary signal: the
question was foreseen and deliberately preserved, not merely absent.

**Tier 2 — Named as an open dependency by a directly related record:**
- Delivery (0011 Deferred Item 9; 0023 §15 explicit caution against
  automatic adoption)

Delivery is named as an open dependency in the context of the Approval
↔ Delivery orchestration. It is not a "forgotten" candidate — it is
a known dependency held open because the orchestration relationship
is itself unresolved.

**Tier 3 — Absent from any Approval-target discussion in 0001–0024:**
- Campaign, Brief, Order, Brand DNA (and Production Job, AI Generation)

These entities are not discussed as Approval target candidates anywhere
in Decision Records 0001–0024. Their absence is documented (0023
confirmed via full-text review for the first four), not merely assumed.
This does not make them invalid business candidates — it means no
authoritative architectural decision has yet addressed them in that role.

**The evidentiary hierarchy does not authorize any candidate.** It
establishes the relative strength of the evidentiary basis for each,
which should inform the Owner's decision about which to resolve first.

## 15. V1 Approvable Target-Type Set — Current Determination

**The V1 approvable target-type set is currently UNDETERMINED.**

No Decision Record 0001–0024 authorizes this record to unilaterally
promote any candidate to APPROVED status:

- Decision Record 0002 D6 reserved the target-type set explicitly for
  a separate decision.
- Decision Record 0010 listed target types as Deferred Item 1 without
  supplying the needed authoritative input.
- Decision Record 0023 §8 evaluated all known candidates and confirmed
  none could be promoted without "the dedicated decision 0002/0010 both
  anticipated."
- This record, as a PROPOSED record, cannot by itself supply the
  authoritative Owner decision that the above records anticipated.

**What this record does supply:**
- A consolidated, rigorous evidentiary analysis of all known candidates
  (§6–§13) with their exact evidentiary standing.
- Confirmation that Asset (§6) and Quote (§7) are Tier 1 candidates
  with the strongest evidentiary basis and confirmed immutable-reference
  compatibility.
- Confirmation that Delivery (§8) is a Tier 2 candidate with an
  immutable-reference compatibility question still unresolved.
- Confirmation that Campaign, Brief, Order, Brand DNA (§9–§12) are
  Tier 3 candidates with no evidentiary basis in the target-type
  context.
- The Owner may, upon reviewing this record, designate which candidates
  are APPROVED as V1 target types. Any such designation:
  (a) must be explicitly stated in an Owner decision;
  (b) applies the immutable-reference constraint of 0023 §13 to the
      designated type;
  (c) does not authorize physical schema, only the logical designation;
  (d) for Delivery specifically, must also address the immutable-
      reference compatibility question raised in §8.

## 16. Compatibility with DR 0022 (Satisfaction)

**No conflict — DR 0022 explicitly established independence.**

Decision Record 0022 §7 decoupled Required Approval satisfaction from
the Approval target model: satisfaction uses a reference to the Required
Approval's own identity, independent of what the Approval's target is.
Decision Record 0023 §7 reaffirmed this independence. Resolving (or
not resolving) the target-type set therefore has **no effect on the
satisfaction mechanism or on Order completion guard evaluation**
(DR 0012, 0018). The target-type set determines what an Approval
*concerns* — it does not determine how the resulting APPROVED record
*counts toward* a Required Approval obligation.

## 17. Compatibility with DR 0023 (Target Model)

**Full compatibility — this record operates within 0023's framework.**

Decision Record 0023 §10 established the structural conclusion that
the target *shape* (Model A) and the target *type set* are two separate
decisions, and that resolving the shape must not be read as resolving
the set. This record resolves neither — it analyzes the candidates that
would populate the set, and presents that analysis for Owner decision.
The immutable-reference principle (0023 §13) is an existing constraint
that this record applies, not modifies, when assessing each candidate's
compatibility (§6–§13). No finding in this record revisits, contradicts,
or supplements 0023's structural decisions.

## 18. Compatibility with DR 0024 (Actor Authority)

**No conflict — actor authority is orthogonal to target type.**

Decision Record 0024 §13 established that role authority at the RBAC
level is independent of which target type is eventually approved; it
noted explicitly that "role-per-target-type mapping" is DEFERRED (0024
§23 item 1) pending this record's analysis and Owner decision. Once the
Owner designates specific target types as APPROVED, the role-per-target-
type mapping — which roles hold creation and decision authority for which
specific types — may then be addressed in a successor decision. That
successor decision would apply 0024's already-established role
framework to each approved type, without needing to revisit 0024's
structural principles.

## 19. Order Completion Implications

**No change to Decision Record 0012.**

Decision Record 0022's satisfaction mechanism is already independent of
the target-type set (§16). Whether the target-type set is resolved or
not, the Order `ACTIVE` → `COMPLETED` guard's evaluation is unaffected:
the guard asks whether each Required Approval is satisfied by an APPROVED
Approval record, not what that Approval record targets. Resolving the
target-type set will determine *what real-world objects Approval records
may concern* — it will not change how many Required Approvals must be
satisfied, how satisfaction is tested, or what "APPROVED" means in the
guard context. DR 0012 is unaffected.

## 20. Zero-Requirement Interaction

**Not resolved here — Decision Record 0019 unchanged.**

The target-type set applies only to Approval records that actually exist.
If an Order's Required Approval collection is empty, the zero-requirement
blocking posture (0019 §9) applies regardless of which target types are
approved. No conflict arises.

## 21. Historical Integrity

**Reaffirmed, unchanged from 0014 §14/0015 §16 through 0024 §19:**
once an Approval record's target reference is established (pointing to a
specific row of whatever type), that reference is fixed and historically
immutable, per 0023 §13. Designating a target type as APPROVED does not
retroactively alter any existing Approval record's target reference, nor
does it alter the Required Approval obligations in any existing Order
Requirements Snapshot. The designation affects only future Approval
records created after the designation takes effect.

## 22. Security / Tenancy

**APPROVED principle, consistent with 0002 D1, 0023 §19, 0024 §20:**
whatever target types are eventually approved, the referenced target row
must belong to the same organization as the Approval record and the
Order it ultimately serves. Cross-tenant target references are never
permitted. This constraint applies to every candidate in §6–§13
identically; it is a mandatory prerequisite for any type's approval,
not a per-type decision.

## 23. Financial Separation

Unchanged from every prior record: the designation of target types
does not represent, and must not be used to infer, Payment, Revenue,
Expense, Profit, Refund, or Owner Settlement. An Approval targeting
an Asset, Quote, Delivery, or any other entity has no direct financial
consequence per the architecture, regardless of which entity type is
approved.

## 24. Rejected Alternatives

- Promoting any candidate to APPROVED without explicit Owner decision
  — rejected; no Decision Record 0001–0024 authorizes this record to
  make that determination unilaterally, and doing so would resolve
  the reserved question 0002 D6 and 0010 both explicitly anticipated
  as a separate decision.
- Rejecting Campaign, Brief, Order, or Brand DNA as structurally
  impossible — rejected; no authoritative basis exists to exclude them,
  and their absence from the target-type discussion is an evidentiary
  gap, not a ruling.
- Treating the evidentiary hierarchy (§14) as authorization — rejected;
  Tier 1 standing means the question was anticipated, not that the
  answer is affirmative.
- Adding Production Job or AI Generation as new candidates without
  authoritative basis — rejected; no Decision Record 0001–0024 positions
  either as an Approval target candidate.
- Inventing a classification field ("client-facing target", "internal
  target") on Approval records to distinguish target types — rejected;
  0024 §8 established that client vs. internal semantics are expressed
  through the decision-maker role, not a structural category, and this
  record does not revisit that conclusion.
- Resolving Delivery's immutable-reference compatibility question without
  evidence — rejected; §8 identifies it as an open prerequisite, not
  a resolved one.
- Treating Brief's own lifecycle `APPROVED` state as evidence that Brief
  is an Approval target — rejected (§10); those are separate concepts
  in separate entities.

## 25. Deferred Decisions

1. **Owner designation of the V1 target-type set** — the central
   deliverable this record frames but cannot itself supply. Each
   candidate's current classification:
   - Asset: DEFERRED (Tier 1; immutable-reference compatible) → awaits
     Owner "APPROVED" or "excluded from V1."
   - Quote: DEFERRED (Tier 1; immutable-reference compatible) → awaits
     Owner "APPROVED" or "excluded from V1."
   - Delivery: DEFERRED (Tier 2; immutable-reference compatibility
     unconfirmed) → awaits Owner decision *and* immutable-reference
     compatibility confirmation.
   - Campaign: UNVERIFIED → awaits authoritative basis and Owner
     decision.
   - Brief: UNVERIFIED → awaits authoritative basis and Owner decision.
   - Order: UNVERIFIED → awaits authoritative basis and Owner decision.
   - Brand DNA: UNVERIFIED → awaits authoritative basis and Owner
     decision.
2. **Delivery immutable-reference compatibility** — whether Delivery rows
   are sufficiently historically fixed for Approval targeting per
   0023 §13 (§8 above).
3. **Role-per-target-type mapping** — once the Owner designates specific
   types, the application of 0024's actor/authority framework to each
   type (0024 §23 item 1).
4. **Physical database representation** of the target model for each
   approved type — column layout, FK constraints, CHECK constraints
   (unchanged from 0023 §22 item 6).
5. **Tenant/RLS enforcement** specific to the approved target type(s)
   (unchanged from 0023 §22 item 7 and 0024 §23 item 9).
6. **Exact expiration and cancellation mechanics** per approved target
   type (unchanged from 0010, 0024 §23 items 6, 5).
7. **Workflow routing** — how PENDING Approvals are delivered to the
   appropriate decision-maker for each target type (0024 §23 item 4).
8. Whether any of Campaign, Brief, Order, Brand DNA, Production Job, or
   AI Generation will ever be analyzed as target candidates (§9–§13).

## 26. Final Recommendation

**PROPOSED — presented for Owner decision.**

The V1 approvable target-type set cannot be determined by this record
alone; it requires an explicit Owner designation. The analytical
preparation for that decision is complete:

- **Asset and Quote** are the strongest evidentiary candidates (Tier 1
  — each explicitly named as an open question by their own governing
  record, each confirmed compatible with the immutable-reference
  principle). They are the recommended starting point for the Owner's
  decision.
- **Delivery** is an established dependency (Tier 2) but carries an
  additional prerequisite — immutable-reference compatibility must be
  confirmed before it can be designated as an approved type.
- **Campaign, Brief, Order, Brand DNA** have no evidentiary basis in
  the target-type context; they are neither excluded nor advanced by
  this record.
- **The immutable-reference principle (0023 §13) is a mandatory
  constraint on any type the Owner designates.** Asset and Quote
  satisfy it; Delivery does not yet have confirmation; others are
  unassessed.
- **None of these decisions affects the Order completion guard (DR
  0012), satisfaction mechanics (DR 0022), target shape (DR 0023), or
  actor authority boundaries (DR 0024).** All four are structurally
  complete and independent of which target types are eventually
  approved.

Once the Owner designates the approved type(s), a successor record may
establish the role-per-target-type mapping (applying DR 0024's framework)
and authorize physical schema design for Approval (fulfilling DR 0002
D6's anticipation of a separate target-type decision before schema work).

## Consistency with Decision Records 0001–0024

- Consistent with 0001/0002: introduces no schema, no new entity, no
  new role; D1 tenant-scope constraint is a prerequisite for any
  approved type (§22); D2 UUID identity unaffected; D6's reservation
  of the target-type set is directly honored by not resolving it
  unilaterally.
- Consistent with 0003/0004 (Campaign, Brief): both remain UNVERIFIED
  as target candidates; their state machines are not modified.
- Consistent with 0005 (Quote): reaffirms its explicit open question
  as Tier 1; the cancel-and-new pattern confirms §13 compatibility.
- Consistent with 0006 (Asset): reaffirms its explicit open question
  as Tier 1; 0023 §14's immutable-reference confirmation is restated.
- Consistent with 0007 (Order): remains UNVERIFIED as a target
  candidate; its role as completion-guard consumer is unaffected.
- Consistent with 0008/0009 (Production Job, AI Generation): neither
  is introduced as a target candidate; DR 0010's explicit rejection of
  provider-specific states is noted (§13).
- Consistent with 0010 (Approval): directly addresses Deferred Items 1
  and 2 (target types, target model) in analysis form; promotes no
  candidate without the authoritative input 0010 anticipated.
- Consistent with 0011 (Delivery): reaffirms Deferred Item 9 and 0023
  §15's explicit caution; adds the immutable-reference compatibility
  question (§8) as a prerequisite not yet assessed.
- Consistent with 0012 (Completion Guard): unaffected (§19).
- Consistent with 0013/0014/0015: Order Requirements Snapshot
  unaffected; upstream commercial content still unapproved.
- Consistent with 0016/0017/0018: qualification and satisfaction
  mechanics unaffected (§16).
- Consistent with 0019: zero-requirement blocking posture unaffected
  (§20).
- Consistent with 0020/0021: Required Delivery and Delivery cardinality
  unaffected.
- Consistent with 0022: satisfaction decoupled from target type
  confirmed (§16); no Required Approval identity mechanism altered.
- Consistent with 0023: consolidates and deepens §8's candidate
  analysis without altering §9 (Model A), §13 (immutable-reference),
  §10 (shape/type separation), or any other structural finding.
- Consistent with 0024: actor authority framework confirmed as
  orthogonal and independent (§18); role-per-target-type mapping
  correctly named as the next downstream dependency (§18, §25 item 3).
- No Decision Record 0001–0024 is modified, reinterpreted, or
  superseded by this record.

## Explicitly Prohibited Assumptions

- Do not assume any candidate (Asset, Quote, Delivery, Campaign, Brief,
  Order, Brand DNA) has been approved as a V1 Approval target type by
  this record — none has (§15).
- Do not assume Tier 1 evidentiary standing (Asset, Quote) constitutes
  approval — it describes the strength of the evidence that the question
  is open, not that the answer is affirmative (§14).
- Do not assume Delivery has been made approvable by this record; the
  caution from 0023 §15 is reaffirmed (§8).
- Do not assume Brief's own lifecycle `APPROVED` state means Brief is
  an Approval target type (§10).
- Do not assume Order has been assessed as a target type — it remains
  UNVERIFIED (§11).
- Do not assume Production Job or AI Generation are Approval target
  candidates — they are undiscussed, not excluded (§13).
- Do not assume the immutable-reference principle (0023 §13) has been
  waived for any candidate not yet assessed against it.
- Do not assume DR 0012's Order completion guard has been modified by
  this record (§19).
- Do not assume DR 0022's satisfaction mechanism is altered by or
  depends on the target-type set (§16).
- Do not assume DR 0023's target-shape decision (Model A) has been
  changed (§17).
- Do not assume DR 0024's actor authority boundaries are modified,
  extended, or contradicted by this record (§18).
- Do not assume any financial event is triggered by an Approval's target
  type (§23).
- Do not assume this record authorizes physical schema design for
  Approval — 0002 D6 requires an Owner-designated target-type set
  before schema work; this record provides the analysis for that
  designation, not the designation itself (§15).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0024 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
