# Decision Record 0022 — Phase 02 Round 02B: Required Approval Logical Description & Identity

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED — at the architectural/logical level only. No
  field, table, migration, target type, or approvable business category
  is approved by this record.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0021. All remain authoritative and unchanged. This record closes
  the Required Approval shape dependency named by 0015 §8, 0016 §7,
  0017 §13/§15, and 0018, mirroring Decision Record 0021's treatment of
  Required Delivery — without resolving Decision Record 0010's own,
  independent, still-open target-type question.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service and
Package remain **UNVERIFIED** as entities, unchanged from 0013–0021, and
are not introduced here; nor is any approvable business category
(client-vs-internal semantics, approval purpose taxonomy, actor/role,
authorization, or expiry duration) — none is supported by any Decision
Record 0001–0021, and Decision Record 0010 already names these as its own
deferred items, not this record's to resolve.

## 1. Context

Decision Record 0021 resolved Required Delivery's minimum logical shape
as an opaque identity plus an optional, content-deferred description.
Required Approval carries the same open dependency (0015 §8, 0016 §7,
0017 §13/§15, 0018), but with one structural difference Decision Record
0021 did not have to address: Approval already has its own, separately
approved-in-principle **target model** (0002 D6; 0010) that is
independent of, and must not be conflated with, a Required Approval's
own identity. This record must resolve the latter without touching the
former.

## 2. Problem

Two Required Approvals in the same Order must be distinguishable, and an
actual Approval record must be able to prove which one it satisfies
(0017 §8) — without inventing approvable business categories, without
resolving Decision Record 0010's target-type set, and without confusing
"what a Required Approval obligation is" with "what an Approval record's
own target concerns."

## 3. Approved Inputs

- **0010:** Approval is a separate entity; `PENDING`/`APPROVED`/
  `REJECTED`/`CANCELLED`/`EXPIRED`; a typed target model with nullable
  target FK columns and exactly one target is approved *in principle*
  (0002 D6); the actual target-type set, physical target implementation,
  actor/role, authorization, and expiry mechanics all remain **DEFERRED**
  — none of these is touched by this record.
- **0015 §8:** a Required Approval needs *some* conceptual identity;
  exact shape DEFERRED.
- **0016 §7:** qualification for Required Approval is resolvable without
  a target type; only satisfaction was flagged as needing one.
- **0017 §8, §13, §15:** satisfaction requires a reference resolving to
  exactly one requirement; the physical identification mechanism was
  left open, explicitly named as a dependency on 0010's target-type set —
  **this record narrows, but does not close, that dependency (§6)**.
- **0018 §6, §8, §9:** multiple Required Approvals permitted; AND
  semantics; existential per-requirement satisfaction; one-record-to-one-
  requirement default.
- **0021:** Required Delivery's resolved shape — identity (mandatory) +
  description (logical slot, content deferred) — used here as
  architectural comparison only, not as a requirement that Required
  Approval be identical.

## 4. Requirement Identity

**APPROVED, mirroring 0021 §4 but independently justified:** *requirement
identity* answers "what makes this obligation distinct?" Given that no
approvable business category is approved (Governance Note) and Decision
Record 0010's target-type set is explicitly out of this record's reach,
the only information available is an **opaque, unique identifier** per
Required Approval, unique at minimum within its Order's Required Approval
collection. Two Required Approvals are distinct **purely because their
identifiers differ** — never because of an assumed difference in
eventual target type, purpose, or actor.

## 5. Requirement Description

**Distinguished from identity, mirroring 0021 §5:** a description slot
may logically exist for human-readability, but its content is
**UNVERIFIED/DEFERRED** for two independent reasons this record must
keep separate: (a) the same upstream-commercial-scope gap already
identified for Required Delivery (0013 §6, 0015 §6, 0021 §5), and (b)
Decision Record 0010's own unresolved question of what an Approval
substantively concerns at all (target type, purpose, client-vs-internal
semantics). Even once (a) is resolved, (b) could independently continue
to block meaningful description content. Neither is invented here.

## 6. Approval Target Boundary

