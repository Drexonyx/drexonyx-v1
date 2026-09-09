# Decision Record 0017 — Phase 02 Round 02B: Requirement Satisfaction Relationships

- **Decision Round:** 02B
- **Phase:** 02 — Database & Data Model
- **Status:** APPROVED — at the architectural/logical level only. No
  field, table, migration, target type, or cardinality is approved by
  this record.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-03
- **Repository state at approval:** `main` @ `15c14de971582f50ca02cc73a178f30a01dc7214`
- **Relationship to prior records:** Does not modify Decision Records
  0001–0016. All remain authoritative and unchanged. This record defines
  the satisfaction relationship Decision Record 0016 named but did not
  define: how an actual Delivery or Approval record comes to discharge a
  Required Delivery or Required Approval.

## Governance Note

No Constitution text has ever been provided to this session. Every
substantive statement below is labeled **FACT**, **APPROVED**,
**INFERENCE**, **PROPOSAL**, **DEFERRED**, or **UNVERIFIED**. Consistent
with Decision Records 0013–0016: Service and Package remain **UNVERIFIED**
as entities and are not introduced here.

## 1. Context

Decision Record 0016 defined qualification as snapshot membership and
explicitly separated it from satisfaction, but left the satisfaction
relationship itself — how a specific Delivery or Approval record comes
to discharge a specific Required Delivery or Required Approval —
undefined. This record supplies that relationship, at the architectural/
logical level, without inventing physical schema, an Approval target
type, or a Delivery/Asset cardinality rule.

## 2. Problem

"Delivery reaches `COMPLETED`" and "the Required Delivery is satisfied"
are not automatically the same fact. Without a defined relationship
between them, any implementation would have to guess whether *a*
`COMPLETED` Delivery under an Order satisfies *the* Required Delivery, a
*specific* one among several, or none at all. This record must state the
minimum logical condition for satisfaction on both the Delivery and
Approval sides, prevent cross-Order and cross-requirement confusion, and
identify exactly which unresolved items (partial delivery, Approval
target type) block a complete answer.

## 3. Approved Inputs

- **0011 (Delivery):** states `PREPARING`/`SENDING`/`COMPLETED`/`FAILED`/
  `CANCELLED`; only `COMPLETED` represents the mechanism succeeding;
  Delivery↔Asset cardinality and partial-delivery semantics DEFERRED.
- **0010 (Approval):** states `PENDING`/`APPROVED`/`REJECTED`/
  `CANCELLED`/`EXPIRED`; target-type set DEFERRED.
- **0012 (Guard):** ALL required Deliveries `COMPLETED` AND ALL required
  Approvals `APPROVED`; failure/cancellation on either side is
  non-cancelling and financially inert.
- **0014/0015:** Order Requirements Snapshot is the source of truth for
  "required," anchored to Order, captured at creation, changed only
  through future controlled amendment.
- **0016:** qualification = current membership in the snapshot's
  Required Delivery/Approval set; qualification ≠ satisfaction;
  qualification for Required Approval is resolvable without a target
  type, but satisfaction was flagged as still needing one (0016 §7,
  §21 item 2) — this record confirms and narrows that dependency (§13).

## 4. Qualification vs. Satisfaction (Recap, Applied)

Per 0016 §8, preserved without modification: qualification asks "is this
obligation required" and is answered by snapshot membership; satisfaction
asks "has this required obligation been fulfilled" and is answered by a
Delivery or Approval record's own lifecycle outcome. This record defines
*how* a specific record's outcome is connected to a specific obligation —
the missing link between the two layers.

## 5. Satisfaction Principle

**APPROVED:** *A Required Delivery (or Required Approval) is satisfied
when, and only when, there exists a Delivery (or Approval) record that
(a) belongs to the same Order as the requirement, (b) is identifiably
associated with that specific requirement — not merely with the Order in
general — and (c) has reached the correct terminal success state
(`COMPLETED` for Delivery, `APPROVED` for Approval).* Satisfaction is
**evidence recorded against a pre-existing, independently-qualified
obligation** — it never creates, deletes, retroactively defines, or
redefines whether that obligation was required in the first place (§15).

## 6. Candidate Relationship Models

