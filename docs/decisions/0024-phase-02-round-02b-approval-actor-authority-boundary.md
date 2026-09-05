# Decision Record 0024 — Phase 02 Round 02B: Approval Actor & Authority Boundary

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED — actor authority for each approved Approval
  transition is decided at the RBAC-role level (§5–§12, §16); the
  physical authorization mechanism, role-per-target-type mapping,
  delegation model, and expiration mechanism remain explicitly DEFERRED
  (§22). No field, table, migration, or state is approved by this record.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0023. All remain authoritative and unchanged. This record directly
  addresses Deferred Items 4, 5, 6, and 9 from Decision Record 0010,
  using the Gate 0 RBAC foundation provided for this task as the
  authoritative role/authority inputs.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Service and
Package remain **UNVERIFIED** as entities, unchanged from 0013–0023.
The Gate 0 RBAC role definitions (OWNER, ADMIN/OPERATIONS,
CREATIVE/PRODUCTION, QC, CLIENT, AGENT) are treated as authoritative
inputs to this record per the task's explicit provision of them.

## 1. Context

Decision Record 0010 established Approval's lifecycle and explicitly
deferred: (4) who may create an Approval; (5) who may approve/reject/
cancel; (6) Client vs. internal Approval semantics; (9) cancellation
authorization. Decision Record 0023 established the target *shape*
(Model A) without resolving the target *type set*. Decision Records
0017–0022 established satisfaction/qualification mechanics that are
logically independent of the actor question. This record is asked to
resolve the actor/authority question across all four approved Approval
transitions (PENDING → APPROVED, PENDING → REJECTED, PENDING →
CANCELLED, PENDING → EXPIRED), using the Gate 0 RBAC foundation as the
authoritative input — without inventing roles, permissions, workflows, or
implementation details, and without resolving DR 0023's deferred
target-type set.

## 2. Problem

An Approval in PENDING state carries two distinct authority questions
that must be kept separate: (a) *creation authority* — which role(s)
may initiate a formal Approval request, placing a new record in PENDING;
and (b) *decision authority* — which role(s) may execute a transition
out of PENDING (to APPROVED, REJECTED, CANCELLED, or EXPIRED).
These two authorities need not belong to the same role, and conflating
them would undermine the formal-decision integrity that Decision Record
0010's design principle ("Approval records the formal decision on a
target; it does not own the lifecycle of the target itself") depends on.
This record answers (a) and (b) independently for each approved
transition, and names precisely which portions are further deferred.

## 3. Approved Inputs

- **0010 Deferred Items 4, 5, 6, 9:** who creates, who decides,
  client semantics, cancellation authorization — the four gaps this
  record closes, or explicitly re-defers with their reason named.
- **0010 design principle:** "Approval records the formal decision on
  a target. It does not own the lifecycle of the target itself." This
  implies a decision-maker who is meaningfully distinct from and
  authoritative over whatever process produced the target.
- **0010 § Revision Separation:** a rejected or failed Approval produces
  a new Approval record, not a reopening — the historical record of who
  decided what, and when, is never overwritten. This is a prerequisite
  for audit traceability (§14).
- **0010 § QC Separation:** QC verdicts and Approval decisions are
  separate concepts; this record must not collapse them.
- **0002 D1:** tenant isolation via composite FK. The actor must belong
  to the same organization as the Approval.
- **Gate 0 RBAC foundation (provided as authoritative input for this
  record):**
  - **OWNER:** highest authority; governs critical financial, system,
    and security decisions.
  - **ADMIN/OPERATIONS:** operational authority — client/brand/campaign/
    order/production/delivery/notifications/reports; no automatic money
    withdrawal or payment bypass.
  - **CREATIVE/PRODUCTION:** produces deliverable work.
  - **QC:** quality control verdicts.
  - **CLIENT:** external client participant.
  - **AGENT:** least privilege — explicitly cannot: withdraw money
    unrestrictedly, refund without limit, change pricing, override
    payment or security controls, change permissions, bypass QC, disable
    audit, or spend beyond approved limits.
  - **Role hierarchy:** OWNER > ADMIN/OPERATIONS > operational roles
    (CREATIVE/PRODUCTION, QC, CLIENT) > AGENT.

