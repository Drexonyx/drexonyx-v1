# Decision Record 0068 — Phase 09: ai_generations.provider_job_id Schema Addition

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** DR 0059 §2.8 (provider_job_id schema gap identified during
  callback architecture decision)
- **Relationship to prior records:** Does not modify Decision Records 0001–0067.
  All remain authoritative and unchanged. Depends on DR 0057 (provider adapter
  architecture), DR 0059 (provider callback architecture), DR 0061 (failure and
  retry model).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0067. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (verified schema, `production.ai_generations`):** The current `ai_generations`
table has no column for storing the provider's external job identifier. Columns
relevant to this record:

```
id                  UUID PRIMARY KEY
production_job_id   UUID NOT NULL
organization_id     UUID NOT NULL
provider            TEXT            -- nullable; e.g., 'higgsfield'
model               TEXT
status              TEXT NOT NULL DEFAULT 'REQUESTED'
...
```

**FACT (DR 0059 §2.4):** Webhook correlation requires a server-side lookup: when
a provider callback arrives carrying an external job identifier, the server must
locate the corresponding `ai_generations` row. Without a stored `provider_job_id`,
this lookup is not possible.

**FACT (DR 0059 §2.8):** DR 0059 identified `provider_job_id` as a schema gap
and conditioned the callback architecture on this column being added. This record
resolves that gap.

**FACT (DR 0057 §2.1):** The provider adapter architecture is provider-agnostic.
Provider-specific identifiers must be stored in a generic domain model column,
not in a Higgsfield-named column.

**FACT (verified schema, `production.ai_generations`):** The `provider` column is
TEXT nullable. Provider job ID values are scoped to a provider — the same identifier
string may appear across different providers without implying the same external job.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09 pre-BUILD):**

### 2.1 Column Definition — provider_job_id

**PROPOSED:** Add a column `provider_job_id` to `production.ai_generations`:

```
provider_job_id    TEXT    -- nullable; external job identifier assigned by the provider
```

- **Type:** TEXT. Provider-assigned identifiers are strings of provider-defined
  format; no assumption about UUID or numeric format is made.
- **Nullable:** Yes. `provider_job_id` is NULL until the provider accepts the
  dispatch request and returns an identifier. A REQUESTED-status AiGeneration
  may have `provider_job_id = NULL`.
- **Generic naming:** The column is named `provider_job_id`, not `higgsfield_job_id`
  or any other provider-specific name. This preserves the provider-agnostic domain
  model (DR 0057 §2.1).

### 2.2 Immutability After Assignment

**PROPOSED:** Once `provider_job_id` is set to a non-NULL value, it is immutable
for that AiGeneration record. No code path may overwrite a non-NULL `provider_job_id`
with a different value.

Rationale: `provider_job_id` is the external reference used for webhook correlation
and polling. Overwriting it would break in-flight correlation and could result in
misrouted state transitions.

### 2.3 Assignment Timing

**APPROVED — Owner approved 2026-09-05 (amendment resolving Phase 09 Final Audit
Finding #1):** The ordering of operations is:

1. The driver atomically claims the AiGeneration: `status` transitions from
   REQUESTED to RUNNING via CAS guard **before** provider dispatch. This atomic
   claim is a prerequisite for dispatch; it must not be deferred until after the
   provider responds.

2. Provider dispatch occurs **after** the atomic claim. `provider_job_id` is not
   known before the provider responds and must not be invented or persisted before
   the authoritative provider response.

3. When the provider returns a job identifier upon accepting the dispatch, the
   driver persists `provider_job_id` in the **next database operation** — the
   first database write after receiving the provider response. No intervening
   database operation is permitted between provider dispatch and
   `provider_job_id` persistence.

4. If the provider does not return an identifier at dispatch,
   `provider_job_id` remains NULL.

All existing concurrency, idempotency, tenant-isolation, and
webhook-correlation guarantees are preserved. In particular, webhook correlation
by `(provider, provider_job_id)` remains safe: a callback arriving in the brief
window between the RUNNING claim (step 1) and `provider_job_id` persistence
(step 3) will simply find no matching row and acknowledge without mutation,
consistent with the no-op path in DR 0059 §2.3.

### 2.4 Uniqueness Constraint — Scoped to (organization_id, provider, provider_job_id)

**PROPOSED:** A partial unique index enforces that the same (provider, provider_job_id)
combination cannot be assigned to more than one AiGeneration row within the same
organization:

```sql
UNIQUE (organization_id, provider, provider_job_id)
WHERE provider_job_id IS NOT NULL
```

Rationale:
- Provider job ID values are scoped to their provider. The same identifier string
  may be assigned by different providers to different jobs. Uniqueness without the
  `provider` column would incorrectly block valid assignments across providers.
- Uniqueness is scoped to `organization_id` to preserve tenant isolation — the
  same (provider, provider_job_id) from two different organizations does not
  create a conflict.
- `provider_job_id` is not globally unique across the system.
- The `WHERE provider_job_id IS NOT NULL` partial predicate excludes NULL rows
  from the uniqueness constraint, allowing multiple AiGeneration rows to coexist
  with NULL `provider_job_id` (e.g., in REQUESTED status before dispatch).

### 2.5 Index for Webhook Lookup

**PROPOSED:** A separate index supports efficient webhook correlation lookups.
When a provider callback arrives carrying (provider, provider_job_id), the server
must locate the corresponding AiGeneration row:

```sql
INDEX ON (provider, provider_job_id)
WHERE provider_job_id IS NOT NULL
```

This index does not include `organization_id` because the webhook handler receives
only (provider, provider_job_id) from the provider — `organization_id` is not
known at correlation time and is retrieved from the matched AiGeneration record.

**PROPOSED:** After lookup by (provider, provider_job_id), the handler MUST verify
that the resolved AiGeneration's `organization_id` matches the expected scope
before performing any state mutation (tenant isolation per all prior records).

### 2.6 No Global Uniqueness

**PROPOSED:** `provider_job_id` is NOT globally unique across the system. The
uniqueness guarantee is:

> Within a given organization and provider, no two AiGeneration rows may share
> the same non-NULL provider_job_id.

Cross-organization and cross-provider collisions on provider_job_id string values
are permitted by the schema design.

### 2.7 Schema Implications (Not Authorized)

**PROPOSED (schema not authorized):** This decision implies the following schema
changes to `production.ai_generations`:

1. Add column `provider_job_id TEXT` (nullable, no default).
2. Add partial unique index:
   `UNIQUE (organization_id, provider, provider_job_id) WHERE provider_job_id IS NOT NULL`
3. Add webhook lookup index:
   `INDEX ON (provider, provider_job_id) WHERE provider_job_id IS NOT NULL`

**PROPOSED:** No schema change is authorized by this record. Any schema migration
requires separate authorization per CLAUDE.md.

### 2.8 Open Item Resolved

- DR 0059 §2.8: `provider_job_id` schema gap → resolved by this record. ✓

---

## 3. Explicitly Prohibited Assumptions

- Do not assume `provider_job_id` is globally unique — it is not (§2.6).
- Do not assume uniqueness is (provider_job_id, organization_id) without the
  `provider` column — the correct constraint is
  (organization_id, provider, provider_job_id) WHERE NOT NULL (§2.4).
- Do not assume `provider_job_id` is named after Higgsfield — generic column
  name only (§2.1).
- Do not assume `provider_job_id` may be overwritten once set — immutable after
  assignment (§2.2).
- Do not assume the webhook lookup index includes organization_id — it does not;
  organization_id is validated after lookup (§2.5).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0067 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
