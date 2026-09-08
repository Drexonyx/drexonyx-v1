# Decision Record 0085 — Phase 12: Controlled Provider Fallback

- **Decision Round:** Phase 12
- **Phase:** 12 — Cost Governance, Model Routing & Secure Asset Delivery
- **Status:** APPROVED — Owner approved as part of Phase 12 build. This record
  documents decisions already implemented and validated in Phase 12. No
  additional schema, migration, or implementation is authorized by this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-08
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit c49d4bd (Phase 13 remediation)
- **Resolves:** Gap identified in DR 0082 §6 — fallback provider selection
  deferred from Phase 11 (DR 0073 §2.4).
- **Relationship to prior records:** Does not modify Decision Records 0001–0082.
  All remain authoritative and unchanged. Depends on DR 0061 (AI generation
  failure retry model), DR 0073 (AI model invocation boundary), DR 0084
  (deterministic model routing).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0082. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0073 §2.4):** Fallback provider selection was explicitly deferred
from Phase 10 to Phase 12. DR 0073 established that the driver must not
autonomously select an alternative provider or model without an Owner-approved
policy. The policy itself was not defined.

**FACT (DR 0061 §2):** The AI generation failure retry model distinguishes
transient failures (eligible for retry) from non-transient failures (terminal).
Retry is bounded; non-transient failures are terminal with no retry.

**FACT (lib/agent/fallback-policy.ts, Phase 12 implementation):** The Phase 12
implementation defines two functions: `classifyProviderFailure` and
`getFallbackDecision`. These are the single authorized path for failure
classification and fallback decisions. The driver calls them after a
non-transient provider failure.

**FACT (Phase 12 implementation):** In V1, `getFallbackDecision` always returns
`hasFallback: false`. No alternative provider or model is approved for
autonomous fallback in V1.

---

## 2. Decision

### 2.1 Failure Classification

**APPROVED:** Provider failures are classified into exactly two categories:

```typescript
type FailureClassification = 'transient' | 'non_transient';
```

`classifyProviderFailure(isTransient: boolean): FailureClassification` maps:
- `isTransient = true` → `'transient'`
- `isTransient = false` → `'non_transient'`

The `isTransient` flag comes from the provider adapter (DR 0057). The adapter
is the authoritative source for transience classification.

### 2.2 Fallback Decision Shape

**APPROVED:** A fallback decision is one of two shapes:

```typescript
type FallbackDecision =
  | { hasFallback: false; reason: string }
  | { hasFallback: true; fallbackProviderName: string; fallbackModel: string };
```

`getFallbackDecision(classification, providerName, model): FallbackDecision`
returns one of these shapes. The caller acts on `hasFallback` without
inspecting `reason` for control flow. `reason` is for logging and audit only.

### 2.3 V1 Policy: No Autonomous Fallback

**APPROVED:** In V1, `getFallbackDecision` always returns:

```typescript
{ hasFallback: false, reason: '...' }
```

regardless of `classification`, `providerName`, or `model`. No alternative
provider or model is approved for autonomous fallback in V1. The driver
treats this as a terminal failure.

**APPROVED:** This is an explicit Owner decision, not an omission. The V1
fallback policy is: when a provider fails non-transiently and retries are
exhausted, the ProductionJob fails. No autonomous recovery is attempted.

### 2.4 Fallback is Not Retry

**APPROVED:** Fallback (changing provider or model) is distinct from retry
(re-attempting the same provider and model). Retry behavior is governed by
DR 0061. Fallback behavior is governed by this record. The driver applies
retry first (per DR 0061), then evaluates fallback only after retries are
exhausted and a non-transient classification is returned.

### 2.5 Adding a Fallback Route in a Future Phase

**DEFERRED:** Enabling `hasFallback: true` for any `(providerName, model)`
pair requires Owner approval, a new or amended DR, and an updated
`MODEL_ROUTING_TABLE` entry (DR 0084 §2.1) for the fallback target. No
fallback route may be added by implementation judgment alone.

### 2.6 No Autonomous Provider Discovery

**APPROVED:** The driver may not autonomously discover, select, or attempt
any provider or model not explicitly present in `MODEL_ROUTING_TABLE` (DR 0084).
`getFallbackDecision` does not consult any external registry, environment
variable, or database table for fallback candidates.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume `hasFallback: true` is reachable in V1 — it is not (§2.3).
- Do not assume a fallback is equivalent to a retry — they are distinct
  mechanisms (§2.4).
- Do not add a fallback route without Owner approval and a new or amended
  DR — prohibited (§2.5).
- Do not assume the driver may autonomously select an alternative provider or
  model — prohibited (§2.6, DR 0073).
- Do not assume `reason` in `FallbackDecision` may be used for control flow —
  it is for logging only (§2.2).
- Do not assume this record modifies Decision Records 0001–0082 — it does not.

---

## 4. Owner Approval

Owner approved as part of Phase 12 build authorization.

This record is a retrospective documentation filing. The implementation in
`lib/agent/fallback-policy.ts` is the authoritative source of truth for
the decisions recorded here.