## 4. Two Authority Questions

**APPROVED analytical distinction (the central frame of this record):**

- **Creation authority:** the role(s) authorized to initiate a formal
  Approval request, causing a new record to enter PENDING. The initiator
  does not decide the outcome; they only assert that the target is ready
  for a formal decision.
- **Decision authority:** the role(s) authorized to execute PENDING →
  APPROVED or PENDING → REJECTED — the formal decision itself. This
  role must be independently authoritative over the target and the
  context in which the decision is made.

These two questions are analyzed separately for each transition below.
Where they converge (both authorities assigned to the same role),
that convergence is explicitly noted and justified; where they must
diverge (for structural or integrity reasons), the separation is stated.

## 5. Creator and Decision-Maker Separation

**APPROVED structural principle:** the actor who creates a specific
Approval record (initiating PENDING) must not be the same individual
actor who executes PENDING → APPROVED or PENDING → REJECTED for that
same record. This separation follows necessarily from Decision Record
0010's design principle: a "formal decision" on a target is meaningless
if the actor who requests the decision can also unilaterally deliver it
for their own submission.

**Scope of this principle:** the separation is per-record and
per-individual — the same *role* (e.g., ADMIN/OPERATIONS) may both
initiate some Approvals and decide others within their operational
scope, so long as a specific individual in that role cannot both initiate
and decide the *same* Approval record. This record establishes the
*structural principle*; the mechanism by which the system tracks the
initiating actor on each record is an implementation concern, not a
schema approved here.

**Inapplicability to CANCELLED and EXPIRED:** §5's creator/decision-
maker separation applies only to the APPROVED and REJECTED outcomes —
the outcomes that constitute a "formal decision on the merits." The
CANCELLED transition is termination before any merit-based decision
(§9), and EXPIRED is system-driven with no actor at all (§10), so the
per-record creator/decider constraint does not apply to either.

## 6. Approval Creation — PENDING Initiation

**Who may place an Approval in PENDING (create a new Approval record):**

- **OWNER — APPROVED.** Highest authority; may initiate any Approval
  request. No restriction.
- **ADMIN/OPERATIONS — APPROVED.** Operational scope explicitly includes
  campaign/order/production/delivery management. Initiating formal
  Approval requests is consistent with managing the production-to-
  delivery workflow. No restriction beyond tenant scope (0002 D1) and
  §5's creator/decision-maker separation.
- **CREATIVE/PRODUCTION — APPROVED, with scope boundary.** CREATIVE/
  PRODUCTION actors produce the work that is submitted for approval.
  They are the natural initiators of Approval requests for the output
  of their own production activity (e.g., submitting a completed
  deliverable for review). Their creation authority is bounded to
  targets within their production scope; they do not initiate Approvals
  for targets outside it. Exact scope boundary: **DEFERRED** pending
  target-type-set resolution (§22 item 1), because which target types
  fall within "production scope" depends on which target types are
  ever approved (DR 0023 §22 item 1).
- **QC — APPROVED, with scope boundary.** QC actors may initiate an
  Approval request for a target that has passed QC review, routing it
  to a formal decision-maker as a handoff. Whether QC initiation is
  mandatory (all post-QC targets require a formal Approval) or optional:
  **DEFERRED** (§22 item 2).
- **CLIENT — DEFERRED.** Whether a CLIENT role actor may initiate
  Approval creation (as opposed to only deciding an Approval) is not
  established by Gate 0 or any Decision Record 0001–0023. CLIENT's
  decision authority is established (§7), but whether clients may
  themselves place Approval requests is a separate business question
  that this record cannot answer without inventing a commercial rule.
  **DEFERRED** (§22 item 3).
