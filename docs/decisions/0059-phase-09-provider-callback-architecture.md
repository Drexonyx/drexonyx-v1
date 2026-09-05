# Decision Record 0059 — Phase 09: Provider Callback Architecture

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 09 pre-BUILD blocker: how the platform receives and processes
  AI generation results from the provider — webhook-first with polling fallback,
  signature verification, idempotency, and race prevention.
- **Relationship to prior records:** Does not modify Decision Records 0001–0054.
  All remain authoritative and unchanged. Depends on DR 0053 (AiGeneration entity),
  DR 0055 (runtime authentication), DR 0056 (runtime authority scope), DR 0057
  (provider adapter), DR 0058 (generation lifecycle driver). DR 0068 resolves
  the `provider_job_id` schema gap identified in §2.8 of this record.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0054. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0053 §4):** AiGeneration entity includes `provider` (TEXT nullable),
`result_url` (TEXT nullable). No column exists for storing the provider's external
job identifier (gap resolved by DR 0068).

**FACT (DR 0002 D4):** `system.idempotency_keys` is the centralized mechanism
for duplicate-operation protection.

**FACT (Phase 09 PLAN):** Higgsfield (V1 provider) delivers generation results
asynchronously. The platform must be capable of receiving the result via provider
callback (webhook) and must have a recovery path (polling) for cases where the
webhook is not delivered.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 Webhook-First Architecture

**PROPOSED:** The primary result-receipt mechanism is a provider webhook callback.
The platform exposes a server-side webhook endpoint. When the provider completes
(or fails) a generation, it POSTs a callback to this endpoint.

The webhook endpoint is:
- Server-side only (not accessible via the client portal or admin panel).
- Protected by provider webhook signature verification (§2.2).
- Not a general-purpose callback; it is scoped to AI generation result events.

### 2.2 Signature Verification Is Mandatory

**PROPOSED:** Every incoming webhook request from the provider MUST be verified
against a provider-supplied signature before any database mutation occurs. Requests
that fail signature verification are rejected with a non-success HTTP response.
No state mutation occurs on failed verification.

The exact signature verification mechanism is provider-specific (Higgsfield)
and is a BUILD-phase implementation detail. The requirement — verify before
mutate — is the approved decision.

### 2.3 Correlation via provider_job_id — Server-Side Only

**PROPOSED:** Webhook correlation (mapping an incoming callback to a specific
AiGeneration record) uses the `provider_job_id` stored in `production.ai_generations`
(DR 0068). The handler looks up the AiGeneration by `(provider, provider_job_id)`.

The `organization_id` of the matched AiGeneration is loaded from the database
after the lookup. It is never accepted from the webhook payload as a trusted
value. Tenant scope is validated from the database record, not from provider-supplied
fields.

### 2.4 Idempotency — system.idempotency_keys

**PROPOSED:** Each provider callback event is idempotent via `system.idempotency_keys`
(DR 0002 D4). The idempotency key is scoped to the provider event identifier
(unique event ID from the provider) and the organization_id of the matched
AiGeneration. A replayed webhook for an already-processed event must not re-apply
state mutations or create duplicate audit events.

If the idempotency key is already COMPLETED, the handler returns a success
response to the provider without performing any additional mutation.

### 2.5 CAS Race Prevention

**PROPOSED:** The state mutation triggered by a verified webhook (AiGeneration
RUNNING → SUCCEEDED or RUNNING → FAILED) uses a CAS guard per DR 0056 §2.2.
If the AiGeneration is no longer in RUNNING status when the mutation is attempted,
the update is a no-op. This prevents race conditions between concurrent webhooks
and polling operations.

### 2.6 Polling Fallback

**PROPOSED:** Polling is a recovery mechanism for cases where the webhook was
not delivered. The polling interval and maximum polling duration are BUILD-phase
implementation details. The polling path uses the same correlation mechanism
(§2.3), the same idempotency check (§2.4), and the same CAS guard (§2.5) as the
webhook path.

Polling does not replace the webhook path; it supplements it. The webhook path
is preferred.

### 2.7 No Provider Result Data in Audit Payload

**PROPOSED:** Raw provider response payloads (which may contain provider-specific
identifiers, model outputs, or financial information) are not stored verbatim in
`system.audit_events`. The audit event records the state transition and its
outcome, not the raw provider payload.

### 2.8 Open Gap — provider_job_id Schema (Resolved by DR 0068)

**PROPOSED:** Webhook correlation (§2.3) requires a `provider_job_id` column on
`production.ai_generations`. This column does not exist in the current schema.
DR 0068 specifies the column definition, uniqueness constraint, and lookup index.
This gap is not a BUILD blocker on its own; it requires a migration authorized
as part of Phase 09 Build Authorization.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume organization_id may come from the webhook payload — it must
  come from the database record after correlation (§2.3).
- Do not assume signature verification is optional — it is mandatory before
  any mutation (§2.2).
- Do not assume a replayed webhook may create duplicate state mutations —
  idempotency prevents this (§2.4).
- Do not assume polling replaces the webhook path — it is a fallback only (§2.6).
- Do not assume raw provider payloads are stored in audit events — they are not
  (§2.7).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0054 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