**APPROVED — the section that keeps this record useful without
resolving Decision Record 0010:** a Required Approval's **identity**
(§4) and an eventual actual Approval record's **target** (0002 D6, 0010)
are **two distinct concepts and must not be conflated.** The Required
Approval identity exists purely to make a snapshot obligation
addressable (§4, §7); the Approval target exists to record what
real-world object or decision the formal approval concerns (0010, still
undecided). **This record does not decide**: what target types will
exist, whether "Required Approval" itself will ever become an approved
target type, or how target resolution and satisfaction-reference
resolution will ultimately relate physically. **One future convergence
path is noted, not adopted (§9, Model E):** if a future, separate
Decision Record ever adds an Order-obligation-shaped value to Decision
Record 0010's target-type set, an Approval's own target reference could
one day *be* its satisfaction reference, collapsing the two mechanisms
into one. This record keeps that door open without walking through it.

## 7. Satisfaction Reference

**APPROVED, mirroring 0021 §6 and 0017 §8/§13:** the satisfaction
reference an actual Approval record must carry is **the Required
Approval's own identity** (§4) plus the pre-existing same-Order
precondition (0017 §8.1) — **deliberately independent of, and not
requiring resolution of, Approval's own target model (§6).** This is the
concrete way this record narrows 0017 §13's dependency: identification of
"which Required Approval does this Approval satisfy" **does not need**
Decision Record 0010's target-type set to be resolved, because it uses a
separate, opaque identity channel (§4) rather than the target mechanism.
What *does* still depend on Decision Record 0010 is the *physical*
question of how that reference is implemented (a dedicated field, a
future target-type value per §6, or otherwise) — left **DEFERRED** here,
exactly as 0017 §13 already flagged, but now narrowed to a physical
question rather than a logical blocker.

## 8. Minimum Logical Shape

**APPROVED:**

```
Required Approval :=
  { identity              (opaque, unique per Order — MANDATORY, §4)
  , description            (OPTIONAL logical slot; content DEFERRED, §5)
  }

Satisfaction reference (carried by an actual Approval record) :=
  { order_reference        (same-Order precondition, per 0017 §8.1)
  , required_approval_reference  (= the Required Approval's identity, §7)
  }
```

This shape is logical only — no table, column, or physical identifier
scheme is decided (§10, §22). It is structurally identical in form to
Decision Record 0021's Required Delivery shape, adopted **because the
same minimal-information argument applies equally, not because Required
Approval is assumed identical in business content** — per the task's
explicit caution.

## 9. Candidate Models

- **A. Opaque requirement identifier only.** **Evidence:** sufficient
  alone for identity (§4) and satisfaction reference (§7); requires no
  resolution of Decision Record 0010's target-type set.
  **Contradictions:** none. **False-completion risk:** lowest.
  **Historical stability:** highest. **Dependency on 0010:** none.
  **Implementation implications:** minimal. **Classification: APPROVED**,
  the mandatory floor.
- **B. Identifier + human-readable description.** **Evidence:** adds
  usability without weakening A; description never participates in
  matching (§7). **Contradictions:** none for the slot's existence; its
  content is unsupported. **Dependency on 0010:** partial — content could
  remain undefined even after commercial scope resolves, per §5(b).
  **Classification: PROPOSAL** for the slot's existence; **UNVERIFIED/
  DEFERRED** for content.
- **C. Identifier + structured approval attributes** (approval purpose,
  actor/role, client-vs-internal flag). **Evidence:** none — this is
  exactly the approvable-business-category and actor/role territory the
  task instructs this record not to enter, and which Decision Record 0010
  already claims as its own deferred scope. **Contradictions:** direct.
  **Classification: REJECTED**, on process/scope grounds.
- **D. Live reference to an upstream commercial object.** **Evidence:**
  none; same stability problem already resolved against for Required
  Delivery (0014 §7, 0021 §8 Model D). **Classification: REJECTED as a
  live reference**; a non-live historical citation is equally speculative
  and unadopted here (**PROPOSAL/DEFERRED**, mirroring 0021 §8 Model D).