- **AGENT — NOT APPROVED.** Gate 0 makes AGENT the least-privilege
  role, explicitly prohibiting AGENT from bypassing QC, changing
  permissions, or overriding security controls. Initiating a formal
  Approval record — which influences Order completion (DR 0012, 0018)
  — is inconsistent with AGENT's defined least-privilege boundary.
  **AGENT may not create Approval records.** This is an APPROVED
  boundary, not a deferral.

## 7. PENDING → APPROVED and PENDING → REJECTED (Formal Decision)

**Who may execute PENDING → APPROVED or PENDING → REJECTED:**

These two transitions are analyzed together because they are two
outcomes of the same decision event — a formal binary verdict on the
target. The same role(s) that may approve may also reject; decision
authority is symmetric across both outcomes.

- **OWNER — APPROVED.** Highest authority; may execute the formal
  decision on any Approval. Subject only to §5's creator/decision-maker
  separation (the OWNER individual who created a specific record may not
  also decide it).
- **ADMIN/OPERATIONS — APPROVED, with separation constraint.**
  Operational scope includes client/brand/campaign/order management,
  which naturally encompasses the authority to render formal decisions
  on targets within those domains. Subject to §5 (an ADMIN/OPERATIONS
  individual who created a specific Approval record may not decide that
  same record). Exact scope of ADMIN/OPERATIONS decision authority
  relative to target type: **DEFERRED** (§22 item 1), contingent on
  which target types are approved by DR 0023's successor.
- **CLIENT — APPROVED in principle.** CLIENT is the natural decision-
  maker for client-facing Approvals — decisions that require external
  client authorization on deliverable work. "Client vs. internal
  Approval semantics" (DR 0010 Deferred Item 6) is resolved in this
  direction: CLIENT role actors may execute PENDING → APPROVED or
  PENDING → REJECTED where the Approval concerns a target within the
  CLIENT's contractual scope. Whether all Approvals require a CLIENT
  decision-maker (vs. only some, context-dependent) is **DEFERRED**
  pending target-type-set resolution (§22 item 1).
- **CREATIVE/PRODUCTION — NOT APPROVED as decision-maker.**
  CREATIVE/PRODUCTION actors produce the targets being approved.
  Allowing them to formally approve their own submitted work would
  collapse the independence the formal-decision concept requires and
  would directly violate §5's creator/decision-maker separation in
  spirit, not only in its per-record letter. This exclusion is absolute:
  **CREATIVE/PRODUCTION may not execute PENDING → APPROVED or PENDING →
  REJECTED.** This is an APPROVED exclusion, not a deferral.
- **QC — NOT APPROVED as Approval decision-maker.** QC verdicts are the
  domain of QC Review, a separate entity (DR 0010 § QC Separation).
  QC may initiate Approval requests (§6) as a post-QC handoff, but the
  Approval's formal binary decision (APPROVED/REJECTED) is not a QC
  verdict and must not be executed by the QC role. Collapsing these
  would undo the QC/Approval separation Decision Record 0010 explicitly
  established. **QC may not execute PENDING → APPROVED or PENDING →
  REJECTED.** This is an APPROVED exclusion.
- **AGENT — NOT APPROVED.** Gate 0 explicitly: AGENT cannot bypass QC,
  cannot change permissions, cannot override payment or security
  controls. Executing a formal Approval decision that influences Order
  completion (DR 0012, 0018) is inconsistent with AGENT's least-
  privilege boundary. **AGENT may not execute PENDING → APPROVED or
  PENDING → REJECTED.** This is an APPROVED boundary.

## 8. Client vs. Internal Approval Semantics

**Resolution of DR 0010 Deferred Item 6:**

