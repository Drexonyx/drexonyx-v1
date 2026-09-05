# Decision Record 0029 — Phase 02 Round 02B: Approval Target Role Authority Mapping

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** PROPOSED — awaiting explicit Owner approval. If the Owner
  approves this record, the role-per-target-type authority mappings in
  §7 and §8 (and their matrix summaries in §9 and §10) become the
  governing authority for which RBAC roles hold creation and decision
  authority on Approval records that target Asset rows or Quote rows.
  No schema, migration, or implementation is authorized by approval of
  this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0028. All remain authoritative and unchanged. This record
  resolves DR 0024 §23 item 1 ("Role-per-target-type mapping: which
  role(s) hold decision authority for which target types") for the two
  APPROVED V1 Approval target types — Asset (DR 0028 §6) and Quote
  (DR 0028 §8) — by applying DR 0024's Role Authority Matrix and
  rationale to each type individually. It also partially resolves
  DR 0028 §21 item 2 ("Role-per-target-type mapping for Asset-targeting
  and Quote-targeting Approvals").

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service
and Package remain **UNVERIFIED** as entities, unchanged from
0013–0028. This record does not claim Owner approval; it proposes
Owner approval of the per-type role mappings in §7–§10.

## 1. Context

Decision Record 0024 established the Role Authority Matrix for
Approval actor authority at the RBAC-role level (DR 0024 §13). It
explicitly noted that the scope boundaries for CREATIVE/PRODUCTION
and CLIENT creation authority depend on the target-type set (DR 0024
§6, §7, §22 item 1) and deferred role-per-target-type mapping as
DR 0024 §23 item 1. Decision Record 0028 designated Asset and Quote
as the two V1 Approval target types (subject to Owner approval). With
both target types now proposed, the prerequisite for DR 0024 §23
item 1 is met: this record applies DR 0024's rationale and approved
authority boundaries to Asset-targeting and Quote-targeting Approvals
individually.

## 2. Problem

DR 0024's Role Authority Matrix (§13) is expressed at the general
Approval level. It contains asterisked and daggers (*, †) noting that
scope boundaries for CREATIVE/PRODUCTION and CLIENT creation authority
depend on target-type-set resolution (DR 0024 §6, §22 item 1). Until
now, those scope boundaries could not be filled in because the target-
type set was unresolved. DR 0028's proposed designation of Asset and
Quote makes it possible, for the first time, to apply the matrix
rationale type by type. This record does that work, producing two
concrete per-type role authority tables (Asset §9; Quote §10) that
replace the general asterisk/dagger notation for these two types.

## 3. Governing Sources

**APPROVED sources used in this record:**

- **DR 0024** — authoritative source for Approval actor authority.
  No role, authority boundary, or structural principle from DR 0024
  is modified by this record. All rules — including absolute
  exclusions — are applied as stated there, not reinterpreted.
- **DR 0028** — authoritative source for the approved V1 target-type
  set (Asset and Quote). This record's scope is bounded to those two
  types only.
- **DR 0006** — authoritative source for Asset's lifecycle. Specifically:
  the Approval/Delivery Boundary section ("Asset status remains
  `CLIENT_PREVIEW` after a successful client-facing review"), the QC
  Boundary ("QC Review entity owns the actual QC verdict"), and the
  row-per-revision principle ("Each revision produces a new Asset
  row/version").
- **DR 0005** — authoritative source for Quote's lifecycle.
  Specifically: Boundary 2 and State Definition of SENT ("`SENT`
  represents the Quote being presented to the client and awaiting the
  client's decision"), the cancel-and-new pattern (Boundary 5), and
  the absence of any QC involvement in the Quote lifecycle.
- **DR 0001/0002** — tenant isolation (D1), UUID v7 identity (D2),
  RBAC roles (Gate 0).

## 4. Scope of This Record

**This record:**

1. Applies DR 0024's role authority rationale to Asset-targeting
   Approvals (§7) and Quote-targeting Approvals (§8), producing
   per-type role authority tables (§9, §10).
2. Identifies, for each role and each transition type, whether the
   DR 0024 general ruling maps cleanly to each target type or requires
   a separate DEFERRED classification.
3. Characterizes both Asset and Quote as "client-facing" targets from
   APPROVED primary sources, resolving the scope question for CLIENT
   decision authority.
4. Identifies where the two target types produce identical role
   authority outcomes (§11) and where they differ (§12).
5. Preserves all absolute exclusions from DR 0024 (AGENT excluded from
   all actor roles; CREATIVE/PRODUCTION excluded from all decision
   roles; QC excluded from all decision roles).

**This record does NOT:**

- Invent new roles beyond Gate 0's provision.
- Modify DR 0024's Role Authority Matrix — the general matrix remains
  authoritative for any future target type.
- Resolve DR 0024 §23 items 2–10 (deferred items other than item 1).
- Design any physical schema, migration, or implementation.
- Authorize implementation, dependency installation, or code change.
- Resolve pre-conditions on Asset or Quote state at targeting time
  (DR 0028 §10 items 2 and 7) — those remain DEFERRED.
- Establish workflow routing, actor attribution mechanism, or tenant
  enforcement mechanism — all remain DEFERRED.
- Resolve CLIENT creation or cancellation authority (still DEFERRED per
  DR 0024 §22 items 3 and 5).
- Resolve CREATIVE/PRODUCTION cancellation authority (still DEFERRED
  per DR 0024 §23 item 5).
- Resolve QC mandatory-vs.-optional initiation for Asset (still DEFERRED
  per DR 0024 §23 item 2).

## 5. Conceptual Foundations Preserved from DR 0024

**APPROVED (reaffirmed, not re-decided):**

1. **Creator/decision-maker separation (DR 0024 §5):** a specific
   individual may not both create and decide the same Approval record.
   This is a per-record, per-individual constraint — not a per-role
   constraint. The same role may hold both creation authority and
   decision authority in the general case; the restriction is that
   the *same individual* may not exercise both on the *same record*.
   This principle applies to all Approval records regardless of target
   type, including Asset-targeting and Quote-targeting Approvals.

2. **Separation applies only to APPROVED/REJECTED (DR 0024 §5, last
   paragraph):** the creator/decision-maker separation does not apply
   to CANCELLED (termination without a merit decision) or EXPIRED
   (system-driven; no actor).

3. **Absolute exclusions are not per-type deferrals (DR 0024 §7, §11):**
   the absolute exclusions for CREATIVE/PRODUCTION, QC, and AGENT on
   PENDING → APPROVED and PENDING → REJECTED are closed APPROVED
   boundaries. They do not become DEFERRED on a per-type basis.
   AGENT's exclusion from all actor roles is also closed and absolute.

4. **Client-facing vs. internal Approval semantics (DR 0024 §8):**
   the distinction is expressed through the decision-maker role — an
   Approval decided by CLIENT is client-facing; one decided by OWNER
   or ADMIN/OPERATIONS is internal. No classification field is
   introduced; no sub-type is required.

5. **Role Authority Matrix general form (DR 0024 §13):** the general
   matrix remains authoritative. This record fills in the target-type-
   specific scope detail for Asset and Quote only; it does not replace
   the general matrix.

## 6. Client-Facing Characterization of Asset and Quote

**APPROVED — from primary DR 0006 and DR 0005 sources:**

The distinction between "client-facing" and "internal" Approval
semantics governs CLIENT decision authority per DR 0024 §7 and §8.
Whether a target type is inherently client-facing is determined by the
target type's own governing record, not invented here.

### Asset — Client-Facing: APPROVED

**FACT (DR 0006, Approval/Delivery Boundary section):** Decision
Record 0006 states: "Asset status remains `CLIENT_PREVIEW` after a
successful **client-facing** review — approval and delivery are
represented through their respective entities, not through further
Asset-state advancement."

The phrase "client-facing review" appears verbatim in DR 0006's
Approval/Delivery Boundary section — an APPROVED record. The
`CLIENT_PREVIEW` state name itself reflects that the asset is
presented to the client for review. An Approval record targeting an
Asset row in `CLIENT_PREVIEW` is therefore a client-facing Approval
within the meaning of DR 0024 §7 and §8: it concerns deliverable
creative work presented to the client for formal authorization.

**Classification: APPROVED.** This is a direct application of DR 0024
§7 to the Asset target type, grounded in DR 0006's own terminology,
not an inference.

### Quote — Client-Facing: APPROVED

**FACT (DR 0005, SENT State Definition and Boundary 2):** Decision
Record 0005 defines the SENT state as: "`SENT` — Quote has been
presented to the client and awaits the client's decision." Boundary 2
states: "No `PENDING_CLIENT_APPROVAL` state. `SENT` represents the
Quote being presented to the client and awaiting their decision."

A Quote is inherently a commercial offer extended to a client for
acceptance or rejection. An Approval record targeting a Quote row
concerns a commercial document that by its nature requires a client
decision. CLIENT is the natural decision-maker per DR 0024 §7 ("CLIENT
is the natural decision-maker for client-facing Approvals — decisions
that require external client authorization on deliverable work").

**Classification: APPROVED.** This is a direct application of DR 0024
§7 to the Quote target type, grounded in DR 0005's own terminology,
not an inference.

### Combined observation

**INFERENCE:** both target types are client-facing in the sense of
DR 0024 §7 and §8. This does not mean every Approval targeting an
Asset or Quote row must be decided by a CLIENT actor — DR 0024 §7
establishes CLIENT authority for client-facing Approvals "within their
contractual scope," and OWNER/ADMIN/OPERATIONS retain decision authority
for internal Approvals (§7). It means the domain of "client-facing"
Approvals includes those targeting Asset or Quote rows, making CLIENT
a principal decision-maker for that domain. Whether any specific
Approval on a specific Asset or Quote row is routed to CLIENT vs.
ADMIN/OPERATIONS remains an implementation/workflow concern (DR 0024
§23 item 4) — DEFERRED.

## 7. Asset-Targeting Approvals — Role Authority Mapping

**PROPOSAL (for Owner approval):**

This section applies DR 0024's rationale, section by section, to
Approval records whose target is an Asset row.

### 7.1 Creation Authority (→ PENDING) for Asset-Targeting Approvals

**OWNER — APPROVED.**

**Basis:** DR 0024 §6: "OWNER — APPROVED. Highest authority; may
initiate any Approval request. No restriction." This applies without
qualification to Asset-targeting Approvals.

---

**ADMIN/OPERATIONS — APPROVED.**

**Basis:** DR 0024 §6: "ADMIN/OPERATIONS — APPROVED. Operational
scope explicitly includes campaign/order/production/delivery management.
Initiating formal Approval requests is consistent with managing the
production-to-delivery workflow." Asset appears in the production-to-
delivery workflow; no target-type restriction applies to ADMIN/OPS
creation authority.

---

**CREATIVE/PRODUCTION — APPROVED (scope satisfied for Asset).**

**Basis:** DR 0024 §6: "CREATIVE/PRODUCTION — APPROVED, with scope
boundary. CREATIVE/PRODUCTION actors produce the work that is submitted
for approval. They are the natural initiators of Approval requests for
the output of their own production activity (e.g., submitting a
completed deliverable for review). Their creation authority is bounded
to targets within their production scope."

Asset is the canonical creative production deliverable. CREATIVE/
PRODUCTION actors generate, refine, and submit creative assets; the
Asset lifecycle (DR 0006) tracks exactly those items. "Submitting a
completed deliverable for review" — DR 0024's own example — describes
the act of initiating an Approval on an Asset row. The scope boundary
("targets within their production scope") is satisfied: Asset rows
fall squarely within CREATIVE/PRODUCTION's production scope.

**Classification: APPROVED.** The asterisk in DR 0024 §13 for
CREATIVE/PRODUCTION creation is resolved for Asset: the scope boundary
is met.

---

**QC — APPROVED (scope satisfied for Asset).**

**Basis:** DR 0024 §6: "QC — APPROVED, with scope boundary. QC actors
may initiate an Approval request for a target that has passed QC
review, routing it to a formal decision-maker as a handoff."

Asset specifically passes through QC Review. DR 0006 QC Boundary
establishes: "The QC Review entity owns the actual QC verdict; Asset
transitions react to that outcome as a guard." The `READY_FOR_QC →
CLIENT_PREVIEW` transition (DR 0006) is guarded by a QC pass — after
which the Asset is in `CLIENT_PREVIEW`, ready for client-facing review.
QC initiating an Approval request as a handoff after a QC pass is the
exact workflow DR 0024 §6 describes. The scope boundary ("a target
that has passed QC review") is satisfied: Asset rows are QC-reviewed
targets.

**Classification: APPROVED.** The asterisk in DR 0024 §13 for QC
creation is resolved for Asset: the scope boundary is met.

**Remaining deferred item:** whether QC initiation is mandatory
(all Assets passing QC require a formal Approval) or optional is
still **DEFERRED** (DR 0024 §23 item 2) — this record resolves the
*authority* question, not the *workflow policy* question.

---

**CLIENT — DEFERRED.**

**Basis:** DR 0024 §6: "CLIENT — DEFERRED. Whether a CLIENT role
actor may initiate Approval creation (as opposed to only deciding an
Approval) is not established by Gate 0 or any Decision Record
0001–0023." This deferral is unchanged by designation of Asset as a
target type. CLIENT's creation authority is separately deferred for
all target types (DR 0024 §22 item 3).

**Classification: DEFERRED (unchanged from DR 0024 §6).**

---

**AGENT — NOT APPROVED.**

**Basis:** DR 0024 §6: "AGENT — NOT APPROVED." Gate 0's least-
privilege characterization absolutely prohibits AGENT from initiating
formal Approval records. Applicable without qualification to Asset-
targeting Approvals.

**Classification: NOT APPROVED — closed APPROVED boundary,
not a deferral.**

### 7.2 Decision Authority (PENDING → APPROVED and PENDING → REJECTED)
### for Asset-Targeting Approvals

DR 0024 §7 analyzes PENDING → APPROVED and PENDING → REJECTED together
because they are two outcomes of the same decision event. The same
mapping applies to both for every role. This record adopts that
symmetry.

---

**OWNER — APPROVED.**

**Basis:** DR 0024 §7: "OWNER — APPROVED. Highest authority; may
execute the formal decision on any Approval." Subject only to
DR 0024 §5 creator/decision-maker separation (the OWNER individual
who created a specific Approval record may not also decide it).

---

**ADMIN/OPERATIONS — APPROVED (subject to §5 separation).**

**Basis:** DR 0024 §7: "ADMIN/OPERATIONS — APPROVED, with separation
constraint. Operational scope includes client/brand/campaign/order
management, which naturally encompasses the authority to render
formal decisions on targets within those domains." Subject to DR 0024
§5 (an ADMIN/OPS individual who created a specific record may not
decide that same record).

**Classification: APPROVED†** (subject to per-record creator/
decision-maker separation and tenant scope).

---

**CREATIVE/PRODUCTION — NOT APPROVED.**

**Basis:** DR 0024 §7: "CREATIVE/PRODUCTION — NOT APPROVED as
decision-maker. CREATIVE/PRODUCTION actors produce the targets being
approved. Allowing them to formally approve their own submitted work
would collapse the independence the formal-decision concept requires
and would directly violate §5's creator/decision-maker separation in
spirit, not only in its per-record letter. This exclusion is absolute:
CREATIVE/PRODUCTION may not execute PENDING → APPROVED or PENDING →
REJECTED."

This is an APPROVED exclusion. It applies to Asset-targeting Approvals
without qualification, notwithstanding that CREATIVE/PRODUCTION holds
creation authority for Asset-targeting Approvals (§7.1): the
creator/non-decider structure is precisely what DR 0024 §5 establishes
for this role.

**Classification: NOT APPROVED — closed APPROVED boundary.**

---

**QC — NOT APPROVED.**

**Basis:** DR 0024 §7: "QC — NOT APPROVED as Approval decision-maker.
QC verdicts are the domain of QC Review, a separate entity (DR 0010
§ QC Separation). QC may initiate Approval requests (§6) as a post-QC
handoff, but the Approval's formal binary decision (APPROVED/REJECTED)
is not a QC verdict and must not be executed by the QC role."

This is an APPROVED exclusion. For Asset-targeting Approvals
specifically: DR 0006 QC Boundary establishes that "QC verdicts are
not Asset states" and the "QC Review entity owns the actual QC
verdict." Collapsing the formal Approval decision with QC Review
would undo this boundary. QC may initiate Asset-targeting Approvals
(§7.1) as a handoff but may not decide them.

**Classification: NOT APPROVED — closed APPROVED boundary.**

---

**CLIENT — APPROVED (subject to §5 separation and contractual scope).**

**Basis:** DR 0024 §7: "CLIENT — APPROVED in principle. CLIENT is the
natural decision-maker for client-facing Approvals — decisions that
require external client authorization on deliverable work." DR 0024
§7: "CLIENT role actors may execute PENDING → APPROVED or PENDING →
REJECTED where the Approval concerns a target within the CLIENT's
contractual scope."

**Application to Asset:** §6 of this record established (from DR 0006)
that Asset is a client-facing target. Asset-targeting Approvals are
therefore within the domain of client-facing Approvals for which
CLIENT holds decision authority. Subject to: (a) DR 0024 §5
creator/decision-maker separation (a CLIENT individual who created
the Approval record may not also decide it — separation applies freshly
per record, though CLIENT creation authority is itself DEFERRED per
§7.1); (b) the CLIENT's contractual scope (which specific assets fall
within the client's contracted engagement — DEFERRED, DR 0024 §12
item 4).

**Classification: APPROVED†** (subject to per-record creator/decision-
maker separation and CLIENT contractual scope — scope definition
DEFERRED).

---

**AGENT — NOT APPROVED.**

**Basis:** DR 0024 §7: "AGENT — NOT APPROVED." Absolute exclusion.

**Classification: NOT APPROVED — closed APPROVED boundary.**

### 7.3 Cancellation Authority (PENDING → CANCELLED) for Asset-Targeting
### Approvals

---

**OWNER — APPROVED.** DR 0024 §9: "OWNER — APPROVED. Unrestricted
cancellation authority." No target-type restriction.

---

**ADMIN/OPERATIONS — APPROVED.** DR 0024 §9: "ADMIN/OPERATIONS —
APPROVED. Operational scope includes managing the campaign/order/
production workflow." Cancellation of an Asset-targeting Approval no
longer relevant is within operational authority. The note from DR 0024
§9 applies: cancellation does not override the Order completion guard
(DR 0012, 0019), and a CANCELLED Approval does not satisfy any
Required Approval obligation (DR 0017, 0018).

---

**CREATIVE/PRODUCTION — DEFERRED.**

**Basis:** DR 0024 §9: "CREATIVE/PRODUCTION — DEFERRED. A CREATIVE/
PRODUCTION actor who initiated an Approval request may have a
legitimate reason to withdraw it before a decision is made (e.g.,
discovering an error in the submitted target). Whether this self-
withdrawal is permitted, and whether it counts as 'cancellation' in
the same sense, is not established." This deferral applies to Asset-
targeting Approvals without additional basis for resolution here.

**Classification: DEFERRED (unchanged from DR 0024 §23 item 5).**

---

**QC — NOT APPROVED.** DR 0024 §9: "QC — NOT APPROVED. QC does not
own the Approval lifecycle (DR 0010 § QC Separation). QC may initiate
Approvals (§6) as a handoff but may not cancel them." APPROVED exclusion.

---

**CLIENT — DEFERRED.** DR 0024 §9: "CLIENT — DEFERRED. Whether a
CLIENT role actor may cancel an Approval request is not established."
DEFERRED unchanged.

---

**AGENT — NOT APPROVED.** DR 0024 §9: absolute exclusion for AGENT.

### 7.4 Expiration (PENDING → EXPIRED) for Asset-Targeting Approvals

**APPROVED:** PENDING → EXPIRED is system-driven. No actor — including
OWNER — executes or gates this transition. DR 0024 §5's creator/
decision-maker separation does not apply. No actor authorization check
is required. The expiration mechanism (scheduled job, on-read
evaluation, or other) and any per-type expiration policy remain
**DEFERRED** (DR 0024 §23 items 6 and 10).

## 8. Quote-Targeting Approvals — Role Authority Mapping

**PROPOSAL (for Owner approval):**

This section applies DR 0024's rationale to Approval records whose
target is a Quote row.

### 8.1 Creation Authority (→ PENDING) for Quote-Targeting Approvals

**OWNER — APPROVED.**

**Basis:** DR 0024 §6: unrestricted creation authority. No target-type
restriction applies to OWNER.

---

**ADMIN/OPERATIONS — APPROVED.**

**Basis:** DR 0024 §6: operational scope includes campaign/order
management. Quote is a commercial document in the campaign-to-order
workflow (DR 0005; DR 0002). Initiating an Approval on a Quote row
is within ADMIN/OPERATIONS' operational authority.

---

**CREATIVE/PRODUCTION — DEFERRED (scope not satisfied for Quote).**

**Basis:** DR 0024 §6: "CREATIVE/PRODUCTION — APPROVED, with scope
boundary. Their creation authority is bounded to targets within their
production scope."

Quote is a commercial pricing and scope document (DR 0005), not a
creative production deliverable. CREATIVE/PRODUCTION actors work on
creative assets (images, videos, designs — entities like Asset) within
their defined production scope. No prior Decision Record 0001–0028
establishes that CREATIVE/PRODUCTION actors produce Quote rows or that
Quote lifecycle falls within their production scope. DR 0005 defines
Quote states (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CANCELLED)
and their commercial guards (Cost Check, Margin Check) — none of which
involve CREATIVE/PRODUCTION actors as initiators.

The scope boundary in DR 0024 §6 is not satisfied for Quote: Quote
rows are commercial documents outside CREATIVE/PRODUCTION's established
production scope. Asserting otherwise would require inventing a
business rule not established by any prior record.

**Classification: DEFERRED.** Absent an explicit decision establishing
that CREATIVE/PRODUCTION may initiate Approvals on commercial Quote
documents, the scope boundary is unresolved for this target type. This
is a downstream governance question, not an APPROVED boundary or an
APPROVED extension.

---

**QC — DEFERRED (scope not satisfied for Quote).**

**Basis:** DR 0024 §6: "QC — APPROVED, with scope boundary. QC actors
may initiate an Approval request for a target that has passed QC
review, routing it to a formal decision-maker as a handoff."

Quote does not pass through QC Review. DR 0005's lifecycle (DRAFT,
SENT, ACCEPTED, REJECTED, EXPIRED, CANCELLED) includes no QC step and
no QC guard. DR 0006 establishes QC Review as a mechanism for Asset
lifecycle; no corresponding mechanism exists for Quote in DR 0005 or
any other Decision Record 0001–0028. The scope boundary in DR 0024 §6
("a target that has passed QC review") is not satisfied for Quote: no
QC review occurs in the Quote lifecycle.

**Classification: DEFERRED.** Whether QC role actors ever have grounds
to initiate a Quote-targeting Approval is not established by any prior
record and is not a question this record can resolve without inventing
a business rule.

---

**CLIENT — DEFERRED.**

**Basis:** DR 0024 §6: same general deferral as for Asset. CLIENT
creation authority is unresolved for all target types (DR 0024 §22
item 3). No additional basis exists to resolve it specifically for
Quote-targeting Approvals.

**Classification: DEFERRED (unchanged from DR 0024 §6).**

---

**AGENT — NOT APPROVED.**

**Basis:** DR 0024 §6: absolute exclusion. Applicable without
qualification to Quote-targeting Approvals.

**Classification: NOT APPROVED — closed APPROVED boundary.**

### 8.2 Decision Authority (PENDING → APPROVED and PENDING → REJECTED)
### for Quote-Targeting Approvals

DR 0024 §7's symmetry (same mapping for APPROVED and REJECTED outcomes)
applies here identically to §7.2 above.

---

**OWNER — APPROVED.**

**Basis:** DR 0024 §7: unrestricted, subject to creator/decision-maker
separation. Applies without target-type restriction.

---

**ADMIN/OPERATIONS — APPROVED (subject to §5 separation).**

**Basis:** DR 0024 §7: operational scope includes client/brand/campaign/
order management. Quote approval is squarely within that scope —
Quote is the commercial document that bridges campaign and order
(DR 0002; DR 0005). Subject to DR 0024 §5.

**Classification: APPROVED†** (subject to per-record creator/
decision-maker separation and tenant scope).

---

**CREATIVE/PRODUCTION — NOT APPROVED.**

**Basis:** DR 0024 §7: absolute exclusion. CREATIVE/PRODUCTION may not
execute PENDING → APPROVED or PENDING → REJECTED for any Approval.
This closed boundary applies regardless of target type and regardless
of the creation-authority determination in §8.1.

**Classification: NOT APPROVED — closed APPROVED boundary.**

---

**QC — NOT APPROVED.**

**Basis:** DR 0024 §7: absolute exclusion. QC may not execute formal
Approval decisions for any target type. Applicable without
qualification to Quote-targeting Approvals.

**Classification: NOT APPROVED — closed APPROVED boundary.**

---

**CLIENT — APPROVED (subject to §5 separation and contractual scope).**

**Basis:** DR 0024 §7: CLIENT is the natural decision-maker for client-
facing Approvals. §6 of this record established (from DR 0005) that
Quote is a client-facing target — a commercial offer presented to the
client for acceptance or rejection. Quote-targeting Approvals are
therefore within the domain of client-facing Approvals for which
CLIENT holds decision authority.

**DR 0028 §8 item 7** (the activated consequence of designating Quote)
states: "Quote ACCEPTED, an Approval record targeting that Quote, and
Order creation are three separate events." This confirms that a CLIENT
deciding an Approval targeting a Quote row is a distinct event from
the Quote's own state machine (DR 0005). CLIENT executing PENDING →
APPROVED on a Quote-targeting Approval is not the same event as the
Quote transitioning to ACCEPTED.

Subject to: (a) DR 0024 §5 creator/decision-maker separation; (b) the
CLIENT's contractual scope (which Quotes fall within the client's
contracted engagement — DEFERRED, DR 0024 §12 item 4).

**Classification: APPROVED†** (subject to per-record creator/
decision-maker separation and CLIENT contractual scope — scope
definition DEFERRED).

---

**AGENT — NOT APPROVED.**

**Basis:** DR 0024 §7: absolute exclusion.

**Classification: NOT APPROVED — closed APPROVED boundary.**

### 8.3 Cancellation Authority (PENDING → CANCELLED) for Quote-Targeting
### Approvals

**OWNER — APPROVED.** Unrestricted. DR 0024 §9. Same as Asset.

**ADMIN/OPERATIONS — APPROVED.** DR 0024 §9. Same as Asset.
Cancellation of a Quote-targeting Approval no longer relevant is
within operational authority. CANCELLED Approval does not satisfy any
Required Approval obligation.

**CREATIVE/PRODUCTION — DEFERRED.** DR 0024 §9 / §23 item 5. Same
deferral as Asset. Whether CREATIVE/PRODUCTION may withdraw a Approval
request is unresolved. For Quote-targeting Approvals specifically: since
CREATIVE/PRODUCTION creation authority is itself DEFERRED for Quote
(§8.1), the withdrawal scenario is also DEFERRED.

**QC — NOT APPROVED.** DR 0024 §9. APPROVED exclusion. Same as Asset.

**CLIENT — DEFERRED.** DR 0024 §9 / §23 item 5. Same deferral as
Asset.

**AGENT — NOT APPROVED.** DR 0024 §9, §11. Absolute exclusion.

### 8.4 Expiration (PENDING → EXPIRED) for Quote-Targeting Approvals

**APPROVED:** system-driven. No actor executes or gates this transition.
Expiration mechanism and any per-type expiration policy remain
**DEFERRED** (DR 0024 §23 items 6 and 10).

## 9. Role Authority Matrix — Asset-Targeting Approvals

| Transition | OWNER | ADMIN/OPS | CREATIVE/PROD | QC | CLIENT | AGENT |
|---|---|---|---|---|---|---|
| Create (→ PENDING) | APPROVED | APPROVED | APPROVED‡ | APPROVED§ | DEFERRED | NOT APPROVED |
| PENDING → APPROVED | APPROVED | APPROVED† | NOT APPROVED | NOT APPROVED | APPROVED† | NOT APPROVED |
| PENDING → REJECTED | APPROVED | APPROVED† | NOT APPROVED | NOT APPROVED | APPROVED† | NOT APPROVED |
| PENDING → CANCELLED | APPROVED | APPROVED | DEFERRED | NOT APPROVED | DEFERRED | NOT APPROVED |
| PENDING → EXPIRED | System | System | System | System | System | System |

‡ CREATIVE/PRODUCTION creation for Asset: scope boundary satisfied — Asset is a
creative production deliverable within their established production scope.

§ QC creation for Asset: scope boundary satisfied — Asset passes through QC
Review; QC handoff is the established post-QC pattern (DR 0006, DR 0024 §6).
Whether QC initiation is mandatory or optional remains **DEFERRED** (DR 0024
§23 item 2).

† Subject to DR 0024 §5 creator/decision-maker separation (same individual may
not both create and decide the same record). CLIENT decision authority applies
to client-facing Approvals within CLIENT's contractual scope; contractual scope
definition remains **DEFERRED** (DR 0024 §12 item 4).

## 10. Role Authority Matrix — Quote-Targeting Approvals

| Transition | OWNER | ADMIN/OPS | CREATIVE/PROD | QC | CLIENT | AGENT |
|---|---|---|---|---|---|---|
| Create (→ PENDING) | APPROVED | APPROVED | DEFERRED | DEFERRED | DEFERRED | NOT APPROVED |
| PENDING → APPROVED | APPROVED | APPROVED† | NOT APPROVED | NOT APPROVED | APPROVED† | NOT APPROVED |
| PENDING → REJECTED | APPROVED | APPROVED† | NOT APPROVED | NOT APPROVED | APPROVED† | NOT APPROVED |
| PENDING → CANCELLED | APPROVED | APPROVED | DEFERRED | NOT APPROVED | DEFERRED | NOT APPROVED |
| PENDING → EXPIRED | System | System | System | System | System | System |

† Subject to DR 0024 §5 creator/decision-maker separation. CLIENT decision
authority applies to client-facing Approvals within CLIENT's contractual scope;
contractual scope definition remains **DEFERRED** (DR 0024 §12 item 4).

## 11. Where Asset and Quote Mappings Are Identical

**FACT:** comparing §9 and §10, the following role-transition
combinations produce identical authority outcomes for both Asset-
targeting and Quote-targeting Approvals:

| Transition | OWNER | ADMIN/OPS | CREATIVE/PROD | QC | CLIENT | AGENT |
|---|---|---|---|---|---|---|
| PENDING → APPROVED | same | same | same | same | same | same |
| PENDING → REJECTED | same | same | same | same | same | same |
| PENDING → CANCELLED | same | same | same | same | same | same |
| PENDING → EXPIRED | same | same | same | same | same | same |

All decision authority mappings (PENDING → APPROVED and PENDING →
REJECTED) are identical across both target types. All cancellation
authority mappings are identical. Expiration is system-driven for both.

**INFERENCE:** the decision authority framework established by DR 0024
applies uniformly across both designated target types. The fundamental
authority structure — OWNER and ADMIN/OPS decide, CLIENT decides for
client-facing Approvals, CREATIVE/PROD and QC are absolutely excluded,
AGENT is absolutely excluded — is target-type-invariant for the current
two designated types.

## 12. Where Asset and Quote Mappings Differ

**FACT:** the only difference between the two per-type matrices is in
**creation authority (→ PENDING)**:

| Role | Asset | Quote | Reason for difference |
|---|---|---|---|
| CREATIVE/PROD | APPROVED‡ | DEFERRED | Asset is a creative production deliverable (scope boundary met); Quote is a commercial document (scope boundary not established) |
| QC | APPROVED§ | DEFERRED | Asset passes through QC Review (scope boundary met); Quote has no QC involvement (scope boundary not met) |

All other role-transition combinations are identical.

**APPROVED observation:** the two roles whose creation authority differs
between target types — CREATIVE/PRODUCTION and QC — both have their
DR 0024 §6 scope boundary resolved for Asset and unresolved for Quote.
The scope boundary mechanism in DR 0024 §6 is working as designed:
it produces different results for different target types without
modifying the underlying authority rule.

## 13. Creator/Decision-Maker Separation Applied Per-Type

**APPROVED (reaffirmed from DR 0024 §5, applied to both types):**

The per-record, per-individual creator/decision-maker separation
applies to every Asset-targeting and every Quote-targeting Approval
record, exactly as it applies to any Approval record. The separation
is:

- **Per-record:** it applies to a specific Approval record. The same
  individual in a role may create some Approval records and decide
  others, so long as they do not do both on the same record.
- **Per-individual:** a CREATIVE/PRODUCTION actor who created a
  specific Asset-targeting Approval record may not decide that same
  record. An ADMIN/OPS actor who created a specific Quote-targeting
  Approval record may not decide that same record. A CLIENT actor (if
  and when CLIENT creation authority is resolved) who created a
  specific Approval record may not decide that same record.
- **Applies only to APPROVED/REJECTED:** not to CANCELLED (no merit
  decision) and not to EXPIRED (system-driven).
- **Per new Approval cycle:** DR 0024 §15 applies — a new Approval
  record for a revised Asset or a new Quote cycle starts fresh; prior
  record identities do not constrain it.

**The tracking mechanism** by which the system records the initiating
actor remains **DEFERRED** (DR 0024 §23 item 7; DR 0028 §21 item 11).
This record states the structural requirement; implementation is
downstream.

## 14. AGENT Authority — Consolidated for Both Target Types

**APPROVED boundary, unchanged from DR 0024 §11:**

AGENT is excluded from all actor roles on all Approval transitions,
for both Asset-targeting and Quote-targeting Approvals, without
exception:

1. AGENT may not create Approval records (→ PENDING) — DR 0024 §6, §11.
2. AGENT may not execute PENDING → APPROVED — DR 0024 §7, §11.
3. AGENT may not execute PENDING → REJECTED — DR 0024 §7, §11.
4. AGENT may not execute PENDING → CANCELLED — DR 0024 §9, §11.
5. PENDING → EXPIRED is system-driven; AGENT has no role — DR 0024 §10.

This is a closed APPROVED boundary, not a deferral. Target-type
designation does not open, qualify, or defer any part of AGENT's
exclusion.

## 15. Absolute Exclusions — Consolidated for Both Target Types

**APPROVED, from DR 0024 §7:**

The following are closed APPROVED exclusions for all actor-initiated
transitions for both target types:

- **CREATIVE/PRODUCTION may not execute PENDING → APPROVED or PENDING
  → REJECTED** for any Approval record, including Asset-targeting and
  Quote-targeting records. This is independent of CREATIVE/PRODUCTION's
  creation authority (APPROVED for Asset, DEFERRED for Quote).

- **QC may not execute PENDING → APPROVED or PENDING → REJECTED** for
  any Approval record, including Asset-targeting and Quote-targeting
  records. This is independent of QC's creation authority (APPROVED for
  Asset, DEFERRED for Quote).

These exclusions are not reversible by target-type designation. They
hold as APPROVED boundaries for every Approval record in the system,
present and future.

## 16. Remaining Deferred Items After This Record

The following remain explicitly DEFERRED after this record:

**Target-type-agnostic deferrals (carried forward from DR 0024 §23):**

1. **CLIENT creation authority** for all target types (DR 0024 §6,
   §22 item 3) — not resolved by this record for Asset or Quote.
2. **CREATIVE/PRODUCTION cancellation authority** in self-withdrawal
   scenarios (DR 0024 §9, §23 item 5) — for both target types.
3. **CLIENT cancellation authority** (DR 0024 §9, §23 item 5) — for
   both target types.
4. **Workflow routing mechanism** — how PENDING Approvals are assigned
   to and surfaced for decision-makers, per target type (DR 0024 §23
   item 4; DR 0028 §21 item 7).
5. **Actor attribution implementation mechanism** (DR 0024 §14, §23
   item 7; DR 0028 §21 item 11).
6. **Expiration mechanism**, duration, and per-type policy (DR 0024
   §23 item 6; DR 0028 §10 item 13).
7. **Delegation model** — whether OWNER may delegate decision authority
   (DR 0024 §23 item 8).
8. **Tenant/RLS enforcement mechanism** for actor authority (DR 0024
   §23 item 9; DR 0028 §21 item 14).

**Asset-specific deferrals:**

9. **QC mandatory-vs.-optional initiation** for Asset-targeting
   Approvals (DR 0024 §23 item 2) — QC creation authority is APPROVED
   for Asset; whether it is required or optional is separately DEFERRED.
10. **Pre-condition on Asset state** at Approval-targeting time (DR 0028
    §10 item 2) — which Asset lifecycle states are valid target states.

**Quote-specific deferrals:**

11. **CREATIVE/PRODUCTION creation authority for Quote-targeting
    Approvals** — DEFERRED in this record; requires a separate decision
    establishing that CREATIVE/PRODUCTION actors' production scope
    includes commercial Quote documents.
12. **QC creation authority for Quote-targeting Approvals** — DEFERRED
    in this record; requires a separate decision establishing a
    QC-Quote connection.
13. **Pre-condition on Quote state** at Approval-targeting time (DR 0028
    §10 item 7) — which Quote lifecycle states are valid target states.
14. **Temporal ordering** of Approval decision and Quote state transition
    (DR 0028 §10 item 9) — not established.
15. **CLIENT contractual scope definition** — per both target types
    (DR 0024 §12 item 4; DR 0028 §10 items 6 and 8).

**Prior deferrals unchanged:**

16. All deferred items from DR 0005, DR 0006, DR 0010, DR 0023–0028
    not addressed in this record remain independently open and unchanged.
    This record does not close any deferred item other than DR 0024 §23
    item 1 (for Asset and Quote).

## 17. Interaction: DR 0012 Order Completion Guard

**No change. APPROVED (reaffirmed from DR 0024 §17, DR 0028 §11):**
the Order `ACTIVE` → `COMPLETED` guard evaluates Required Approval
satisfaction independently of which role executed the PENDING →
APPROVED transition. The actor identity is orthogonal to the guard
evaluation. This record does not affect DR 0012.

## 18. Interaction: DR 0017–0022 Requirement Satisfaction

**No conflict. APPROVED (reaffirmed from DR 0028 §12):**
satisfaction of a Required Approval uses the Required Approval's own
identity — independent of actor role and target type. Per-type role
authority does not alter the satisfaction mechanics. AND-semantics,
one-to-one default, and historical integrity of satisfaction records
are unaffected.

## 19. Interaction: DR 0024 Role Authority Matrix (General)

**No modification. APPROVED:**

DR 0024 §13's general Role Authority Matrix remains authoritative. This
record produces per-type refinements — filling in the scope-boundary
detail for the asterisks (*) in DR 0024 §13 for Asset and Quote
specifically. It does not replace the general matrix. The general matrix
governs any future target type; this record's per-type tables govern
only Asset-targeting and Quote-targeting Approvals.

**APPROVED (applied from DR 0024 §13):** for Asset-targeting Approvals,
the asterisk (*) for CREATIVE/PRODUCTION creation is resolved as
APPROVED‡; the asterisk (*) for QC creation is resolved as APPROVED§.
For Quote-targeting Approvals, both asterisks are resolved as DEFERRED.
For both target types, the dagger (†) for ADMIN/OPS and CLIENT decision
authority carries through unchanged.

## 20. Interaction: DR 0028 Designation

**Consistent. APPROVED (applied from DR 0028 §10 items 3 and 8,
§21 item 2):**

DR 0028 explicitly identified role-per-target-type mapping as a
downstream task gated on designation (DR 0028 §10 items 3 and 8;
§21 item 2). This record is that downstream task. DR 0028 is not
modified; no designation is altered; no new target type is introduced.

DR 0028 §8 item 5 noted: "CLIENT role scope definition for Quote-
targeting is a primary candidate" for CLIENT decision authority. This
record confirms CLIENT decision authority as APPROVED† for Quote-
targeting Approvals (§8.2), consistent with that observation.

## 21. Interaction: DR 0006 Asset Lifecycle

**No change to DR 0006.** Asset's state machine (UPLOADED, PROCESSING,
READY_FOR_QC, CLIENT_PREVIEW, REVISION_REQUIRED, REJECTED) is
unmodified. `APPROVED` remains not an Asset state. The role authority
mapping in this record governs who creates and decides Approval records
that *target* Asset rows; it does not modify what Asset rows do in
response.

## 22. Interaction: DR 0005 Quote Lifecycle

**No change to DR 0005.** Quote's state machine (DRAFT, SENT, ACCEPTED,
REJECTED, EXPIRED, CANCELLED) is unmodified. `APPROVED` is not a Quote
state. DR 0028 §8 item 8 (the consequence activated by Quote's
designation) is not modified: "An Approval record's terminal state of
APPROVED is not a Quote state." The role authority mapping in this
record governs who creates and decides Approval records that *target*
Quote rows; it does not modify what Quote rows do in response.

## 23. Historical Integrity

**Reaffirmed, unchanged from DR 0014 §14 through DR 0028 §17:**

Once an Approval record is created targeting an Asset or Quote row,
the identity of the actor who created it and the actor who decided it
are part of that Approval record's permanent, non-revisable history.
Per-record creator/decision-maker separation (§13) depends on this
permanence. The implementation mechanism for preserving this identity
remains **DEFERRED** (DR 0024 §23 item 7), unchanged.

## 24. Security / Tenancy

**APPROVED principle, unchanged from DR 0002 D1, DR 0024 §20,
DR 0028 §18:**

Any actor executing a transition on an Asset-targeting or Quote-
targeting Approval must belong to the same organization as the Approval
record, the targeted Asset or Quote row, and the Order that ultimately
governs the Required Approval obligation. Cross-tenant actor authority
is never permitted. Enforcement mechanism remains **DEFERRED**
(DR 0024 §23 item 9; DR 0028 §21 item 14).

## 25. Financial Separation

Unchanged from every prior record. No role authority mapping established
here implies, triggers, or is inferred from Payment, Revenue, Expense,
Profit, Refund, or Owner Settlement. ADMIN/OPERATIONS' decision authority
over Asset-targeting and Quote-targeting Approvals does not grant payment
or financial-override authority (consistent with Gate 0).

## 26. Rejected Alternatives

- Granting CREATIVE/PRODUCTION creation authority for Quote-targeting
  Approvals — rejected; no prior Decision Record 0001–0028 establishes
  that CREATIVE/PRODUCTION actors' production scope includes commercial
  Quote documents; asserting otherwise invents a business rule (§8.1).
- Granting QC creation authority for Quote-targeting Approvals —
  rejected; Quote does not pass through QC Review; no QC-Quote
  connection is established in DR 0001–0028 (§8.1).
- Treating the "client-facing" characterization as an inference rather
  than an APPROVED application — rejected; the phrase "client-facing
  review" appears verbatim in DR 0006's Approved Approval/Delivery
  Boundary; it is a FACT from a primary source, not an inference (§6).
- Allowing CREATIVE/PRODUCTION to decide Approvals on Asset targets
  — rejected; DR 0024 §7's absolute exclusion applies regardless of
  the target type and regardless of CREATIVE/PRODUCTION's creation
  authority for that type (§7.2, §15).
- Allowing QC to decide Approvals on Asset targets — rejected; DR 0024
  §7's absolute exclusion applies; collapsing QC verdicts with Approval
  decisions would undo the QC/Approval separation (DR 0006 QC Boundary,
  DR 0010 § QC Separation) (§7.2, §15).
- Resolving CLIENT creation authority for Asset or Quote — rejected;
  this is a separate deferred item (DR 0024 §22 item 3) not gated on
  target-type designation; no prior record supplies the basis to resolve
  it (§16 item 1).
- Collapsing the two per-type matrices into one combined matrix —
  rejected; the difference in CREATIVE/PROD and QC creation authority
  between Asset and Quote is real and non-trivial; a combined matrix
  would obscure it.
- Establishing pre-conditions on Asset or Quote state at targeting time
  — rejected; this is a downstream engineering task (DR 0028 §10 items
  2 and 7); no prior record establishes these pre-conditions (§16 items
  10 and 13).
- Claiming that CLIENT's contractual scope is fully defined by the
  client-facing characterization alone — rejected; DR 0024 §12 item 4
  explicitly defers contractual scope; the client-facing characterization
  establishes the *domain* of CLIENT authority, not the *boundary* of
  each client's specific scope (§7.2, §8.2).
- Modifying DR 0024's general Role Authority Matrix — rejected; this
  record fills in the scope-boundary detail for the asterisk entries
  for two specific target types; it does not replace or modify the
  general matrix (§19).

## 27. Deferred Decisions

The following are explicitly DEFERRED after this record's proposed
approval:

1. **CLIENT creation authority** for Asset-targeting and Quote-targeting
   Approvals (DR 0024 §22 item 3).
2. **CREATIVE/PRODUCTION creation authority for Quote-targeting
   Approvals** — requires a separate designation decision.
3. **QC creation authority for Quote-targeting Approvals** — requires
   a separate designation decision.
4. **QC mandatory-vs.-optional initiation for Asset-targeting
   Approvals** (DR 0024 §23 item 2).
5. **CREATIVE/PRODUCTION and CLIENT cancellation authority** for both
   target types (DR 0024 §23 item 5).
6. **CLIENT contractual scope definition** per target type (DR 0024
   §12 item 4).
7. **Pre-condition on Asset state** at Approval-targeting time (DR 0028
   §10 item 2).
8. **Pre-condition on Quote state** at Approval-targeting time (DR 0028
   §10 item 7).
9. **Temporal ordering** of Approval decision and Quote state transition
   (DR 0028 §10 item 9).
10. **Workflow routing mechanism** for Asset-targeting and Quote-targeting
    Approvals (DR 0024 §23 item 4).
11. **Actor attribution implementation** (DR 0024 §23 item 7).
12. **Expiration mechanism, duration, and per-type policy** (DR 0024
    §23 item 6).
13. **Delegation model** (DR 0024 §23 item 8).
14. **Tenant/RLS enforcement mechanism** for actor authority (DR 0024
    §23 item 9).
15. **All prior deferred items from DR 0001–0028** not addressed here
    remain independently open and unchanged.

## 28. Final Recommendation

**PROPOSAL — presented for Owner approval:**

Applying DR 0024's Role Authority Matrix and rationale to each
designated V1 Approval target type, the per-type role authority
boundaries are as follows:

**For Asset-targeting Approvals:**

- **OWNER** — creation and full decision authority (APPROVED/REJECTED/
  CANCELLED), subject only to per-record creator/decision-maker
  separation.
- **ADMIN/OPERATIONS** — creation and full decision authority, subject
  to per-record creator/decision-maker separation and tenant scope.
- **CREATIVE/PRODUCTION** — creation authority APPROVED (Asset is
  within their production scope); decision authority (APPROVED/REJECTED)
  absolutely excluded.
- **QC** — creation authority APPROVED (Asset is QC-reviewed; handoff
  is the established pattern); decision authority absolutely excluded.
  Mandatory vs. optional initiation remains DEFERRED.
- **CLIENT** — decision authority APPROVED† for client-facing
  Approvals within contractual scope (scope definition DEFERRED);
  creation authority DEFERRED.
- **AGENT** — absolutely excluded from all actor roles.

**For Quote-targeting Approvals:**

- **OWNER** — creation and full decision authority, same as Asset.
- **ADMIN/OPERATIONS** — creation and full decision authority, same as
  Asset.
- **CREATIVE/PRODUCTION** — creation authority DEFERRED (Quote is
  outside established production scope); decision authority absolutely
  excluded.
- **QC** — creation authority DEFERRED (Quote has no QC lifecycle
  involvement); decision authority absolutely excluded.
- **CLIENT** — decision authority APPROVED† for client-facing
  Approvals within contractual scope (Quote is inherently client-
  facing; scope definition DEFERRED); creation authority DEFERRED.
- **AGENT** — absolutely excluded from all actor roles.

**Key structural result:** decision authority mapping (PENDING →
APPROVED and PENDING → REJECTED) is **identical** across both
designated target types. Creation authority mapping differs for
CREATIVE/PRODUCTION (APPROVED for Asset, DEFERRED for Quote) and QC
(APPROVED for Asset, DEFERRED for Quote), in direct application of
DR 0024 §6's scope boundaries to the characteristics of each target
type.

This mapping is consistent with DR 0024 §13 (general matrix), DR 0028
§13 (actor authority is independent of target type and not modified by
designation), and all prior records 0001–0028. No existing authority
boundary, absolute exclusion, or structural principle is modified.

## Consistency with Decision Records 0001–0028

- Consistent with 0001/0002: no schema, no new entity, no new role;
  tenant isolation preserved (§24); UUID identity unaffected.
- Consistent with 0003–0009: no lifecycle state machine is modified;
  no new state values or transitions introduced.
- Consistent with 0010: QC/Approval separation upheld (§15); revision
  separation upheld (§13); historical integrity preserved (§23).
- Consistent with 0011/0012: Order completion guard unaffected (§17);
  Delivery unaffected.
- Consistent with 0013–0016: Order Requirements Snapshot unaffected;
  upstream commercial content still unapproved.
- Consistent with 0017–0022: satisfaction mechanics unaffected (§18);
  AND-semantics and one-to-one default unchanged.
- Consistent with 0023: Model A target structure unaffected; this
  record governs actor authority, not target model shape.
- Consistent with 0024: Role Authority Matrix not modified (§19);
  scope-boundary detail filled in for two target types only.
- Consistent with 0025: candidate inventory unchanged; no new
  candidates introduced or removed.
- Consistent with 0026: Delivery standing unchanged.
- Consistent with 0027: governance framework (three constraints)
  unchanged; this record operates downstream of Constraint C.
- Consistent with 0028: designation unchanged; per-type mapping is
  the gated downstream task explicitly listed as DR 0028 §21 item 2.
- No Decision Record 0001–0028 is modified, reinterpreted, or
  superseded by this record.

## Explicitly Prohibited Assumptions

- Do not assume CREATIVE/PRODUCTION holds creation authority for
  Quote-targeting Approvals — DEFERRED (§8.1).
- Do not assume QC holds creation authority for Quote-targeting
  Approvals — DEFERRED (§8.1).
- Do not assume CREATIVE/PRODUCTION may execute PENDING → APPROVED or
  PENDING → REJECTED for any Approval (§15).
- Do not assume QC may execute PENDING → APPROVED or PENDING →
  REJECTED for any Approval (§15).
- Do not assume AGENT holds any actor authority for any Approval on
  any target type (§14).
- Do not assume CLIENT holds creation authority for Asset-targeting or
  Quote-targeting Approvals — DEFERRED (§7.1, §8.1).
- Do not assume CLIENT holds cancellation authority for any Approval —
  DEFERRED (§7.3, §8.3).
- Do not assume CLIENT's contractual scope is defined or bounded
  beyond "client-facing Approvals within contractual scope" —
  DEFERRED (§16 item 15).
- Do not assume QC initiation is mandatory for Asset-targeting
  Approvals — DEFERRED (§16 item 9).
- Do not assume pre-conditions on Asset or Quote state at targeting
  time have been decided (§16 items 10, 13).
- Do not assume a mechanism for routing Approvals to decision-makers
  has been designed (§16 item 10).
- Do not assume actor attribution implementation has been specified
  (§16 item 11).
- Do not assume a delegation model has been approved (§16 item 13).
- Do not assume the Approval's APPROVED terminal state advances or
  modifies Asset's or Quote's own lifecycle state (§21, §22).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0028 have been altered,
  reinterpreted, or superseded — all remain authoritative and
  unchanged.
