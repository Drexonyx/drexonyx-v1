# Decision Record 0057 — Phase 09: AI Provider Adapter Architecture

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 09 pre-BUILD blocker: provider-adapter architecture for
  AI generation dispatch. Establishes the provider-agnostic interface, Higgsfield
  as the V1 provider, and the boundary between domain logic and provider-specific
  integration code.
- **Relationship to prior records:** Does not modify Decision Records 0001–0054.
  All remain authoritative and unchanged. Depends on DR 0053 (AiGeneration entity),
  DR 0054 (file_key as canonical asset reference), DR 0055 (runtime authentication),
  DR 0056 (runtime authority scope), DR 0058 (generation lifecycle driver).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0054. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0053 §4):** AiGeneration entity: `provider` (TEXT nullable), `model`
(TEXT nullable), `prompt` (TEXT nullable), `params` (JSONB nullable),
`result_url` (TEXT nullable), `status` (TEXT NOT NULL). The provider field is
generic — no Higgsfield-specific column exists in the schema.

**FACT (DR 0054 §2.2):** `file_key` is the canonical asset file reference.
`content_url` is a temporary placeholder only (DR 0054 §2.4). The canonical
reference for any asset produced by an AI generation is `file_key`.

**FACT (Phase 09 PLAN):** Higgsfield is the selected AI generation provider for
V1. The architecture must support a single provider in V1 while remaining
provider-agnostic at the domain model level to avoid schema or domain coupling
to Higgsfield-specific identifiers.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 Provider-Agnostic Domain Model

**PROPOSED:** The domain model (`production.ai_generations`, all service
functions, all audit events) uses provider-agnostic terminology. No column,
field, variable, or audit payload key is named after Higgsfield specifically.

The canonical provider identifier string for Higgsfield in the domain model is
`'higgsfield'`. This string is stored in `ai_generations.provider` when
Higgsfield is the dispatch target.

### 2.2 Provider Adapter Interface

**PROPOSED:** Provider-specific integration code is isolated behind an adapter
interface. The adapter interface defines:
- A dispatch operation: accepts a job descriptor (prompt, model, params,
  provider credentials) and returns a provider job identifier.
- A status-check operation: accepts a provider job identifier and returns
  current status and result reference.
- A result-fetch operation: accepts a provider job identifier and returns
  the generated content reference (for storage via file_key).

The exact interface definition (method signatures, parameter types, return types)
is a BUILD-phase implementation detail. The boundary principle — provider-specific
code isolated behind the adapter — is the approved decision.

### 2.3 Higgsfield Is the V1 Provider

**PROPOSED:** Higgsfield is the sole AI generation provider in V1. The Higgsfield
adapter is the only adapter implemented in Phase 09. The adapter interface is
designed to accommodate future providers without requiring domain model changes.

### 2.4 Provider Credentials Are Server-Side Only

**PROPOSED:** Higgsfield API credentials (API keys, workspace identifiers, or
equivalent) are loaded exclusively from server-side environment configuration.
They are never:
- Included in any client response.
- Stored in the database.
- Accessible via any browser-facing endpoint.
- Logged in plaintext.

### 2.5 file_key Is the Canonical Result Reference

**PROPOSED:** When an AI generation produces an output asset, the result is
stored via the file storage model (DR 0054). The `file_key` is the canonical
reference. `result_url` in `ai_generations` may be set as a temporary placeholder
consistent with DR 0054 §2.4, but `file_key` on the associated Asset record is
the durable reference.

### 2.6 No Provider SDK Global State

**PROPOSED:** The Higgsfield provider adapter must not maintain global SDK client
instances that survive across requests or production job executions in a way that
could leak credentials or scope between tenants. Provider SDK or client
instantiation must be scoped to the operation being performed.

### 2.7 Provider-Specific Schema Columns Are Prohibited in the Domain Model

**PROPOSED:** No column named `higgsfield_job_id`, `higgsfield_model`,
`higgsfield_workspace_id`, or any other Higgsfield-specific identifier is added
to any schema table. Provider job identifiers are stored in the generic
`provider_job_id` column (DR 0068).

---

## 3. Explicitly Prohibited Assumptions

- Do not assume Higgsfield-specific column names are acceptable in the domain
  model — generic naming is required (§2.1, §2.7).
- Do not assume provider credentials may be stored in the database or exposed
  to clients — server-side environment only (§2.4).
- Do not assume `content_url` is the canonical result reference — `file_key` is
  (§2.5, DR 0054 §2.4).
- Do not assume the adapter interface is finalized by this record — the exact
  interface is a BUILD-phase detail (§2.2).
- Do not assume global provider SDK state is acceptable — per-operation scoping
  required (§2.6).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0054 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