**APPROVED:** the semantic distinction between "client-facing" and
"internal" Approvals does not require a separate Approval sub-type,
sub-state, or classification field. It is expressed entirely through
which actor executes the PENDING → APPROVED/REJECTED transition:

- An Approval decided by a CLIENT role actor is, by definition, a
  client-facing Approval.
- An Approval decided by OWNER or ADMIN/OPERATIONS is, by definition,
  an internal Approval.

The same Approval entity and state machine (DR 0010) therefore serves
both semantics without structural differentiation. This is a deliberate
simplicity: introducing a "client-facing" vs. "internal" type field
would require enumerating approval categories that the target-type-set
decision (DR 0023 §22 item 1) has not yet supplied, and is therefore
not approved here.

**DEFERRED remainder:** exactly which target types, in which contexts,
are routed to CLIENT decision-makers vs. ADMIN/OPERATIONS decision-
makers is determined by the target-type-set decision and by the
downstream workflow routing mechanism — both DEFERRED (§22 items 1, 4).

## 9. PENDING → CANCELLED

**Who may execute PENDING → CANCELLED:**

Cancellation terminates an Approval before any formal decision is
reached. It removes the pending obligation from consideration without
recording a positive or negative verdict on the target. §5's creator/
decision-maker separation does not apply (§5, last paragraph), because
cancellation is not a decision on the merits.

- **OWNER — APPROVED.** Unrestricted cancellation authority.
- **ADMIN/OPERATIONS — APPROVED.** Operational scope includes managing
  the campaign/order/production workflow; cancelling an Approval request
  that is no longer relevant (e.g., the associated production work has
  been superseded or the Order has been cancelled) is within that
  operational authority. ADMIN/OPERATIONS may not cancel an Approval
  as a mechanism to manufacture a favorable Order completion state —
  cancellation authority does not override the Order completion guard
  (DR 0012, 0019), and a CANCELLED Approval does not satisfy any
  Required Approval obligation (DR 0017 §10/§11, 0018 §11).
- **CREATIVE/PRODUCTION — DEFERRED.** A CREATIVE/PRODUCTION actor who
  initiated an Approval request may have a legitimate reason to
  withdraw it before a decision is made (e.g., discovering an error in
  the submitted target). Whether this self-withdrawal is permitted, and
  whether it counts as "cancellation" in the same sense, is not
  established by Gate 0 or any Decision Record 0001–0023. **DEFERRED**
  (§22 item 5).
- **CLIENT — DEFERRED.** Whether a CLIENT role actor may cancel an
  Approval request (e.g., withdrawing a decision request before
  responding) is not established. **DEFERRED** (§22 item 5).
- **QC — NOT APPROVED.** QC does not own the Approval lifecycle
  (DR 0010 § QC Separation). QC may initiate Approvals (§6) as a
  handoff but may not cancel them. An APPROVED exclusion.
- **AGENT — NOT APPROVED.** Consistent with AGENT's least-privilege
  boundary per Gate 0; cancelling a formal Approval record is not
  within AGENT's authorized scope. An APPROVED exclusion.

## 10. PENDING → EXPIRED

**APPROVED:** PENDING → EXPIRED is a system-triggered transition, not
an actor-initiated one. No role — including OWNER — "decides" to expire
an Approval; expiration occurs when an externally defined condition
(time-based or otherwise) is met without a prior decision having been
executed. Consequently:

- §5's creator/decision-maker separation does not apply (no actor
  executes this transition).
- No actor authorization check gates this transition.
- The mechanism that produces EXPIRED (scheduled job, on-read
  evaluation, or other) remains **DEFERRED**, unchanged from DR 0010
  (§22 item 6).

**APPROVED corollary:** because EXPIRED is not actor-initiated, it
must not be used as a mechanism to circumvent the formal approval
process. No restricted actor (including AGENT) can trigger expiration
to avoid obtaining a legitimate APPROVED decision; this is an inherent
property of the system-driven transition model, not a separately
enumerated permission rule.

