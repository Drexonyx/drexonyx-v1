# Decision Record 0054 — Phase 08: Asset File Storage Model

- **Decision Round:** Phase 08
- **Phase:** 08 — Production Queue
- **Status:** APPROVED — Owner-approved 2026-09-05.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** Phase 08 PLAN — "New DR required: Asset file storage model.
  Define the logical storage/reference model only. Clarify file_key /
  content_url semantics. Preserve secure access requirements."
- **Relationship to prior records:** Does not modify Decision Records 0001–0052.
  All remain authoritative and unchanged. Extends DR 0006 (Asset state machine)
  with the physical file reference model required for Phase 08 implementation.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**. No statement is promoted above
FACT unless directly grounded in an approved Decision Record or verified schema.

---

## 1. Problem

**FACT:** The `production.assets` table has no file reference columns:
no `name`, `file_key`, `file_type`, `file_size`, or `content_url`.

**FACT (Phase 08 PLAN item 6):** Missing columns on `production.assets`:
`name`, `file_key`, `file_type`, `file_size`, `content_url` (or equivalent
storage reference).

**FACT (Phase 08 PLAN item 9, Risks):** "The storage provider is undefined.
No DR specifies where asset files are stored. If Phase 08 requires actual
file delivery, a storage decision must be made."

**FACT (Phase 08 PLAN D5):** Higgsfield integration is DEFERRED. AI-generated
asset files may originate from Higgsfield's storage; that integration path
is not established in Phase 08.

**FACT (Phase 08 PLAN D3):** APPROVED and REJECTED are not Asset states.
The Asset lifecycle (DR 0006) is unchanged. File storage is a data attribute
of the Asset row, not a state.

---

## 2. Decision

**PROPOSED — presented for Owner approval:**

### 2.1 Logical Storage Model

The Asset file storage model is **provider-agnostic**. DREXONYX stores a
logical reference to the file — a `file_key` — rather than embedding
provider-specific URLs as the primary storage reference. The `content_url`
is a derived, time-limited access URL generated on demand from the `file_key`.

This model:
- Decouples the database record from any specific storage provider.
- Allows migration between storage providers by updating the key format, not
  the application logic.
- Requires that `content_url` is never treated as a permanent, stable link.

### 2.2 Required Schema Additions to `production.assets`

```sql
ALTER TABLE production.assets
  ADD COLUMN name       TEXT,
  ADD COLUMN file_key   TEXT,
  ADD COLUMN file_type  TEXT,
  ADD COLUMN file_size  BIGINT,
  ADD COLUMN content_url TEXT;
```

Column semantics:

**`name`** — Human-readable name for the asset (e.g., filename). Nullable in
schema; required in application for MANUAL_UPLOAD jobs. For AI_GENERATION jobs,
populated from the generation parameters (e.g., prompt excerpt or job description).
Mutable by OWNER/ADMIN_OPERATIONS while the Asset is in UPLOADED or PROCESSING
state.

**`file_key`** — Opaque, provider-agnostic string identifier for the file in
the storage backend. Format: `{provider_prefix}/{organization_id}/{asset_id}/{filename}`.
Example: `prod/01j8abc/01j8def/campaign-hero.mp4`. This is the stable,
long-lived reference. Nullable during UPLOADED state (file may not yet be stored);
non-null after PROCESSING begins. Immutable once set.

**`file_type`** — MIME type or file extension. Nullable. Set at upload or
generation. Immutable once set.

**`file_size`** — File size in bytes. Nullable. Set at upload or after
generation. Immutable once set.

**`content_url`** — Derived, time-limited URL for client access to the file.
This field is nullable and serves as a cache/convenience reference only.
It must NOT be treated as a stable or permanent link. In Phase 08, this field
is populated at upload time as a placeholder; in production, it will be
replaced by an on-demand signed URL generated from `file_key`.

**Access rule:** Direct public URLs for asset files are prohibited. File access
must be mediated through the application layer (server-side signed URL
generation or authenticated proxy). Client-facing asset access must be
org-scoped and role-checked.

### 2.3 Storage Provider: DEFERRED

**FACT (D5, D4):** No storage provider (AWS S3, Cloudflare R2, Supabase
Storage, Higgsfield-hosted, etc.) is approved for Phase 08. This record
establishes the logical model only.

**Phase 08 behavior:** For MANUAL_UPLOAD jobs, Phase 08 may store a file
reference using whatever temporary mechanism is available (e.g., a local
path, a placeholder URL, or a pre-configured storage bucket if one is
separately authorized by the Owner). The `file_key` convention in §2.2
must be followed regardless of the underlying provider.

**Post-Phase-08:** a storage provider selection DR will specify the exact
`file_key` format, signed URL generation mechanism, and any SDK used.
That DR will not require changes to the Asset schema columns defined here.

### 2.4 content_url Is Not the Primary Reference

`content_url` must never be used as the canonical long-term reference to an
asset file. The `file_key` is the canonical reference. Applications must:
1. Use `file_key` to generate an on-demand access URL.
2. Return the generated URL to the caller with an appropriate expiry.
3. Never store a freshly generated signed URL back to the database as if
   it were stable.

In Phase 08 (provider DEFERRED), `content_url` may be stored as a temporary
convenience reference. Any Phase 08 code that stores to `content_url` must
include a comment marking it as a temporary placeholder.

### 2.5 Tenant Isolation for File Access

1. File keys must include `organization_id` as a path segment (§2.2 format).
2. Server-side file access generation must verify that the requesting user's
   JWT `organizationId` matches the `organization_id` embedded in the `file_key`.
3. No cross-tenant file access is ever permitted.
4. The storage backend's access control (bucket policy, IAM, etc.) is a
   defense-in-depth layer; application-layer checks are required independently.

