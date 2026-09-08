# Decision Record 0084 — Phase 12: Deterministic Model Routing

- **Decision Round:** Phase 12
- **Phase:** 12 — Cost Governance, Model Routing & Secure Asset Delivery
- **Status:** APPROVED — Owner approved as part of Phase 12 build. This record
  documents decisions already implemented and validated in Phase 12. No
  additional schema, migration, or implementation is authorized by this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-08
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Base commit c49d4bd (Phase 13 remediation)
- **Resolves:** Gap identified in DR 0082 §6 — multi-model routing deferred from
  Phase 11 (DR 0073 §2.3, §2.4).
- **Relationship to prior records:** Does not modify Decision Records 0001–0082.
  All remain authoritative and unchanged. Extends DR 0073 (AI model invocation
  boundary) and DR 0057 (provider adapter architecture). Depends on DR 0064
  (audit actor identity), DR 0065 (agent runtime scoped service token).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0082. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0073 §2.3, §2.4):** Multi-model routing and fallback provider
selection were explicitly deferred from Phase 10 to Phase 12. DR 0073
established the AI model invocation boundary — model identifiers flow through
the system as strings, and the provider adapter resolves them — but the routing
table itself was not defined.

**FACT (DR 0082 §3.1):** Phase 11 validated exactly three Higgsfield model
identifiers against the Higgsfield SDK and documentation:
`text2image/soul`, `image2video/dop`, `speak/higgsfield`. These are the only
verified model identifiers as of Phase 11.

**FACT (DR 0057 §2):** The provider adapter architecture defines a uniform
`DispatchParams` interface consumed by all provider adapters. The routing layer
sits above the adapter layer: it resolves (providerName, model) → route, and
the driver calls the appropriate adapter.

**FACT (lib/agent/model-routing.ts, Phase 12 implementation):** The Phase 12
implementation defines `MODEL_ROUTING_TABLE` as a static, immutable object.
`resolveProviderForModel` is the single entry point for model routing. The
table requires an explicit Owner decision and a new or amended DR for any
addition.

---

## 2. Decision

### 2.1 MODEL_ROUTING_TABLE

**APPROVED:** The model routing table is a static, Owner-approved registry.
In V1, it contains exactly three entries:

| providerName   | model              | provider      |
|----------------|--------------------|---------------|
| `higgsfield`   | `text2image/soul`  | `higgsfield`  |
| `higgsfield`   | `image2video/dop`  | `higgsfield`  |
| `higgsfield`   | `speak/higgsfield` | `higgsfield`  |

**APPROVED:** Adding any entry to `MODEL_ROUTING_TABLE` requires Owner approval
and a new or amended DR. No entry may be added by implementation judgment alone.

### 2.2 resolveProviderForModel

**APPROVED:** `resolveProviderForModel(providerName: string, model: string)`
returns `ModelRoute | null`:

- Returns the matching `ModelRoute` if the `(providerName, model)` pair exists
  in `MODEL_ROUTING_TABLE`.
- Returns `null` if the pair is not in the table.

**APPROVED:** The caller treats a `null` return as a terminal failure. No
autonomous retry, no fallback route, and no partial match is attempted.
Fallback behavior is governed exclusively by DR 0085.

### 2.3 Fail-Closed for Unknown Pairs

**APPROVED:** Any `(providerName, model)` pair not present in
`MODEL_ROUTING_TABLE` fails closed. The generation does not proceed.
The driver records the failure as `isTransient: false` (non-transient),
meaning no retry is attempted (DR 0061, DR 0085).

### 2.4 listApprovedRoutes

**APPROVED:** `listApprovedRoutes()` returns a read-only array of all
`(providerName, model)` pairs in `MODEL_ROUTING_TABLE`. This is for
observability and operator tooling only. It does not authorize new routes.

### 2.5 No Dynamic Configuration

**APPROVED:** The routing table is not read from environment variables, the
database, or any runtime configuration. It is a compile-time constant.
Changing it requires a code change, an Owner-approved DR, and a deployment.

### 2.6 Relationship to Provider Adapter

**APPROVED:** `resolveProviderForModel` returns a route that identifies the
provider adapter to invoke. The route does not bypass the adapter's own
validation. The adapter receives the model identifier and validates it
independently through its own `MODEL_ENDPOINT_MAP` (DR 0082 §3.1B).

---

## 3. Explicitly Prohibited Assumptions

- Do not assume any `(providerName, model)` pair not in `MODEL_ROUTING_TABLE`
  is routable — fail closed (§2.3).
- Do not assume a `null` return from `resolveProviderForModel` permits retry
  or fallback — non-transient failure only (§2.2).
- Do not add entries to `MODEL_ROUTING_TABLE` without Owner approval and a
  new or amended DR — prohibited (§2.1).
- Do not read the routing table from environment variables, database, or
  runtime configuration — compile-time constant only (§2.5).
- Do not assume this record modifies Decision Records 0001–0082 — it does not.

---

## 4. Owner Approval

Owner approved as part of Phase 12 build authorization.

This record is a retrospective documentation filing. The implementation in
`lib/agent/model-routing.ts` is the authoritative source of truth for
the decisions recorded here.