**APPROVED corollary:** a CANCELLED Approval and an EXPIRED Approval
carry different meanings in the historical record: CANCELLED reflects
an intentional human decision to terminate; EXPIRED reflects a system-
determined timeout without human action. The distinction is meaningful
for audit and operational review even though both are terminal (DR 0010)
and neither satisfies a Required Approval obligation (DR 0017).

## 11. AGENT Authority — Consolidated

**APPROVED boundary — AGENT is excluded from all Approval actor roles:**

1. AGENT may not create Approval records (PENDING initiation) — §6.
2. AGENT may not execute PENDING → APPROVED — §7.
3. AGENT may not execute PENDING → REJECTED — §7.
4. AGENT may not execute PENDING → CANCELLED — §9.
5. PENDING → EXPIRED is system-driven; AGENT has no role in it — §10.

**Basis:** each exclusion follows directly from Gate 0's explicit
least-privilege characterization. Approvals are formal decision records
that influence Order completion (DR 0012, 0018); AGENT's defined
inability to bypass QC, override security controls, or change
permissions is incompatible with any Approval actor role. This is a
closed, APPROVED boundary — not a default-until-changed deferral.

## 12. CLIENT Authority — Consolidated

**APPROVED conclusions about CLIENT:**

1. CLIENT may execute PENDING → APPROVED and PENDING → REJECTED within
   their contractual scope — §7.
2. Whether CLIENT may initiate Approval creation (PENDING) is
   **DEFERRED** — §6, §22 item 3.
3. Whether CLIENT may cancel Approval records is **DEFERRED** — §9,
   §22 item 5.
4. CLIENT's "contractual scope" is not defined by this record; it
   depends on the target-type set (DR 0023) and subsequent commercial
   decisions (§22 item 1).
5. The routing mechanism that delivers a PENDING Approval to a CLIENT
   decision-maker is **DEFERRED** — §22 item 4.

## 13. Role Authority Matrix

| Transition | OWNER | ADMIN/OPS | CREATIVE/PROD | QC | CLIENT | AGENT |
|---|---|---|---|---|---|---|
| Create (→ PENDING) | APPROVED | APPROVED | APPROVED* | APPROVED* | DEFERRED | NOT APPROVED |
| PENDING → APPROVED | APPROVED | APPROVED† | NOT APPROVED | NOT APPROVED | APPROVED† | NOT APPROVED |
| PENDING → REJECTED | APPROVED | APPROVED† | NOT APPROVED | NOT APPROVED | APPROVED† | NOT APPROVED |
| PENDING → CANCELLED | APPROVED | APPROVED | DEFERRED | NOT APPROVED | DEFERRED | NOT APPROVED |
| PENDING → EXPIRED | System | System | System | System | System | System |

*With scope boundary per §6 (target-type-set boundary DEFERRED §22 item 1).
†Subject to §5 creator/decision-maker separation (same individual may
not both create and decide the same record) and target-type scope
(DEFERRED §22 item 1). CLIENT decision authority is client-facing
Approvals within contractual scope (§8, §12).

## 14. Audit Traceability

**APPROVED requirement:** every executed actor-initiated transition
(PENDING → APPROVED, PENDING → REJECTED, PENDING → CANCELLED) must be
attributable to the specific actor who executed it — not only to their
role, but to the individual. Audit traceability follows necessarily from
two already-established rules: Decision Record 0010's historical-
integrity requirement (terminal Approval records are never overwritten),
and Gate 0's explicit prohibition on AGENT disabling audit. Without per-
actor attribution, §5's creator/decision-maker separation cannot be
enforced, and the historical record of "who approved what" becomes
unreliable.

**This record states the traceability requirement — not as a new
architectural rule, but as a necessary consequence of rules already
established.** The implementation mechanism (actor identity column,
audit log table, event record) is **DEFERRED** (§22 item 7) and is
not created by this record.