- **E. Direct identity through Approval target** (satisfaction reference
  = Approval's own target, once target types exist). **Evidence:**
  conceptually consistent with 0002 D6's typed-target-model-in-principle;
  would unify two mechanisms into one. **Contradictions:** requires
  resolving Decision Record 0010's target-type set, which this record is
  explicitly barred from doing. **Dependency on 0010:** total.
  **Implementation implications:** would eliminate the need for a
  separate satisfaction-reference field if adopted later.
  **Classification: PROPOSAL/DEFERRED** — a plausible future convergence
  path (§6), not adopted now.
- **F. Another model directly supported by approved architecture.**
  **None found.**

## 10. Selected Model / Unresolved Model

**APPROVED: Model A is the mandatory, sufficient minimum**, exactly
mirroring Decision Record 0021's conclusion for Required Delivery, for
independently-verified reasons specific to Approval (§4, §7). **Model
B's descriptive slot is adopted at the logical level only**, with content
explicitly not invented (§5). **Model E is named as a plausible future
convergence with Decision Record 0010's target model but is not adopted
or designed here** (§6, §9) — adopting it now would require resolving
0010's target-type set, which this record has no mandate to do. Models C
and D are not adopted.

## 11. Distinguishing Multiple Requirements

**APPROVED, directly answering the task's specific test:** for any two
Required Approvals R1 and R2 in the same Order, `R1 ≠ R2` holds **if and
only if their identities differ** (§4) — this holds even if both would
eventually concern the same target type, even if their descriptions are
identical or both absent, and even if no target type has been resolved
at all yet. Identity-based distinctness (§4) makes none of these
business-content questions relevant to whether R1 and R2 are different
obligations.

## 12. Multiple Approval Records

**Reaffirmed, unchanged from 0017 §8/0018 §8, no new decision:** several
actual Approval records may exist against one Required Approval over
time; satisfaction is existential — at least one correctly-referencing
Approval reaching `APPROVED` satisfies the requirement, regardless of how
many earlier `REJECTED`/`CANCELLED`/`EXPIRED`/still-`PENDING` records
exist against the same requirement. `PENDING` never satisfies (non-
terminal). Earlier unsuccessful records neither block nor need
reconciliation with a later valid `APPROVED` record. No `RETRY` state and
no reopening of a terminal Approval is introduced — 0010's existing
new-record-per-decision-cycle convention already covers this.

## 13. One Approval → One Requirement Default

**Reaffirmed, unchanged from 0018 §9:** by default, one actual Approval
record's satisfaction reference resolves to, and satisfies, exactly one
Required Approval. A future bundled-satisfaction model (one Approval
discharging several Required Approvals at once) is conceivable but **not
adopted and not designed here** — marked **DEFERRED**, consistent with
0018 §9's own treatment of the equivalent Delivery-side question.

## 14. Historical Stability

**APPROVED, mirroring 0021 §11:** a Required Approval's **identity** must
be captured once, at the Order creation boundary (§15), and never
reassigned or reused. If a description (§5) is ever populated, it must be
captured as of that same moment, never live-linked to Campaign, Brief,
Asset, Brand DNA, or pricing/configuration — a later change to any of
those must never silently redefine an existing Required Approval. This
extends the same historical-integrity principle already governing the
snapshot as a whole (0014 §14, 0015 §16, 0016 §10, 0018 §16, 0020 §13,
0021 §11). The amendment/versioning mechanism for a deliberate,
authorized change remains **FUTURE/DEFERRED**, unchanged from
0015 §17-B/0016 §12 — not designed here, per explicit instruction.

## 15. Order Creation Boundary

**Reaffirmed, unchanged from 0015 §9/0016 §9/0017/0021:** whatever
identity (and, if present, description) a Required Approval carries is
fixed at the same Order-creation capture point as the rest of the
snapshot's content. No new temporal rule is introduced.

## 16. Order Completion Interaction

**No contradiction found; Decision Record 0012 is not modified.** This
record makes explicit exactly what "correctly references" already meant
implicitly in 0017 §8/0018 §12's formula for the Approval side: a
satisfying Approval record's reference resolves to a Required Approval's
identity (§7). This is a clarification of existing vocabulary, not a new
condition.

## 17. Zero-Requirement Boundary

**Not resolved here — Decision Record 0019 is unchanged and not
re-litigated.** The shape in §8 remains structurally valid whether an
Order's Required Approval collection is empty, has one member, or has
many — an empty collection introduces no conflict with §4–§13. This
record states only that structural compatibility, not whether emptiness
is ever legitimate.

## 18. Delivery Boundary

**APPROVED — explicit non-merger, per instruction:** Required Approval
and Required Delivery remain fully independent obligation types, each
with its own identity space (0021 §4, this record §4); an identity from
one is never valid as a reference for the other. `Delivery.COMPLETED`
never satisfies a Required Approval, and `Approval.APPROVED` never
satisfies a Required Delivery — each satisfaction relationship (0017 §7
for Delivery, §7 above for Approval) is scoped strictly to its own
obligation type. This reaffirms, and does not alter, the separations
already established in 0010, 0011, 0017, and 0020.

## 19. Security Boundary

Unchanged from every prior record in this chain (0014 §20 through 0021
§16): a Required Approval's identity and any future description remain
within the Order's own tenant context, inheriting `organization_id`/
composite-FK scoping (0002 D1) once physically represented. No RLS or
authorization mechanism is designed or implemented by this record.

## 20. Financial Separation

Unchanged from every prior record in this chain: a Required Approval's
identity or description does not represent, and must not be used to
infer, Payment, Revenue, Expense, Profit, Refund, or Owner Settlement.

## 21. Rejected Alternatives

- Model C (structured approval attributes: purpose, actor/role, client-
  vs-internal) — rejected (§9); invents unapproved business categories
  and territory Decision Record 0010 already claims as its own.
- Model D as a live reference to an upstream commercial object —
  rejected (§9); reintroduces the stability problem already resolved
  against for Required Delivery.
- Model E adopted now, ahead of Decision Record 0010's target-type
  resolution — rejected as premature (§6, §9, §10); noted only as a
  future possibility.
- Conflating Required Approval identity with Approval's own target model
  — rejected outright (§6); the two are kept as distinct concepts.
- Using description content, or assumed target-type similarity, for
  satisfaction matching — rejected (§7, §11).
- Assuming two Required Approvals must differ in eventual target type or
  purpose to be distinct — rejected (§11); identity alone suffices.
- Introducing a `RETRY` state or reopening a terminal Approval to explain
  multiple attempts — rejected (§12); the existing new-record convention
  already covers this.
- Adopting bundled one-Approval-to-many-requirements satisfaction as a
  default — rejected (§13); remains DEFERRED, consistent with 0018 §9.
- Letting `Delivery.COMPLETED` or `Approval.APPROVED` cross-satisfy the
  other obligation type — rejected outright (§18).

## 22. Deferred Decisions

1. The actual content of a Required Approval's description, blocked
   independently on both upstream commercial-scope resolution and
   Decision Record 0010's own target/purpose resolution (§5).
2. Decision Record 0010's target-type set, physical target
   implementation, actor/role, authorization, and expiry mechanics — all
   unchanged, none touched by this record.
3. Whether a future convergence (Model E, §6/§9) will ever unify the
   satisfaction-reference mechanism with Approval's target model.
4. The physical mechanism implementing the satisfaction reference (§7)
   — a dedicated field, a future target-type value, or otherwise.
5. The controlled amendment/versioning mechanism governing a deliberate
   change to an existing Required Approval's identity or description
   (§14) — unchanged from 0015/0016.
6. Whether a future bundled-satisfaction model (one Approval discharging
   multiple Required Approvals) will ever be adopted (§13).
7. Any physical database representation of the shape in §8.
8. Exact tenant/RLS implementation (§19).

## 23. Final Recommendation

The minimum logical shape of a Required Approval is an opaque,
per-Order-unique **identity** (mandatory, §4) plus an optional,
content-deferred **description slot** (§5) — structurally mirroring
Decision Record 0021's Required Delivery conclusion, but independently
justified and explicitly not assumed identical in business content. The
satisfaction reference an actual Approval record must carry is exactly
that identity (§7), deliberately kept independent of, and not requiring
resolution of, Decision Record 0010's still-open target-type set — this
is the concrete mechanism by which this record remains useful without
resolving 0010. A Required Approval's identity is kept conceptually
distinct from Approval's own target (§6), with one plausible future
convergence (Model E) named but explicitly not adopted. Two Required
Approvals are distinguished purely by identity (§11), never by assumed
target type or purpose. Multiple Approval attempts and the one-Approval-
to-one-requirement default are both reaffirmed unchanged from 0017/0018
(§12, §13). Required Approval and Required Delivery remain fully
non-merging obligation types (§18). This record does not modify Decision
Record 0012 (§16) and remains structurally valid independent of whether
the Required Approval collection is ever empty (§17, deferring to 0019).

## Consistency with Decision Records 0001–0021

- Consistent with 0001/0002: introduces no schema; D6's typed-target-
  model-in-principle is referenced, not resolved or expanded (§6, §9).
- Consistent with 0003–0009: none is read by, or a source for, this
  record's shape.
- Consistent with 0010 (Approval): does not resolve target types,
  physical target implementation, actor/role, authorization, or expiry;
  explicitly keeps Required Approval identity separate from Approval's
  target (§6).
- Consistent with 0011 (Delivery): no cross-satisfaction introduced
  (§18).
- Consistent with 0012 (Completion Guard): unmodified (§16).
- Consistent with 0013/0014 (Requirements gap, source of truth): reuses,
  without contradicting, their finding that Quote/Service/Package lack
  approved content (§5).
- Consistent with 0015 (Snapshot content): supplies exactly the shape
  that record's §8 left open.
- Consistent with 0016 (Qualification): confirms and narrows its §7
  finding that satisfaction (not qualification) is the layer needing
  target-type resolution, now shown to need only a *physical* mechanism,
  not a *logical* one (§7).
- Consistent with 0017 (Satisfaction): narrows its §13 dependency
  precisely, without resolving Decision Record 0010 (§7).
- Consistent with 0018 (Cardinality/Completion Semantics): reaffirms
  existential multi-record satisfaction and the one-to-one default (§12,
  §13) without re-deciding either.
- Consistent with 0019 (Zero-Requirement Semantics): unaffected; §17
  confirms structural compatibility without resolving legitimacy.
- Consistent with 0020 (Delivery Cardinality/Partial Semantics):
  unaffected; no partial-approval concept is introduced, consistent with
  Approval having no partial/percentage state (0010).
- Consistent with 0021 (Required Delivery Shape): mirrors its method and
  structure while independently justifying every conclusion for Approval,
  per explicit instruction not to assume identity between the two.
- No Decision Record 0001–0021 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume Decision Record 0010's target-type set, physical target
  implementation, actor/role, authorization, or expiry mechanics have
  been resolved (Governance Note, §2, §6, §22).
- Do not assume a Required Approval's identity is, or must become, the
  same thing as an Approval's own target (§6) — Model E is a possibility,
  not a decision.
- Do not assume a Required Approval's description has any approved
  content (§5, §22).
- Do not assume distinctness between two Required Approvals requires a
  difference in eventual target type or purpose (§11).
- Do not assume descriptive content, or target-type similarity, is used
  for satisfaction matching (§7).
- Do not assume a live reference to an upstream commercial object has
  been adopted (§9).
- Do not assume a `RETRY` state, reopened terminal Approval, or bundled
  one-to-many satisfaction has been introduced (§12, §13).
- Do not assume `Delivery.COMPLETED` and `Approval.APPROVED` can
  cross-satisfy each other's requirement type (§18).
- Do not assume Decision Record 0012 has been modified (§16).
- Do not assume the zero-requirement legitimacy question (0019) has been
  resolved (§17).
- Do not assume any physical identifier mechanism, schema, or table has
  been decided (§8, §22).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0021 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