### 2.6 Asset Record ↔ File Lifecycle

- An Asset row may exist with a null `file_key` while in `UPLOADED` state
  (the row was created but the file has not yet been committed to storage).
- `file_key` becomes non-null when the file is confirmed stored.
- The Asset state machine (DR 0006) governs lifecycle states; `file_key`
  non-null is a data attribute, not a state.
- Deletion of an asset file from storage requires setting `file_key` to null
  and transitioning the Asset to REJECTED (if the file is lost unrecoverably).
  Soft-delete semantics are DEFERRED.

---

## 3. Scope

This record governs:
- The logical file reference model for Asset rows.
- The five schema columns to be added to `production.assets`.
- The `content_url` temporary/derived status.
- File access tenant-isolation rules.
- The storage provider deferral.

---

## 4. Non-Goals

- **Storage provider selection:** DEFERRED. This record defines the logical
  model; a provider-specific DR is required separately.
- **Signed URL generation implementation:** DEFERRED (depends on provider).
- **File upload API/route implementation:** Phase 08 build scope; not a DR.
- **Higgsfield asset file handling:** DEFERRED (D5). When Higgsfield generates
  an asset, its file reference (Higgsfield-hosted URL or copied file) is
  mapped to `file_key` following the convention in §2.2, but the mapping
  mechanism is DEFERRED.
- **Asset deletion / retention policy:** DEFERRED.
- **CDN or caching layer for asset delivery:** DEFERRED.

---

## 5. Role Authority for File Access

| Action | OWNER | ADMIN_OPS | CREATIVE_PROD | QC | CLIENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Upload / set file_key | ✓ | ✓ | ✓ | — | — |
| Generate access URL | ✓ | ✓ | ✓ | ✓ | ✓ (own org, CLIENT_PREVIEW only) |
| Delete file (revoke) | ✓ | ✓ | — | — | — |

**CLIENT access rule:** CLIENT may only generate access URLs for Asset rows in
`CLIENT_PREVIEW` state that belong to their organization. CLIENT may not access
assets in any other state.

**QC access rule:** QC may generate access URLs for Asset rows in
`READY_FOR_QC` or `CLIENT_PREVIEW` state within their organization.

---

## 6. Tenant Isolation

Per §2.5: `file_key` path includes `organization_id`; server-side JWT check
required on all file access generation; no cross-tenant file access.

---

## 7. Audit Requirements

**Canonical audit action strings (D14, Owner-approved):**

| Event | `action` string |
|---|---|
| Asset created (file_key set) | `ASSET_UPLOADED` |
| Asset file access URL generated | Not audited (high-frequency, read-only) |
| Asset file deleted / revoked | `ASSET_FILE_DELETED` |

Asset state transitions (UPLOADED → PROCESSING → READY_FOR_QC, etc.) are
audited per DR 0006's state machine; the audit action strings for those
transitions are:

| Event | `action` string |
|---|---|
| Asset UPLOADED created | `ASSET_CREATED` |
| Asset → PROCESSING | `ASSET_PROCESSING` |
| Asset → READY_FOR_QC | `ASSET_READY_FOR_QC` |
| Asset → CLIENT_PREVIEW | `ASSET_CLIENT_PREVIEW` (after QC PASS) |
| Asset → REVISION_REQUIRED | `ASSET_REVISION_REQUIRED` (after QC FAIL) |
| Asset → REJECTED | `ASSET_REJECTED` |

---

## 8. Failure / Idempotency

- If a file upload to the storage backend fails, the Asset row remains in
  `UPLOADED` state with `file_key = null`. The upload may be retried.
  The Asset row is not deleted on upload failure.
- If `file_key` is already set, attempting to overwrite it is prohibited
  (the column is immutable once set). A new Asset row must be created for
  a revised file.

---

## 9. Dependencies

- DR 0006 — Asset state machine (lifecycle states unchanged by this record).
- DR 0053 Phase 08 — Production Job Type Taxonomy (AI_GENERATION and
  MANUAL_UPLOAD produce Asset rows with different `file_key` origin).
- Phase 08 migration — five new columns on `production.assets`.

---

## 10. Deferred Items

1. **Storage provider selection** — DEFERRED. Owner must approve a storage
   provider DR before a production implementation can be completed.
2. **Signed URL generation** — DEFERRED (provider-dependent).
3. **Higgsfield asset file mapping** — DEFERRED (D5).
4. **Asset deletion / retention policy** — DEFERRED.
5. **CDN/caching** — DEFERRED.
6. **content_url → on-demand generation migration** — Phase 08 may populate
   `content_url` as a placeholder; post-Phase-08, this is replaced by
   on-demand signed URL generation that does not persist to the DB.

---

## 11. Owner Approval

This record is APPROVED by Owner 2026-09-05.

**Upon Owner approval:**
- Five columns added to `production.assets` (§2.2) are authorized.
- `file_key` as the canonical storage reference (§2.1) is confirmed.
- `content_url` as temporary placeholder in Phase 08 is confirmed.
- File access tenant-isolation rules (§2.5) are mandatory.
- Storage provider selection remains DEFERRED and requires a separate DR.

---

## Explicitly Prohibited Assumptions

- Do not assume any specific storage provider is approved by this record.
- Do not assume `content_url` is a stable or permanent URL.
- Do not assume CLIENT may access assets in any state other than CLIENT_PREVIEW.
- Do not assume Higgsfield-hosted URLs are acceptable as `file_key` values
  without a conversion mechanism.
- Do not assume `file_key` may be overwritten once set.
- Do not assume this record authorizes schema changes, migrations, or code.