## 15. Revision / New Approval Authority

**Reaffirmed from 0010 § Revision Separation:** when a new Approval
cycle is required after a terminal result (e.g., after REJECTED), a
*new* Approval record is created. The actor authority rules of this
record (§6–§10) apply to the new record independently; the prior
record's creator and decision-maker identities do not carry over,
constrain, or influence who may create or decide the new record. In
particular, §5's creator/decision-maker separation applies freshly to
each Approval record — a CREATIVE/PRODUCTION actor who initiated the
first Approval record may also initiate the second, and a CLIENT actor
who decided the first may also decide the second, subject to the same
per-record constraint that creator ≠ decider on the same record.

## 16. Zero-Requirement Interaction

**Not resolved here — Decision Record 0019 unchanged.** Actor authority
rules (§6–§10) apply only when an actual Approval record exists. If the
Required Approval collection on an Order is empty, there are no Approval
records to create or decide, and no conflict with this record's
conclusions arises. The zero-requirement blocking posture (0019 §9)
is orthogonal to actor authority.

## 17. Order Completion Interaction

**No change to Decision Record 0012.** The actor authority boundaries
established here govern who may cause Approval state transitions. They
do not modify the Order `ACTIVE` → `COMPLETED` guard, which depends on
whether Required Approvals are satisfied (DR 0017, 0018, 0022), not on
which specific role caused them to be satisfied. The guard's logic is
orthogonal to actor identity — the guard asks "is this Required Approval
satisfied by an APPROVED Approval record?" not "which role executed the
PENDING → APPROVED transition?"

## 18. Scope-of-Record Limits

This record resolves actor authority at the RBAC-role level only. It
does NOT:

- Assign specific individuals to roles (an operational/deployment
  concern).
- Design the runtime authorization enforcement mechanism (middleware,
  policy engine, row-level check — all DEFERRED).
- Resolve which target types are routed to CLIENT vs. ADMIN/OPERATIONS
  decision authority (depends on target-type set, §22 item 1).
- Design the delegation model (whether OWNER can delegate decision
  authority to another role for a specific Approval — not addressed,
  DEFERRED, §22 item 8).
- Establish whether Approval workflow routing (assignment, notification,
  escalation, reminder) is in scope for V1 or a separate system
  (DEFERRED, §22 item 4).
- Create any schema, column, FK, constraint, or implementation artifact.

## 19. Historical Integrity

**Reaffirmed, unchanged from 0014 §14/0015 §16/0016 §10/0017 §16/0018
§16/0019 §11/0020 §13/0021 §11/0022 §14/0023 §16:** the identity of
the actor who created a given Approval record, and the actor who
decided it (§5), are part of that Approval record's permanent, non-
revisable history — they may not be altered after the fact. This record
adds no new temporal rule; it confirms that actor attribution falls
within the scope of what the historical record must preserve.

## 20. Security / Tenancy

**APPROVED principle, consistent with 0002 D1 and 0023 §19:** the actor
executing any Approval transition must belong to the same organization
as the Approval record and the Order it ultimately serves. Cross-tenant
actor authority is never permitted. The enforcement mechanism (session
scope, JWT claim, RLS policy) is **DEFERRED** (§22 item 9) and is not
implemented by this record.

## 21. Financial Separation

Unchanged from every prior record: no actor authority boundary
established here implies, triggers, or is inferred from Payment,
Revenue, Expense, Profit, Refund, or Owner Settlement. The ADMIN/
OPERATIONS "no automatic money withdrawal or payment bypass" constraint
from Gate 0 is noted as fully consistent with this established
separation — it applies equally to Approval decisions, which carry no
direct financial consequence per the architecture.

## 22. Rejected Alternatives

- Allowing AGENT to create or decide Approvals — rejected (§6, §7,
  §11); directly contradicts Gate 0's least-privilege characterization
  and would undermine the formal-decision integrity required by
  DR 0010.