- **A. Direct one-to-one identity** (the Required Delivery/Approval *is*
  the Delivery/Approval record) — **rejected.** This collapses
  qualification into satisfaction: a requirement would not exist until a
  record exists, directly contradicting 0016 §6.2/§7.2 ("exists
  independently of whether delivery/approval has already occurred").
- **B. Requirement-to-record reference** (the obligation, once
  established, is later mutated to point at the record(s) that satisfy
  it) — **rejected as the primary model.** It would require mutating the
  snapshot's own content after creation to attach satisfaction evidence,
  blurring the historical-stability boundary 0014/0015 drew between the
  (stable) requirement and (dynamic) satisfaction evidence.
- **C. Record-to-requirement reference** (the Delivery/Approval record,
  once it exists, carries a reference identifying which requirement it
  addresses) — **viable.** The requirement is never touched; only the
  later-created record carries the pointer. Preserves historical
  stability (the snapshot is read, not written, when satisfaction
  evidence appears) and keeps qualification and satisfaction data on
  their respective sides.
- **D. Matching by descriptive attributes** (inferring a match from
  similarity of description/content) — **rejected.** Unreliable and
  ambiguous by construction, especially once multiple Required
  Deliveries/Approvals of similar description exist (§10); also depends
  on a description format 0015/0016 left undefined.
- **E. Matching by Order + obligation identity** — **adopted as the
  refinement of C.** A bare Order-level reference is insufficient once
  an Order may have multiple Required Deliveries/Approvals (0016 §14);
  the reference must identify the Order *and* the specific obligation
  within that Order's snapshot.
- **F. Other existing approved mechanism** — **none found** in Decision
  Records 0001–0016.

**Selected logical model (C refined by E):** satisfaction is established
by a **record-to-requirement reference**, carried by the Delivery or
Approval record once it exists, identifying both the Order and the
specific Required Delivery/Approval it addresses. This does **not**
select a physical mechanism (FK, column, or otherwise) — that remains
**DEFERRED** — it fixes only the *direction* and *precision* of the
relationship.

## 7. Required Delivery Satisfaction

**APPROVED (minimum logical condition):** a Required Delivery is
satisfied when there exists a Delivery record such that:

1. **Same Order boundary** — the Delivery belongs to the same Order as
   the Required Delivery (§9).
2. **Correct obligation identity** — the Delivery's reference (§6)
   identifies *this specific* Required Delivery, not merely "some
   Delivery under this Order."
3. **Delivery has reached `COMPLETED`** — the only state 0011 defines as
   "the mechanism itself succeeded."
4. **`FAILED` does not satisfy** — a technical/execution failure (0011
   §4) never discharges the obligation.
5. **`CANCELLED` does not satisfy** — an intentionally-terminated attempt
   never discharges the obligation.
6. **`PREPARING` does not satisfy** — non-terminal, execution not yet
   attempted.
7. **`SENDING` does not satisfy** — non-terminal, execution in progress.
8. **A Delivery record does not create a requirement merely by
   existing** — existence of a correctly-referencing Delivery record is
   irrelevant to qualification (0016 §4); it is relevant only to
   satisfaction, and only once `COMPLETED`.
9. **A failed/cancelled Delivery does not erase the requirement** —
   reaffirmed from 0016 §6.5/§15; the Required Delivery remains qualified
   and open.
10. **Multiple attempts must not produce false completion** — satisfaction
    is an existential condition: it is met once **at least one**
    correctly-referencing Delivery reaches `COMPLETED`, regardless of how
    many earlier `FAILED`/`CANCELLED` attempts exist under the same
    requirement. Whether a single Delivery may satisfy more than one
    Required Delivery, or a Required Delivery may need more than one
    Delivery to be satisfied, is **not** decided here — see §10, §12.

**Not decided by this record:** exact Delivery→Asset cardinality (0011,
unchanged) and partial-delivery semantics beyond the minimum anti-partial-
credit rule in §12.

## 8. Required Approval Satisfaction

**APPROVED (minimum logical condition):** a Required Approval is
satisfied when there exists an Approval record such that:

1. **Same Order boundary** — the Approval belongs to the same Order as
   the Required Approval (§9).
2. **Correct approval obligation identity** — the Approval's reference
   (§6) identifies *this specific* Required Approval.
3. **Approval has reached `APPROVED`.**
4. **`REJECTED` does not satisfy.**
5. **`CANCELLED` does not satisfy.**
6. **`EXPIRED` does not satisfy.**
7. **`PENDING` does not satisfy** — non-terminal.
8. **An Approval record does not create a requirement merely by
   existing** — same reasoning as §7.8.
9. **A rejected/cancelled/expired Approval does not erase the
   requirement** — reaffirmed from 0016 §7.5/§15.
10. **Multiple approval attempts must not produce false completion** —
    same existential condition as §7.10: satisfaction is met once **at
    least one** correctly-referencing Approval reaches `APPROVED`,
    regardless of how many earlier `REJECTED`/`CANCELLED`/`EXPIRED`
    decisions exist under the same requirement (consistent with 0010's
    own new-record-per-decision-cycle convention).

**No Approval target type is selected or invented by this record** (see
§13 for the dependency this creates).

## 9. Order Boundary

**APPROVED:** a Delivery or Approval belonging to a different Order can
never satisfy a Required Delivery/Approval of this Order. This is
enforced architecturally by condition 1 in both §7 and §8 — satisfaction
requires same-Order membership as a precondition, before obligation
identity is even checked. Consistent with the task's instruction, this
record does not design RLS or a database constraint to enforce it; it
states the requirement conceptually, consistent with the tenant/Order
scoping already established (0002 D1, 0014 §20, 0015 §23, 0016 §17).

## 10. Multiple Records

- **Multiple Deliveries attempting to satisfy one Required Delivery** —
  permitted logically (retries, per §11); satisfaction is existential
  (§7.10), not "first" or "last."
- **Multiple Required Deliveries** — permitted logically (0016 §14,
  unchanged); each must be referenced independently and precisely (§6,
  Model E) so that one Delivery record cannot be mistaken for satisfying
  a different Required Delivery than the one it actually references.
- **Multiple Approvals attempting to satisfy one Required Approval** —
  permitted logically, same reasoning as Deliveries.
- **Multiple Required Approvals** — permitted logically (0016 §14,
  unchanged), same precision requirement.

**Logical anti-ambiguity rule (APPROVED):** a satisfying record's
reference must resolve to **exactly one** Required Delivery/Approval;
a reference that could plausibly match more than one obligation is not a
valid satisfaction reference. Whether one Delivery/Approval record may be
*deliberately* designed to satisfy more than one requirement at once
(e.g., a bundled delivery covering multiple obligations) is a separate,
**not-decided** cardinality question — left **DEFERRED**, tied to the
same Delivery→Asset/partial-delivery cardinality questions 0011 already
left open.

## 11. Retry / Revision

Consistent with the established conventions — Production Job retry is a
new Production Job row (0008), AI Generation retry is a new AI Generation
row (0009), Asset revision is a new Asset row (0006) — **none of these
entities is a Delivery, and none of their states satisfies a Required
Delivery.** A `FAILED` Production Job, a `FAILED` AI Generation, or a
`REVISION_REQUIRED`/`REJECTED` Asset does not, and cannot, satisfy a
Required Delivery — only an actual Delivery record reaching `COMPLETED`
can (§7). A retry at any of those upstream layers may eventually
contribute to producing content that a Delivery later delivers, but
**the implementation path connecting an upstream retry to an eventual
Delivery attempt is not invented by this record** — consistent with
0011's own boundary that Delivery does not own Asset or Production
state.

## 12. Partial Delivery

**DR 0011's partial-delivery model remains unresolved and is not resolved
here.** The minimum rule this record can safely state, per explicit
instruction:

**APPROVED (minimum rule):** *a Required Delivery cannot be considered
satisfied merely because some incomplete portion of the deliverable
exists.* Only a correctly-referencing Delivery record that has itself
reached `COMPLETED` counts (§7.3); a Delivery still `PREPARING`/`SENDING`,
or any other partial/incomplete state or evidence, does not satisfy,
regardless of how much of the underlying work is actually done.

**Explicitly DEFERRED:** whether a Required Delivery can be satisfied by
several Deliveries that jointly cover partial scopes (a true partial-
delivery completion model), and how such joint coverage would be
evaluated — this depends entirely on Decision Record 0011's still-open
partial-delivery and cardinality resolution, and this record does not
anticipate that resolution.

## 13. Approval Target Dependency

**Does satisfaction logically require the future implementation to
identify which Approval record corresponds to which Required Approval?
Yes — this is unavoidable given §6/§8.** The Model-E reference (§6) must,
by construction, let an Approval record identify a specific Required
Approval. **This record does not resolve *how*** that identification is
physically achieved — whether through the target-type mechanism Decision
Record 0002 D6 approved in principle (a typed target model with nullable
target FK columns), through a separate reference, or through another
mechanism entirely, remains **DEFERRED**, pending Decision Record 0010's
still-open target-type set. What this record fixes is only that **some**
such identification capability is logically necessary — recorded here as
an explicit, named dependency on 0010, not as a resolution of it.

## 14. Failure / Cancellation

**APPROVED (reaffirming 0012 §11, 0015 §21, 0016 §15, applied to
satisfaction specifically):**

- A failed or cancelled Delivery: does not satisfy (§7.4/§7.5); does not
  remove the Required Delivery (§7.9); does not automatically cancel the
  Order.
- A rejected, cancelled, or expired Approval: does not satisfy (§8.4–
  §8.6); does not remove the Required Approval (§8.9); does not
  automatically cancel the Order.
- No financial consequence is introduced or inferred from any such
  failure, consistent with §18.

## 15. Historical Integrity

**APPROVED:** satisfaction is **evidence recorded against an existing
requirement** — it never creates a requirement (§7.8, §8.8), never
deletes a requirement (§7.9, §8.9), and never redefines whether an
obligation was originally required. A later Delivery or Approval record
cannot retroactively change what an Order's snapshot said it needed at
the time — it can only ever supply, or fail to supply, satisfying
evidence for an obligation that already exists independent of it. This
preserves the same historical-stability principle established in 0014
§14, 0015 §16, and 0016 §10, now extended explicitly to the satisfaction
layer.

## 16. Completion Guard

The chain, preserved without collapsing layers, exactly as the task
specifies:

```
Order Requirements Snapshot
        |
Required Deliveries / Required Approvals   (Qualification — DR 0016)
        |
Satisfaction Relationships                  (this record)
        |
Delivery.COMPLETED / Approval.APPROVED
        |
Order Completion Guard (Decision Record 0012, unchanged)
        |
Order.COMPLETED
```

Decision Record 0012 is not modified. This record supplies the missing
link between "a requirement exists" (0016) and "a requirement's evidence
exists" (this record), without altering the guard's own logic.

## 17. Security Boundary

Unchanged from 0014 §20/0015 §23/0016 §17: satisfaction evaluation occurs
within the Order's own tenant context. Per §9, a Delivery or Approval
from a different Organization's Order can never satisfy this Order's
requirement — the same-Order condition (§7.1/§8.1) is, by construction
(0002 D1's composite-FK/tenant-scoping pattern applying to Order itself),
also a same-tenant condition. Client-facing access must be server-
authorized. No RLS or authorization mechanism is designed or implemented
by this record.

## 18. Financial Separation

Unchanged from 0012 §12/0015 §24/0016 §18: satisfaction has no authority
over Payment, Revenue, Expense, Profit, Reserve, or Owner Settlement, and
does not trigger or infer any financial event.

## 19. Version / Change Control

**DEFERRED, as instructed, and not previously resolved elsewhere:** if a
future controlled amendment (0015 §17-B/§18, 0016 §12) removes or alters
a Required Delivery/Approval that already has recorded satisfaction
evidence against it, the effect on that already-recorded satisfaction —
whether it is preserved as historical evidence, invalidated, or
re-evaluated against a replacement obligation — is **not decided by this
record**. This is a genuine gap between two things this record and prior
records have each partially addressed (satisfaction evidence stability,
§15; snapshot amendment, 0015/0016) but never jointly resolved. It is
recorded here explicitly as **DEFERRED**, to be closed only when the
amendment mechanism itself (0015 §27 item 8, 0016 §21 item 8) is
eventually designed.

## 20. Rejected Alternatives

- Model A (requirement = record identity) — rejected (§6); collapses
  qualification into satisfaction.
- Model B (requirement mutated to reference records) — rejected (§6);
  would make the stable snapshot a write target for dynamic satisfaction
  evidence.
- Model D (descriptive-attribute matching) — rejected (§6); ambiguous and
  dependent on an undefined description format.
- Treating a Delivery/Approval record's mere existence as satisfying or
  qualifying anything — rejected (§7.8, §8.8).
- Treating any non-`COMPLETED` Delivery state, or any non-`APPROVED`
  Approval state, as satisfying — rejected (§7.4–§7.7, §8.4–§8.7).
- Allowing cross-Order satisfaction — rejected outright (§9).
- Allowing an ambiguous reference (one that could match more than one
  requirement) as valid satisfaction evidence — rejected (§10).
- Treating a failed/cancelled Delivery or a rejected/cancelled/expired
  Approval as removing the requirement or cancelling the Order —
  rejected (§14).
- Allowing satisfaction evidence to redefine or backdate what was
  originally required — rejected (§15).
- Resolving the Approval target-type set or the partial-delivery model
  to make this record's satisfaction rule fully concrete — rejected;
  both remain named dependencies (§12, §13).

## 21. Deferred Decisions

1. The physical mechanism implementing the record-to-requirement
   reference (§6) — FK, column, or otherwise.
2. Decision Record 0011's partial-delivery model, and how joint/partial
   satisfaction across multiple Deliveries would be evaluated (§12).
3. Decision Record 0010's Approval target-type set, and the specific
   mechanism by which an Approval record identifies its Required
   Approval (§13).
4. Whether a single Delivery or Approval record may deliberately satisfy
   more than one requirement at once (§10).
5. Exact Delivery→Asset and Delivery→Order cardinality (0011, unchanged).
6. The upstream implementation path connecting Production Job/AI
   Generation/Asset retries to an eventual Delivery attempt (§11).
7. The effect of a future snapshot amendment on already-recorded
   satisfaction evidence (§19).
8. The scope-expansion/reduction amendment mechanism itself (0015/0016,
   unchanged).
9. Exact tenant/RLS implementation (§17).
10. Any physical database representation of the satisfaction reference,
    its constraints, or its evaluation query.

## 22. Final Recommendation

Satisfaction is established by a **record-to-requirement reference**
(Model C, refined by Model E): a Delivery or Approval record, once it
exists, carries a reference identifying both the Order and the specific
Required Delivery/Approval it addresses — never the reverse, and never
by identity or descriptive matching. A Required Delivery is satisfied
only by a correctly-referencing Delivery record reaching `COMPLETED`; a
Required Approval only by a correctly-referencing Approval record
reaching `APPROVED`. Any other state, any cross-Order reference, or any
ambiguous reference fails to satisfy. Satisfaction never creates,
removes, or redefines a requirement — it is evidence recorded against an
independently-established, independently-stable obligation. This
resolves the satisfaction relationship's **logical shape** in full. It
does **not** make Decision Record 0012's guard implementation-ready,
because the physical mechanism for the reference itself depends on two
still-open items this record explicitly does not resolve: Decision
Record 0011's partial-delivery/cardinality model (§12) and Decision
Record 0010's Approval target-type set (§13) — both flagged, neither
invented.

## Consistency with Decision Records 0001–0016

- Consistent with 0001/0002: introduces no schema; the record-to-
  requirement reference direction is compatible with, but does not
  finalize, the typed-target-model principle already approved for
  Approval in D6.
- Consistent with 0003/0004 (Campaign, Brief): neither is read by, or
  involved in, satisfaction.
- Consistent with 0005 (Quote): unaffected; Quote's lifecycle-only scope
  is unmodified.
- Consistent with 0006 (Asset), 0008 (Production Job), 0009 (AI
  Generation): their retry/revision conventions are reaffirmed as never
  themselves satisfying a Delivery requirement (§11), without altering
  their own approved behavior.
- Consistent with 0007 (Order): the same-Order boundary (§9) reinforces
  Order's role as the tenant/scope anchor without modifying its state
  machine.
- Consistent with 0010 (Approval): does not invent a target type; names
  the dependency precisely (§13) without resolving it.
- Consistent with 0011 (Delivery): does not resolve cardinality or
  partial-delivery semantics; only states the minimum anti-partial-credit
  rule explicitly permitted by the task (§12).
- Consistent with 0012 (Completion Guard): does not modify the guard;
  supplies the missing link in its own vocabulary (§16).
- Consistent with 0013/0014 (Requirements gap, source of truth) and 0015
  (Snapshot content): builds on, and does not contradict, their
  conclusions.
- Consistent with 0016 (Qualification): preserves qualification exactly
  as defined; supplies only the satisfaction half that record deferred.
- No Decision Record 0001–0016 is modified, reinterpreted, or superseded
  by this record.

## Explicitly Prohibited Assumptions

- Do not assume any physical table, column, or field for the
  satisfaction reference has been approved (§6, §21).
- Do not assume the Required Delivery/Approval *is* the Delivery/
  Approval record (Model A rejected, §6).
- Do not assume a Delivery/Approval record's mere existence satisfies or
  qualifies anything (§7.8, §8.8).
- Do not assume any non-`COMPLETED` Delivery state or non-`APPROVED`
  Approval state satisfies a requirement (§7, §8).
- Do not assume cross-Order satisfaction is possible (§9).
- Do not assume an ambiguous reference is valid satisfaction evidence, or
  that one record may deliberately satisfy multiple requirements (§10).
- Do not assume Decision Record 0011's partial-delivery model or
  Decision Record 0010's Approval target-type set has been resolved
  (§12, §13).
- Do not assume satisfaction evidence can redefine, backdate, or remove
  a requirement (§15).
- Do not assume the effect of a future snapshot amendment on existing
  satisfaction evidence has been decided (§19).
- Do not assume Delivery/Approval failure removes a requirement, cancels
  the Order, or triggers a financial consequence (§14).
- Do not assume this record authorizes implementation, schema creation,
  migration creation, dependency installation, or database changes.
- Do not assume Decision Records 0001–0016 have been altered,
  reinterpreted, or superseded — all remain authoritative and unchanged.
