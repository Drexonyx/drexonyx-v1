# Decision Record 0031 — Phase 02 Round 02B: Approval Target-State Precondition

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** PROPOSED — awaiting explicit Owner approval. If the Owner
  approves this record, the evidentiary conclusions in §6–§10 become
  authoritative: (1) `CLIENT_PREVIEW` cannot be promoted to a formal
  APPROVED pre-condition constraint from existing evidence and remains
  DEFERRED; (2) `SENT` cannot be promoted to a formal APPROVED pre-condition
  constraint from existing evidence and remains DEFERRED; (3) the per-state
  INFERENCE observations in §7 and §9 are the current ceiling of what the
  evidence supports. No schema, migration, or implementation is authorized.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0030. All remain authoritative and unchanged. This record directly
  addresses DR 0030 §20 items 1, 2, 4, and 5 — the per-type formal
  pre-condition deferrals and per-state analyses — by evaluating whether
  the INFERENCE-level observations documented in DR 0030 §8.3 and §9.3
  can be promoted to formal APPROVED constraints. It concludes they cannot,
  explains the evidentiary gap, and frames what an explicit Owner decision
  would need to supply to close these items.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service
and Package remain **UNVERIFIED** as entities, unchanged from
0013–0030. This record does not claim Owner approval; it proposes
Owner approval of the evidentiary conclusions in §6–§10.

## 1. Context

Decision Record 0030 §8.3 and §9.3 documented INFERENCE-level
observations that `CLIENT_PREVIEW` is the natural target state for
Asset-targeting Approvals, and `SENT` is the natural target state for
Quote-targeting Approvals. Both were explicitly held as INFERENCE —
not promoted to APPROVED formal constraints — because DR 0028 §10
items 2 and 7 had explicitly deferred the formal pre-condition question,
and because the evidence was characterized as "strong evidence favoring"
rather than "an authoritative rule establishing."

This record is specifically tasked with evaluating whether those
inferences can now be promoted. The governing instruction is direct:
"If CLIENT_PREVIEW cannot be promoted to an APPROVED formal prerequisite
from existing evidence, keep it DEFERRED." This record performs that
evaluation, state by state, and states the verdict for each.

## 2. Objective and Evidentiary Standard

### 2.1 Objective

Determine, for each Asset lifecycle state and each Quote lifecycle
state, whether an authoritative Decision Record 0001–0030 supplies
sufficient evidence to establish a formal constraint: either (a) an
Approval MAY target an Asset/Quote row in that state, or (b) an
Approval may NOT target an Asset/Quote row in that state.

Where the evidence reaches that threshold, the constraint is labeled
APPROVED. Where it does not, the state's eligibility as a target state
remains DEFERRED, with the specific evidentiary gap documented.

### 2.2 Evidentiary Standard

**APPROVED classification requires:** a direct statement in an
authoritative Decision Record 0001–0030 that establishes a rule about
Approval target eligibility relative to a specific lifecycle state.
Forms include:

- An explicit prohibition: "An Approval may not target an Asset in
  state X."
- An explicit permission: "An Approval may target an Asset in state X."
- An explicit constraint: "An Asset must be in state X before it can
  be an Approval target."
- A structural consequence that necessarily entails such a rule
  (not just a characterization of the natural workflow).

**INFERENCE classification applies to:** evidence that describes the
*natural workflow* or *expected sequence* without establishing a formal
gate constraint. Characterizations, definitions of state purposes,
and workflow descriptions are inference-grade evidence even when strong.
They tell us what is expected to happen; they do not establish what is
prohibited from happening.