- Allowing CREATIVE/PRODUCTION to formally decide (APPROVED/REJECTED)
  their own submitted work — rejected (§7); collapses the independence
  the formal-decision concept requires and violates §5 in spirit.
- Allowing QC to execute formal Approval decisions — rejected (§7);
  collapses the QC/Approval separation DR 0010 explicitly established.
- Treating PENDING → EXPIRED as an actor-initiated transition — rejected
  (§10); EXPIRED is system-driven; conflating it with a deliberate
  decision would enable restricted actors to circumvent the formal
  approval process.
- Inventing an "Approval sub-type" or classification field to distinguish
  client-facing vs. internal Approvals — rejected (§8); the distinction
  is expressed through the decision-maker role, not a new structural
  category, and no target-type-set decision has yet supplied the
  enumeration such a field would require.
- Allowing the creator of a specific Approval record to also decide that
  same record — rejected (§5); contradicts DR 0010's formal-decision
  principle.
- Designing a delegation model or role-assignment mechanism — rejected as
  out of scope (§18); not approved by any prior Decision Record and not
  necessary to resolve the four DR 0010 deferred items targeted here.
- Applying §5's creator/decision-maker separation to CANCELLED — rejected
  (§5, §9); cancellation is not a merit-based decision and the separation
  is only warranted for APPROVED/REJECTED.
- Applying §5's creator/decision-maker separation to EXPIRED — rejected
  (§10); EXPIRED has no actor.

## 23. Deferred Decisions

1. Role-per-target-type mapping: which role(s) hold decision authority
   for which target types (depends on DR 0023's target-type set; the
   target-type set itself remains the single largest unresolved item
   in this entire chain).
2. Whether QC-initiated Approval creation is mandatory or optional (§6).
3. Whether CLIENT may initiate Approval creation (§6).
4. Workflow routing mechanism — how a PENDING Approval is assigned to
   and surfaced for the appropriate decision-maker; whether this includes
   notification, escalation, or deadline mechanisms (§8, §18).
5. Whether CREATIVE/PRODUCTION or CLIENT may execute PENDING → CANCELLED
   in specific circumstances (§9).
6. Expiration mechanism — the system process that triggers PENDING →
   EXPIRED: scheduled job, on-read evaluation, other; expiration
   duration; whether expiration applies to all Approval target types
   (unchanged from DR 0010; not addressed here beyond §10's structural
   characterization).
7. Actor attribution implementation mechanism (§14).
8. Delegation model — whether OWNER may delegate decision authority for
   a specific Approval to another role (§18).
9. Tenant/RLS enforcement mechanism for actor authority (§20).
10. All items from DR 0010 not resolved here: exact approvable target
    types (DR 0023 territory), target model/database representation,
    target cardinality and FK enforcement, cancellation side effects,
    Approval ↔ Delivery orchestration, exact Order completion guard,
    required number/type of approvals, database CHECK constraints,
    idempotent decision submission implementation.

## 24. Final Recommendation

The actor/authority question across Approval's four approved transitions
is resolved at the RBAC-role level using the Gate 0 foundation:

- **OWNER** holds unrestricted authority across all actor-initiated
  transitions (creation and all decisions), subject only to the
  per-record creator/decision-maker separation.
- **ADMIN/OPERATIONS** holds creation and full decision (APPROVED/
  REJECTED/CANCELLED) authority within tenant scope and the per-record
  creator/decision-maker separation.
- **CREATIVE/PRODUCTION** holds creation authority within their
  production scope but is absolutely excluded from the decision role
  (APPROVED/REJECTED) for any Approval they submitted.
- **QC** holds creation authority as a post-QC handoff mechanism but is
  absolutely excluded from the formal decision role (APPROVED/REJECTED).
- **CLIENT** holds formal decision authority (APPROVED/REJECTED) for
  client-facing Approvals within contractual scope; creation and
  cancellation authority remain DEFERRED.
- **AGENT** is excluded from all actor roles on all transitions — an
  absolute, closed boundary.
- **PENDING → EXPIRED** is system-driven; no actor executes or gates
  this transition.

The per-record **creator/decision-maker separation** (§5) is an APPROVED
structural principle applying to all PENDING → APPROVED and PENDING →
REJECTED transitions. The **client vs. internal Approval semantic
distinction** (DR 0010 Deferred Item 6) is resolved: it is expressed
through the decision-maker role, not a structural sub-type. The target-
type-set decision (DR 0023) and the downstream routing mechanism remain
the largest unresolved dependencies; the actor authority boundaries here
are compatible with any target-type resolution and will be further
refined — not contradicted — by it.

## Consistency with Decision Records 0001–0023

- Consistent with 0001/0002: introduces no schema, no new entity, no
  new role beyond Gate 0's provision; D1 tenant-scope constraint
  preserved (§20); D2 UUID identity unaffected.
- Consistent with 0003–0009: no Campaign, Brief, Quote, Asset, Order,
  Production Job, or AI Generation lifecycle is modified; Approval does
  not acquire authority over any of their state machines.
- Consistent with 0010: directly resolves Deferred Items 4, 5, 6, 9
  without modifying any approved state, transition, or design principle;
  all terminal states remain non-reopenable; historical integrity
  preserved (§19); QC/Approval and revision separations upheld.
- Consistent with 0011 (Delivery): Approval ↔ Delivery orchestration
  remains DEFERRED; no actor authority boundary created here implies a
  Delivery lifecycle consequence.
- Consistent with 0012 (Completion Guard): Order completion guard
  unaffected (§17); actor identity is orthogonal to guard evaluation.
- Consistent with 0013/0014/0015: Order Requirements Snapshot
  unaffected; upstream commercial content still unapproved.
- Consistent with 0016/0017/0018: qualification and satisfaction
  mechanics unaffected; actor authority does not modify how the formal
  formula (0018 §12) evaluates. The §5 separation is consistent with
  0017's one-record-to-one-requirement default — actor constraint ≠
  cardinality constraint.
- Consistent with 0019: zero-requirement blocking posture unaffected
  (§16); actor authority applies only when actual Approval records exist.
- Consistent with 0020/0021: Required Delivery and Delivery cardinality
  unaffected.
- Consistent with 0022: Required Approval identity and satisfaction
  reference unaffected; actor authority is orthogonal to satisfaction
  mechanics.
- Consistent with 0023: Approval target model (Model A, target type +
  target identity) unaffected; actor authority is a separate dimension
  from target shape; target-type set remains DEFERRED as in 0023.
- No Decision Record 0001–0023 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume AGENT has any actor authority on any Approval transition
  (§6, §7, §9, §11).
- Do not assume CREATIVE/PRODUCTION may execute PENDING → APPROVED or
  PENDING → REJECTED on any Approval (§7).
- Do not assume QC may execute formal Approval decisions (§7).
- Do not assume CLIENT may initiate Approval creation (§6) — DEFERRED.
- Do not assume CLIENT may cancel Approval records (§9) — DEFERRED.
- Do not assume PENDING → EXPIRED is actor-initiated or requires an
  actor authorization check (§10).
- Do not assume the creator of an Approval may also decide that same
  record (§5).
- Do not assume a separate Approval sub-type or classification is
  required to distinguish client-facing from internal Approvals (§8).
- Do not assume a delegation model has been approved (§18).
- Do not assume role-per-target-type authority mapping has been resolved
  — it is DEFERRED (§23 item 1).
- Do not assume the expiration mechanism, duration, or trigger has been
  decided (§10, §23 item 6).
- Do not assume actor attribution or audit implementation has been
  specified (§14, §23 item 7).
- Do not assume any financial event is triggered by an Approval decision
  (§21).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0023 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