**The gap between the two:** a record stating "Asset status remains
`CLIENT_PREVIEW` after a successful client-facing review" (DR 0006)
describes a boundary (Approval decisions don't advance Asset state) and
implies the natural workflow context (the review happens at CLIENT_PREVIEW).
It does not state "An Approval may only be created for an Asset in
CLIENT_PREVIEW." These are logically distinct propositions; the second
does not follow as a necessary consequence of the first.

### 2.3 Concept Distinctions

Four related concepts are kept separate throughout this record:

1. **Target-type eligibility:** whether Asset or Quote (as a *type*) is
   a valid Approval target type. **APPROVED** by DR 0028 for both types.
   This is about the category, not a specific row.

2. **Target existence:** whether the specific Asset or Quote row exists
   as of the Approval creation event. **APPROVED** from DR 0030 §6
   item 2 (derived from DR 0023 §13): the row must exist before it can
   be referenced. This is the only formally established eligibility
   constraint beyond type designation.

3. **Target usability:** whether an existing Asset or Quote row in a
   *specific lifecycle state* may be the target of a new Approval record.
   **DEFERRED** — this is precisely what this record evaluates and finds
   it cannot resolve from existing evidence alone.

4. **Target-state precondition:** the formal rule (if any) constraining
   target usability to specific states. **DEFERRED** — the question this
   record addresses.

These four concepts are not collapsed. This record addresses concepts
3 and 4 and finds both remain DEFERRED beyond the existence constraint
already established.

## 3. Governing Sources

**APPROVED sources:**

- **DR 0006** — Asset state machine (UPLOADED, PROCESSING, READY_FOR_QC,
  CLIENT_PREVIEW, REVISION_REQUIRED, REJECTED; transitions; QC Boundary;
  Approval/Delivery Boundary).
- **DR 0005** — Quote state machine (DRAFT, SENT, ACCEPTED, REJECTED,
  EXPIRED, CANCELLED; transitions; SENT definition; Boundary 2; Boundary 5).
- **DR 0010** — Approval state machine; Target Boundary; Revision Separation.
- **DR 0023** — Immutable-reference principle (§13); Asset revision boundary
  (§14).
- **DR 0028** — Asset and Quote designation; §10 items 2 and 7 (explicit
  deferrals of pre-conditions).
- **DR 0029** — Role authority mapping; QC creation authority for Asset (§7.1);
  CREATIVE/PROD creation authority for Asset (§7.1).
- **DR 0030** — Target identity fixation (§6); temporal ordering (§7); Asset
  revision implications (§10); Quote cancel-and-replace implications (§11);
  lifecycle independence (§12, §13); per-state INFERENCE observations (§8.3,
  §9.3).

## 4. Scope of This Record

**This record:**

1. Evaluates whether `CLIENT_PREVIEW` can be promoted from INFERENCE to
   a formal APPROVED pre-condition for Asset-targeting Approval creation
   (§6).
2. Analyzes each Asset lifecycle state individually for target usability
   (§7).
3. Evaluates whether `SENT` can be promoted from INFERENCE to a formal
   APPROVED pre-condition for Quote-targeting Approval creation (§8).
4. Analyzes each Quote lifecycle state individually for target usability
   (§9).
5. States the combined conclusion (§10) and frames what explicit Owner
   decisions would be needed to close the deferrals (§11).

**This record does NOT:**

- Establish any formal pre-condition constraint (the evidence does not
  support this).
- Introduce new Asset states, Quote states, or Approval states.
- Resolve revision/cancellation orchestration (already confirmed DEFERRED
  in DR 0030 §20 items 3 and 7; not addressed here).
- Resolve temporal ordering between Approval decision and Quote state
  transition (DR 0030 §20 item 6; not addressed here).
- Design schema, migrations, or implementation of any kind.
- Introduce new roles or permissions.

## 5. Established Baseline: Existence Constraint

**APPROVED (reaffirmed from DR 0030 §6 item 2, DR 0023 §13):**

The only formally established constraint on target usability beyond
type-eligibility is the existence constraint: the specific Asset or
Quote row must exist as a created, persisted row before it can be
referenced as an Approval target. A row that does not yet exist cannot
be targeted. This constraint follows necessarily from the immutable-
reference principle (DR 0023 §13) — you cannot hold a fixed reference
to a non-existent row.

**This constraint is already APPROVED and is not in question.** The
question this record evaluates is whether, beyond existence, any state-
based constraint can also be established.

**Conclusion: no state-based constraint can be promoted from current
evidence.** The following sections explain why, state by state.

## 6. Asset — Evaluation of CLIENT_PREVIEW as Formal Pre-Condition

### 6.1 Evidence Inventory

**FACT (DR 0006, Approved States):** Asset's six approved lifecycle
states are: `UPLOADED`, `PROCESSING`, `READY_FOR_QC`, `CLIENT_PREVIEW`,
`REVISION_REQUIRED`, `REJECTED`.

**FACT (DR 0006, Approval/Delivery Boundary):** "Asset status remains
`CLIENT_PREVIEW` after a successful **client-facing** review —
approval and delivery are represented through their respective entities,
not through further Asset-state advancement."

**FACT (DR 0030 §8.1, reading DR 0006):** this statement makes two
claims: (a) the client-facing review event occurs when the Asset is
in `CLIENT_PREVIEW`; (b) the Approval decision does not advance the
Asset's `status` column. Claim (b) is a boundary rule (APPROVED).
Claim (a) is a characterization of the natural context.

**FACT (DR 0029 §7.1):** QC creation authority for Asset-targeting
Approvals is APPROVED, grounded in DR 0024 §6: "QC actors may initiate
an Approval request for a target that has passed QC review, routing it
to a formal decision-maker as a handoff." Asset passes QC review
precisely on entry to `CLIENT_PREVIEW`.

**FACT (DR 0029 §7.1):** CREATIVE/PRODUCTION creation authority for
Asset-targeting Approvals is also APPROVED — "CREATIVE/PRODUCTION actors
produce the work that is submitted for approval. They are the natural
initiators of Approval requests for the output of their own production
activity (e.g., submitting a completed deliverable for review)."
DR 0029 does not attach a state restriction to CREATIVE/PRODUCTION's
creation authority.

**FACT (DR 0028 §10 item 2):** "Pre-condition on Asset state at
targeting time: which Asset lifecycle states are valid target states
(e.g., must the Asset be in `CLIENT_PREVIEW`? any state? DEFERRED)."
This explicit deferral is from DR 0028, an APPROVED record (subject to
Owner approval). The question was recognized and deliberately set aside
as a downstream governance decision.

### 6.2 Evidentiary Gap

**ANALYSIS:**

The strongest evidence for CLIENT_PREVIEW as the formal pre-condition
is the DR 0006 Approval/Delivery Boundary statement: "Asset status
remains `CLIENT_PREVIEW` after a successful client-facing review."

This statement is APPROVED in DR 0006. However, it is a boundary rule
of the form: "Approval decisions do not write to Asset's status column;
Asset stays in CLIENT_PREVIEW." It is not a pre-condition rule of the
form: "An Approval may only be created for an Asset in CLIENT_PREVIEW."

These two propositions are logically distinct:
- **Boundary rule (what the evidence says):** when a client-facing review
  occurs at CLIENT_PREVIEW, the Asset's status does not change.
- **Pre-condition rule (what is not in evidence):** an Approval may only
  be created when the Asset is in CLIENT_PREVIEW.

The second cannot be derived from the first without additional evidence.
A characterization of the natural workflow (the review happens at
CLIENT_PREVIEW) does not constitute a prohibition on creating Approvals
for Assets in other states.

Additionally, DR 0029 §7.1 grants CREATIVE/PRODUCTION creation authority
for Asset-targeting Approvals with a scope boundary ("within their
production scope") but no explicit state restriction. OWNER and ADMIN/
OPERATIONS creation authority is unrestricted beyond tenant scope
(DR 0029 §7.1). If `CLIENT_PREVIEW` were the formal pre-condition, one
would expect to find a stated restriction in the authority grants — none
is present.

**The evidentiary gap:** no Decision Record 0001–0030 states a rule of
the form "an Asset must be in state X to be an Approval target" or
"an Approval may not be created for an Asset not in state X." The
inference that CLIENT_PREVIEW is the natural state (DR 0030 §8.3) is
well-supported, but natural state ≠ formal gate constraint.

### 6.3 Verdict

**CLIENT_PREVIEW cannot be promoted from INFERENCE to a formal APPROVED
pre-condition constraint from existing evidence. The formal pre-condition
remains DEFERRED (DR 0028 §10 item 2, §21 item 3).**

The evidence establishes CLIENT_PREVIEW as the natural, workflow-
appropriate target state (INFERENCE, consistent with DR 0030 §8.3). It
does not establish CLIENT_PREVIEW as a formal requirement enforced by
the architecture. An explicit Owner decision establishing CLIENT_PREVIEW
(or another state, or any combination) as the formal pre-condition is
required to close this deferral.

## 7. Asset — Per-State Analysis

For each Asset lifecycle state, this section states the current
classification of its target usability and the evidentiary basis (or
gap).

### 7.1 UPLOADED

**Classification: DEFERRED (target usability unresolved).**

**FACT (DR 0006):** `UPLOADED` is the initial state — "Asset was just
uploaded, not yet processed." The asset file exists but has not entered
processing.

**INFERENCE:** an Asset in `UPLOADED` has not been processed, has not
undergone QC, and has not been placed in client review. Creating an
Approval on an `UPLOADED` Asset would precede the entire processing
pipeline. The purpose of the Asset-targeting Approval in the established
workflow is client-facing review after QC — nothing in `UPLOADED` state
prepares an Asset for that purpose.

**Evidentiary gap:** no record explicitly prohibits targeting an
`UPLOADED` Asset. The inference that this state is not a valid target
state is strong (the Asset is not ready for any form of review), but
it remains INFERENCE. **DEFERRED.**

### 7.2 PROCESSING

**Classification: DEFERRED (target usability unresolved).**

**FACT (DR 0006):** `PROCESSING` is the automated transformation state
between `UPLOADED` and `READY_FOR_QC`. The asset is being processed.

**INFERENCE:** same reasoning as `UPLOADED` — the Asset is in mid-
pipeline, not yet available for any review. An Approval created while
the Asset is `PROCESSING` would reference a row whose content may not
yet be final.

**APPROVED note:** DR 0023 §13 requires the target to be "an immutable,
historically-fixed row." An Asset in `PROCESSING` is a row that exists
(existence constraint satisfied), but whether its content is "historically
fixed" in the sense required by §13 is not established for this state.
Whether `PROCESSING` represents a stable or still-mutating content state
is not addressed by any record.

**Evidentiary gap:** no explicit prohibition. INFERENCE-level observation
that this state is not a valid target state. **DEFERRED.**

### 7.3 READY_FOR_QC

**Classification: DEFERRED (target usability unresolved).**

**FACT (DR 0006):** `READY_FOR_QC` is the state in which the Asset
awaits QC Review. Transition to `CLIENT_PREVIEW` requires a QC pass;
failure routes to `REVISION_REQUIRED`.

**FACT (DR 0006, QC Boundary):** "QC Review entity owns the actual QC
verdict; Asset transitions react to that outcome as a guard." The QC
pass is required before `CLIENT_PREVIEW`.

**INFERENCE:** DR 0029 §7.1 grants QC creation authority for Approvals
targeting Assets "that have passed QC review." An Asset in `READY_FOR_QC`
has not yet passed QC review; it has not yet met the condition under
which QC initiates an Approval handoff. Creating an Approval on a
`READY_FOR_QC` Asset would precede the QC verdict.

**Evidentiary gap:** DR 0029 §7.1's scope boundary for QC describes
the natural handoff trigger, not a universal prohibition. OWNER and
ADMIN/OPS creation authority has no explicit state restriction.
No record prohibits creating an Approval for a `READY_FOR_QC` Asset.
**DEFERRED.**

### 7.4 CLIENT_PREVIEW

**Classification: DEFERRED (formal constraint); INFERENCE (natural
state for Asset-targeting Approvals).**

**FACT (DR 0006):** `CLIENT_PREVIEW` is the state reached after a
QC pass. The Approval/Delivery Boundary ("Asset status remains
`CLIENT_PREVIEW` after a successful client-facing review") describes
this state as the natural context for client-facing review.

**INFERENCE (reaffirmed from DR 0030 §8.3):** CLIENT_PREVIEW is the
natural, workflow-appropriate state for creating an Asset-targeting
Approval. The evidence is consistent and strong across DR 0006, DR 0029,
and DR 0030.

**Formal constraint: cannot be established from existing evidence**
(see §6.3). This state is the most strongly supported candidate for a
formal pre-condition but falls short of the evidentiary standard (§2.2).
**DEFERRED** as a formal constraint.

### 7.5 REVISION_REQUIRED

**Classification: DEFERRED (target usability unresolved).**

**FACT (DR 0006):** "`REVISION_REQUIRED` and `REJECTED` are terminal
for that specific Asset version/row. Neither is reopened."

**FACT (DR 0030 §10 item 3):** "Asset v1 transitions to
`REVISION_REQUIRED` (terminal). Asset v1's row content is immutable
after that transition." The terminal Asset row remains in the database
as a permanent historical record.

**INFERENCE:** creating an Approval on a `REVISION_REQUIRED` Asset
version would target a row that has already been conclusively determined
to require revision. DR 0010 Revision Separation establishes that a
new Approval record is created for the revised Asset version — implying
the natural flow is to Approve the new version, not re-Approve the
terminal one. However, the terminal row exists and remains targetable
in principle.

**INFERENCE boundary:** DR 0030 §6 item 5 (APPROVED) states: "An
Approval targeting Asset v1 does not extend to Asset v2." This does
not prohibit targeting a REVISION_REQUIRED row — it only clarifies
there is no continuity to v2. A hypothetical Approval on a
REVISION_REQUIRED row would be historically valid (the row exists) but
commercially purposeless within the established workflow.

**Evidentiary gap:** no explicit prohibition. INFERENCE-level observation
that this state is not a natural target state. **DEFERRED.**

### 7.6 REJECTED

**Classification: DEFERRED (target usability unresolved).**

**FACT (DR 0006):** `REJECTED` is a terminal Asset state, parallel in
finality to `REVISION_REQUIRED`. "Neither is reopened."

**INFERENCE:** same reasoning as `REVISION_REQUIRED`. A `REJECTED` Asset
version has a conclusive negative disposition; creating a new Approval
on it would have no purpose in the established workflow. The natural
workflow for a rejected Asset would involve determining whether to
create a new Asset version (if revision is warranted) or not.

**Evidentiary gap:** no explicit prohibition. **DEFERRED.**

### 7.7 Asset Per-State Summary

| Asset State | Formal Constraint | Classification | Evidentiary Basis |
|---|---|---|---|
| UPLOADED | None established | DEFERRED | Inference: not ready for review; no record prohibits |
| PROCESSING | None established | DEFERRED | Inference: mid-pipeline; content stability unclear |
| READY_FOR_QC | None established | DEFERRED | Inference: pre-QC-pass; QC creation scope not satisfied |
| CLIENT_PREVIEW | None established (formal) | DEFERRED (formal); INFERENCE (natural) | DR 0006 boundary + DR 0029 QC handoff: natural state; no formal rule |
| REVISION_REQUIRED | None established | DEFERRED | Inference: terminal, purpose unclear; no prohibition |
| REJECTED | None established | DEFERRED | Inference: terminal; no prohibition |

**No formal constraint can be established for any Asset state from
existing evidence.** The INFERENCE column correctly identifies
CLIENT_PREVIEW as the natural targeting state, but this cannot be
converted to a formal rule without an explicit Owner decision.

## 8. Quote — Evaluation of SENT as Formal Pre-Condition

### 8.1 Evidence Inventory

**FACT (DR 0005, Approved States):** Quote's six approved lifecycle
states are: `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`,
`CANCELLED`.

**FACT (DR 0005, SENT State Definition):** "`SENT` — Quote has been
presented to the client and awaits the client's decision."

**FACT (DR 0005, Boundary 2):** "No `PENDING_CLIENT_APPROVAL` state.
`SENT` represents the Quote being presented to the client and awaiting
their decision."

**FACT (DR 0029 §8.1):** OWNER and ADMIN/OPERATIONS hold creation
authority for Quote-targeting Approvals (APPROVED); CREATIVE/PRODUCTION
and QC creation authority for Quote-targeting Approvals is DEFERRED.
Neither OWNER nor ADMIN/OPS authority has an explicit state restriction
stated.

**FACT (DR 0028 §8 item 7):** "Quote `ACCEPTED`, an Approval record
targeting that Quote, and Order creation are three separate events."
This establishes that Approval and Quote ACCEPTED are distinct events
in distinct entities. It does not establish which state the Quote must
be in when the Approval is created.

**FACT (DR 0028 §10 item 7):** "Pre-condition on Quote state at
targeting time: which Quote lifecycle states are valid target states
(e.g., must the Quote be in `SENT`? DEFERRED)." This explicit deferral
is from DR 0028.

**FACT (DR 0028 §10 item 9):** "Temporal ordering of Approval decision
and Quote state transition: whether the Approval's APPROVED/REJECTED
decision triggers the Quote's ACCEPTED/REJECTED transition, and how
that is enforced (DEFERRED)." This confirms that even the relationship
between Approval decision and Quote state transition is unresolved —
making it impossible to infer a pre-condition from the temporal ordering.

### 8.2 Evidentiary Gap

**ANALYSIS:**

The strongest evidence for `SENT` as the formal pre-condition is
DR 0005's SENT definition: a Quote in SENT state "awaits the client's
decision." This is a purpose characterization — SENT is the state
designed for client-facing commercial review.

However, DR 0005's definition describes what SENT *means*, not what
state a Quote *must be in* for an Approval to be created. These are
again logically distinct propositions:

- **State definition (what the evidence says):** SENT = Quote has been
  presented to the client and awaits their decision.
- **Pre-condition rule (what is not in evidence):** an Approval may
  only be created when the Quote is in SENT.

Additionally, DR 0028 §10 item 9's explicit deferral of the temporal
ordering between Approval decision and Quote state transition reveals
the depth of the unresolved dependency. If the ordering between the
Approval decision and the Quote's state transition is itself deferred,
the question of which Quote state triggers Approval creation is a
fortiori deferred.

**The evidentiary gap:** no Decision Record 0001–0030 states a rule of
the form "a Quote must be in state Y to be an Approval target" or "an
Approval may not be created for a Quote not in state Y." The inference
that SENT is the natural state is well-supported, but it does not
reach constraint-grade evidence.

### 8.3 Verdict

**SENT cannot be promoted from INFERENCE to a formal APPROVED
pre-condition constraint from existing evidence. The formal pre-condition
remains DEFERRED (DR 0028 §10 item 7, §21 item 4).**

The evidence establishes SENT as the natural, purpose-appropriate target
state (INFERENCE, consistent with DR 0030 §9.3). It does not establish
SENT as a formal requirement enforced by the architecture. An explicit
Owner decision establishing SENT (or another state, or a set of states)
as the formal pre-condition is required.

## 9. Quote — Per-State Analysis

### 9.1 DRAFT

**Classification: DEFERRED (target usability unresolved).**

**FACT (DR 0005, DRAFT Definition):** "`DRAFT` — Quote is being composed
internally." The Quote has not been presented to the client.

**FACT (DR 0005, Boundary 2):** "No `PENDING_CLIENT_APPROVAL` state.
`SENT` represents the Quote being presented to the client and awaiting
their decision." DR 0005 specifically rejected creating a separate
client-approval state, placing the "awaiting decision" meaning in SENT
rather than any other state.

**INFERENCE:** a DRAFT Quote is an internal document not yet presented
to the client. An Approval on a DRAFT Quote would seek formal client
authorization on terms the client has not yet seen. This contradicts
the purpose of SENT (the client-presentation state) and the purpose of
CLIENT decision authority in DR 0029 §8.2.

**Evidentiary gap:** DR 0005 does not explicitly prohibit creating an
Approval on a DRAFT Quote — it only defines the state's purpose.
**DEFERRED.**

### 9.2 SENT

**Classification: DEFERRED (formal constraint); INFERENCE (natural
state for Quote-targeting Approvals).**

**FACT (DR 0005):** SENT = "Quote has been presented to the client and
awaits the client's decision." SENT is the state in which the client's
response is expected.

**INFERENCE (reaffirmed from DR 0030 §9.3):** SENT is the natural,
purpose-appropriate state for creating a Quote-targeting Approval. The
evidence is consistent across DR 0005, DR 0029, and DR 0030.

**Formal constraint: cannot be established from existing evidence**
(see §8.3). SENT is the most strongly supported candidate but falls
short of the evidentiary standard (§2.2). **DEFERRED** as a formal
constraint.

### 9.3 ACCEPTED

**Classification: DEFERRED (target usability unresolved).**

**FACT (DR 0005):** "`ACCEPTED` — Client has accepted the Quote's
terms." ACCEPTED is a terminal state; "No reopening of any terminal
state is approved."

**FACT (DR 0028 §8 item 7):** "Quote `ACCEPTED`, an Approval record
targeting that Quote, and Order creation are three separate events."
This explicitly acknowledges that an Approval may co-exist conceptually
with a Quote in ACCEPTED state (they are three separate events, not
necessarily ordered).

**INFERENCE:** an ACCEPTED Quote has already received the client's
commercial decision (acceptance of the Quote's terms — DR 0005
ACCEPTED definition). Creating an Approval on an ACCEPTED Quote would
target a row whose commercial disposition is already recorded. However,
DR 0028 §8 item 7's characterization of the three events as "separate"
does not imply an ordering prohibition.

**Evidentiary gap:** the temporal ordering between Approval decision
and Quote state transition is explicitly DEFERRED (DR 0028 §10 item 9;
DR 0030 §20 item 6). It is therefore possible — without contradiction
of any approved record — that an Approval is created targeting a Quote
already in ACCEPTED state (if the ordering is defined that way in a
future decision). **DEFERRED.**

### 9.4 REJECTED

**Classification: DEFERRED (target usability unresolved).**

**FACT (DR 0005):** "`REJECTED` — Client has declined the Quote."
Terminal state; no reopening.

**INFERENCE:** a REJECTED Quote has a final negative commercial
disposition. Creating an Approval on a REJECTED Quote would target a
row on which the client has already declined. However, no record
explicitly prohibits this.

**Evidentiary gap:** no explicit prohibition. **DEFERRED.**

### 9.5 EXPIRED

**Classification: DEFERRED (target usability unresolved).**

**FACT (DR 0005):** "`EXPIRED` — The Quote's validity period has elapsed
without acceptance." Terminal state; no reopening.

**INFERENCE:** an EXPIRED Quote has a time-based terminal disposition.
Creating an Approval on an EXPIRED Quote would target a row whose
commercial offer has lapsed. No record prohibits this.

**Evidentiary gap:** no explicit prohibition. **DEFERRED.**

### 9.6 CANCELLED

**Classification: DEFERRED (target usability unresolved).**

**FACT (DR 0005):** "`CANCELLED` — The company has withdrawn the Quote
before client acceptance." Terminal state; no reopening. Boundary 5:
the cancel-and-new pattern means a new Quote row is created.

**FACT (DR 0030 §11):** "Original Quote Q1 and replacement Quote Q2
are distinct rows with distinct UUIDs. An Approval targeting Q1 does
not target Q2." This means an Approval on a CANCELLED Quote and a
subsequent Approval on the replacement Quote are independent records.

**INFERENCE:** a CANCELLED Quote has been withdrawn; its commercial
terms are no longer active. An Approval on a CANCELLED Quote targets
a row representing a withdrawn commercial offer. However, DR 0030 §11
already established (APPROVED) that this situation is handled by the
distinct-row / distinct-Approval model — the historical record of an
Approval on a CANCELLED Quote, if it exists, is preserved. No record
prohibits creating an Approval on a CANCELLED row.

**Evidentiary gap:** no explicit prohibition. **DEFERRED.**

### 9.7 Quote Per-State Summary

| Quote State | Formal Constraint | Classification | Evidentiary Basis |
|---|---|---|---|
| DRAFT | None established | DEFERRED | Inference: internal composition; not yet presented to client |
| SENT | None established (formal) | DEFERRED (formal); INFERENCE (natural) | DR 0005 "awaits client's decision": natural state; no formal rule |
| ACCEPTED | None established | DEFERRED | Inference: terminal commercial decision recorded; no prohibition; ordering DEFERRED |
| REJECTED | None established | DEFERRED | Inference: terminal; no prohibition |
| EXPIRED | None established | DEFERRED | Inference: terminal (time-based); no prohibition |
| CANCELLED | None established | DEFERRED | Inference: withdrawn; distinct-row model handles; no prohibition |

**No formal constraint can be established for any Quote state from
existing evidence.** SENT is the natural targeting state by inference
but cannot be formally required.

## 10. Combined Conclusion

**APPROVED (the evidentiary verdict this record establishes):**

1. **CLIENT_PREVIEW cannot be promoted from INFERENCE to a formal APPROVED
   pre-condition for Asset-targeting Approvals.** The evidence from
   DR 0006 and DR 0029 is characterization-grade (natural workflow
   context) rather than constraint-grade (explicit rule). The formal
   pre-condition remains DEFERRED.

2. **SENT cannot be promoted from INFERENCE to a formal APPROVED pre-
   condition for Quote-targeting Approvals.** The evidence from DR 0005
   and DR 0029 is characterization-grade. The formal pre-condition
   remains DEFERRED.

3. **No individual Asset lifecycle state can be formally established as
   APPROVED or EXCLUDED as a target state from existing evidence.** All
   six Asset states remain DEFERRED for target usability, with
   CLIENT_PREVIEW carrying the strongest INFERENCE-level support.

4. **No individual Quote lifecycle state can be formally established as
   APPROVED or EXCLUDED as a target state from existing evidence.** All
   six Quote states remain DEFERRED for target usability, with SENT
   carrying the strongest INFERENCE-level support.

5. **The only formally established constraint on target usability beyond
   type-eligibility is the existence constraint** (DR 0030 §6 item 2,
   DR 0023 §13): the target row must exist before the Approval can be
   created.

**INFERENCE (consolidated, not modified from DR 0030):**
- CLIENT_PREVIEW is the natural pre-condition for Asset-targeting
  Approvals, supported by DR 0006's Approval/Delivery Boundary and
  DR 0029's QC handoff pattern.
- SENT is the natural pre-condition for Quote-targeting Approvals,
  supported by DR 0005's SENT definition and the CLIENT decision
  authority for client-facing Approvals (DR 0029 §8.2).
- Asset states before CLIENT_PREVIEW (UPLOADED, PROCESSING,
  READY_FOR_QC) are not naturally associated with Approval creation.
- Asset terminal states (REVISION_REQUIRED, REJECTED) are not natural
  Approval targets for their specific versions.
- Quote DRAFT is not naturally associated with Approval creation.
- Quote terminal states (ACCEPTED, REJECTED, EXPIRED, CANCELLED) are
  not natural Approval targets in new Approval creation.

**These remain INFERENCE. They document the evidence-based expectation
without constituting an enforceable rule.**

## 11. What Would Resolve These Deferrals

**PROPOSAL — framing for Owner decision:**

An explicit Owner decision on the following specific questions would
close the outstanding deferrals:

**For Asset:**

A. "An Approval may only target an Asset row in `CLIENT_PREVIEW` state."
   — This would establish the formal positive pre-condition.

B. (Alternatively) "An Approval may target an Asset row in any of the
   following states: [explicit list]." — This would enumerate permitted
   states.

C. "An Approval may not target an Asset row in any of the following
   states: [explicit list]." — This would enumerate excluded states
   (negative constraint).

Any of A, B, or C — explicitly stated as an Owner decision — would
satisfy the evidentiary standard (§2.2) and promote the current DEFERRED
classification to APPROVED.

**For Quote:**

D. "An Approval may only target a Quote row in `SENT` state." — Formal
   positive pre-condition for Quote.

E. (Alternatively) "An Approval may target a Quote row in any of the
   following states: [explicit list]."

F. "An Approval may not target a Quote row in any of the following
   states: [explicit list]."

**This record does not make any of these decisions.** It frames them
as the explicit Owner choices needed and presents the evidence-based
expectation for each. Owner approval of this record (§10's conclusions)
does not itself constitute decisions A–F; those decisions remain
separately deferred.

## 12. Interactions

### 12.1 DR 0005 (Quote State Machine)

**Consistent. No change.** DR 0005's six states, transitions, and
terminal states are unchanged. This record reads DR 0005 as evidence
only; it does not modify Quote's lifecycle. The DEFERRED per-state
conclusions (§9) do not alter DR 0005's structure.

### 12.2 DR 0006 (Asset State Machine)

**Consistent. No change.** DR 0006's six states, transitions, and
boundaries are unchanged. The Approval/Delivery Boundary ("Asset status
remains `CLIENT_PREVIEW` after a successful client-facing review") is
reaffirmed as a boundary rule (Approval doesn't advance Asset state)
and a characterization evidence source (§6.1). The DEFERRED per-state
conclusions (§7) do not alter DR 0006's structure.

### 12.3 DR 0010 (Approval State Machine)

**Consistent. No change.** The Target Boundary ("Approval does not own
the lifecycle of the target") is fully consistent with this record's
conclusions — the target's lifecycle state is independent of Approval
creation and decision authority. Revision Separation (new Approval for
revised target) is unaffected; §7.5 (REVISION_REQUIRED analysis) notes
this without modifying it.

### 12.4 DR 0012 (Order Completion Guard)

**Consistent. No change.** The guard depends on Required Approval
satisfaction (DR 0022 §7), not on target lifecycle state. The DEFERRED
pre-condition conclusions do not affect the guard's evaluation logic.

### 12.5 DR 0017–0022 (Requirement Satisfaction)

**Consistent. No change.** Satisfaction mechanics are orthogonal to
target lifecycle state — the satisfaction formula (DR 0018 §12) uses
the Required Approval identity, not the target's state. DEFERRED pre-
condition conclusions do not affect satisfaction semantics. AND-
semantics, one-to-one default, and Required Approval identity are
unchanged.

### 12.6 DR 0023 (Target Model)

**Consistent. No change.** The immutable-reference principle (§13) is
reaffirmed: the existence constraint (DR 0030 §6 item 2) follows
directly from it. The per-state DEFERRED conclusions are consistent
with §13 — the immutability principle applies once the target row is
referenced; it does not itself establish which states a target may be
in at reference time. DR 0023 §14 (Asset revision boundary) is
reaffirmed in §7.5.

### 12.7 DR 0028 (Asset and Quote Designation)

**Consistent. §10 items 2 and 7 addressed as far as evidence permits.**
DR 0028 §10 item 2 (formal Asset pre-condition DEFERRED) and item 7
(formal Quote pre-condition DEFERRED) are both addressed in §6 and §8.
The conclusion is that they cannot be resolved from current evidence;
they remain DEFERRED as DR 0028 expected. DR 0028 §21 items 3 and 4
are correspondingly addressed: the downstream decisions they named
cannot be made without additional Owner input.

### 12.8 DR 0029 (Role Authority Mapping)

**Consistent. No change.** Role authority (who may create and decide
Approvals) is a separate dimension from target state eligibility (what
state the target must be in). The per-state DEFERRED conclusions do
not alter any role authority mapping established in DR 0029. The QC
handoff pattern (DR 0029 §7.1 — QC creates Approval after QC pass) is
used as characterization evidence in §6.1; it is not modified.

### 12.9 DR 0030 (Target State and Temporal Boundary)

**Consistent and extending.** This record evaluates DR 0030 §8.3 and
§9.3's INFERENCE observations and confirms they cannot be promoted to
APPROVED formal constraints (§6.3, §8.3, §10). It also addresses
DR 0030 §20 items 1, 2, 4, and 5 (per-state DEFERRED analyses for
Asset and Quote), confirming all remain DEFERRED. DR 0030 §20 items 3,
6, 7, 8, and 9 are out of scope for this record and remain DEFERRED
unchanged.

## 13. Remaining Deferred Items After This Record

The following items from DR 0030 §20 are still DEFERRED after this
record:

**Addressed but still DEFERRED (this record confirms the deferral):**

1. **Formal Asset state pre-condition at targeting time** (DR 0030 §20
   item 1) — evaluated in §6; cannot be resolved from existing evidence;
   see §11 for the Owner decisions needed.
2. **Target usability for Asset states other than CLIENT_PREVIEW**
   (DR 0030 §20 item 2) — evaluated in §7; all states remain DEFERRED.
3. **Formal Quote state pre-condition at targeting time** (DR 0030 §20
   item 4) — evaluated in §8; cannot be resolved from existing evidence;
   see §11.
4. **Target usability for Quote states other than SENT** (DR 0030 §20
   item 5) — evaluated in §9; all states remain DEFERRED.

**Not addressed by this record (still DEFERRED, unchanged from DR 0030):**

5. **Asset revision orchestration** — whether Approval REJECTED triggers
   Asset `REVISION_REQUIRED` transition (DR 0030 §20 item 3).
6. **Temporal ordering of Approval decision and Quote state transition**
   (DR 0030 §20 item 6).
7. **Quote replacement orchestration** (DR 0030 §20 item 7).
8. **Approval ↔ Delivery orchestration** (DR 0030 §20 item 8).
9. **Expiration policy per target type** (DR 0030 §20 item 9).

**New deferred items introduced by this record:**

10. **Owner decision on formal Asset target-state precondition** — the
    explicit decision(s) named in §11 (A, B, or C) are needed to close
    item 1 above.
11. **Owner decision on formal Quote target-state precondition** — the
    explicit decision(s) named in §11 (D, E, or F) are needed to close
    item 3 above.

## 14. Historical Integrity

**Reaffirmed, unchanged from DR 0014 §14 through DR 0030 §21:**

Terminal Approval records preserve the target reference permanently.
Target lifecycle state changes after the Approval is created do not
alter the historical record (DR 0030 §13). Whether a target was in
CLIENT_PREVIEW or another state at the time of Approval creation is
part of the historical record of that Approval event — the DEFERRED
pre-condition question concerns which states are valid at targeting time,
not the permanence of the record once created.

## 15. Security / Tenancy

**APPROVED principle, unchanged from DR 0023 §19 through DR 0030 §22:**

Cross-tenant target references are never permitted. The target-state
pre-condition question (§6, §8) operates within this constraint —
even if a target state is later determined to be valid, the tenant
isolation requirement applies at the same time. Enforcement mechanism
remains DEFERRED.

## 16. Financial Separation

Unchanged. Target-state pre-conditions have no financial implication;
no payment, revenue, or financial event is implied by any state
classification in this record.

## 17. Rejected Alternatives

- Promoting `CLIENT_PREVIEW` to a formal APPROVED pre-condition for
  Asset-targeting Approvals — rejected; the evidentiary standard
  (§2.2) requires a direct constraint-grade statement; no such
  statement exists in DR 0001–0030; manufacturing a constraint from
  characterization evidence would violate the governing instruction
  "Do not manufacture evidence merely to close a deferred item" (§6.3).

- Promoting `SENT` to a formal APPROVED pre-condition for Quote-targeting
  Approvals — rejected; same reasoning (§8.3).

- Excluding any specific Asset state (UPLOADED, PROCESSING,
  READY_FOR_QC, REVISION_REQUIRED, REJECTED) as a formally prohibited
  target state — rejected; no record supplies a prohibition; doing so
  would exceed the evidentiary standard (§7).

- Excluding any specific Quote state (DRAFT, ACCEPTED, REJECTED,
  EXPIRED, CANCELLED) as a formally prohibited target state — rejected;
  no record supplies a prohibition (§9).

- Treating DR 0006's Approval/Delivery Boundary ("Asset status remains
  `CLIENT_PREVIEW` after a successful client-facing review") as a formal
  pre-condition rule — rejected; this statement is a boundary rule about
  what Approval decisions *do not* cause (state advancement), not a
  gate rule about what state the Asset *must be in* (§6.2).

- Treating DR 0005's SENT definition ("awaits the client's decision")
  as a formal pre-condition rule — rejected; state definitions describe
  purpose and meaning; they do not constitute pre-condition constraints
  for external entities referencing that state (§8.2).

- Closing DR 0030 §20 items 3, 6, 7, 8, or 9 in this record — rejected;
  those items are outside the scope of this record's task; they remain
  as DEFERRED in DR 0030.

- Inferring that ACCEPTED Quote state implies no Approval was needed —
  rejected; DR 0028 §8 item 7 explicitly establishes Quote ACCEPTED and
  an Approval record as three separate events, neither implying the
  other; no causal dependency in either direction is established (§9.3).

## 18. Final Recommendation

**PROPOSAL — presented for Owner approval:**

The following is the complete verdict of this record's evidentiary
analysis:

**For Asset-targeting Approvals:**

Neither `CLIENT_PREVIEW` nor any other Asset lifecycle state can be
established as a formal required or excluded target state from Decision
Records 0001–0030. The existence constraint (the row must exist —
DR 0030 §6 item 2) is the only formally established eligibility
requirement. All per-state usability questions remain DEFERRED.

The INFERENCE that `CLIENT_PREVIEW` is the natural pre-condition remains
accurate and well-supported (DR 0006 + DR 0029) but does not reach
constraint-grade evidence.

**For Quote-targeting Approvals:**

Neither `SENT` nor any other Quote lifecycle state can be established
as a formal required or excluded target state from Decision Records
0001–0030. The existence constraint applies identically. All per-state
usability questions remain DEFERRED.

The INFERENCE that `SENT` is the natural pre-condition remains accurate
and well-supported (DR 0005 + DR 0029) but does not reach constraint-
grade evidence.

**Action required:** Owner designation of specific formal pre-condition
rules for Asset-targeting and Quote-targeting Approvals — per §11 —
is the necessary next step to close these deferrals. This record
documents the evidentiary ceiling and frames the specific decisions
required; it cannot itself constitute those decisions.

## Consistency with Decision Records 0001–0030

- Consistent with 0001/0002: no schema, no new entity, no new role;
  tenant isolation unchanged (§15); UUID identity unaffected.
- Consistent with 0003/0004: Campaign and Brief unchanged; not in scope.
- Consistent with 0005 (Quote): state machine unchanged (§12.1); all
  six states evaluated as evidence, not modified.
- Consistent with 0006 (Asset): state machine unchanged (§12.2); all
  six states evaluated as evidence, not modified; Approval/Delivery
  Boundary reread as boundary rule, not pre-condition rule (§6.2).
- Consistent with 0010 (Approval): Target Boundary and Revision
  Separation unaffected (§12.3); no Approval state modified.
- Consistent with 0012 (Order Completion Guard): guard unaffected
  (§12.4).
- Consistent with 0017–0022: satisfaction mechanics orthogonal to target
  state; unchanged (§12.5).
- Consistent with 0023: immutable-reference principle reaffirmed;
  existence constraint reaffirmed (§12.6).
- Consistent with 0024: role authority matrix unchanged.
- Consistent with 0025–0027: candidate inventory and designation
  framework unchanged.
- Consistent with 0028: §10 items 2 and 7 addressed; still DEFERRED
  (§12.7).
- Consistent with 0029: role authority mapping unchanged; QC handoff
  pattern used as evidence only (§12.8).
- Consistent with 0030: INFERENCE observations from §8.3 and §9.3
  confirmed as inference-grade and not promotable; §20 items 1, 2, 4,
  5 addressed; remaining items unchanged (§12.9).
- No Decision Record 0001–0030 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume `CLIENT_PREVIEW` is a formally required pre-condition
  for Asset-targeting Approval creation — DEFERRED (§6.3, §10).
- Do not assume `SENT` is a formally required pre-condition for Quote-
  targeting Approval creation — DEFERRED (§8.3, §10).
- Do not assume any Asset lifecycle state is formally excluded as an
  Approval target state — DEFERRED for all six states (§7.7, §10).
- Do not assume any Quote lifecycle state is formally excluded as an
  Approval target state — DEFERRED for all six states (§9.7, §10).
- Do not assume the INFERENCE-level observations about natural states
  (CLIENT_PREVIEW for Asset, SENT for Quote) constitute formal
  constraints — they are inference-grade observations only (§10).
- Do not assume this record establishes any target-state pre-condition
  beyond the existence constraint already approved in DR 0030 §6 item 2.
- Do not assume DR 0030 §20 items 3, 6, 7, 8, or 9 have been addressed
  or resolved by this record — they remain DEFERRED (§13).
- Do not assume Approval REJECTED causes Asset `REVISION_REQUIRED` —
  orchestration DEFERRED (DR 0030 §20 item 3, §13 item 5).
- Do not assume Approval APPROVED causes or implies Quote ACCEPTED —
  they are separate events (DR 0028 §8 item 7; DR 0030 §12.2).
- Do not assume new Asset states, Quote states, or Approval states have
  been introduced — none have been (§4).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0030 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
