# Decision Record 0040 — Phase 05: Client Asset Content — Status-Only Scope

- **Decision Round:** Phase 05
- **Phase:** 05 — Client Portal
- **Status:** APPROVED — explicitly approved by Owner on 2026-09-04.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Relationship to prior records:** Does not modify Decision Records
  0001–0037. All remain authoritative and unchanged. This record addresses
  the absence of content-reference fields in `production.assets`, identified
  as a Phase 05 implementation blocker for CLIENT portal preview views.

## Governance Note

`production.assets` was defined in an earlier phase with metadata and state
fields only. No content-reference field (URL, storage key, filename, MIME
type, or equivalent) exists in any approved schema. This record formalizes
the Phase 05 decision that CLIENT portal asset views are STATUS-ONLY, and
that actual asset-content delivery is deferred to a later phase.

Every substantive statement below is labeled **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REJECTED**. No schema, migration, dependency, or
application-code change is authorized by this record. All items marked
PROPOSED require explicit Owner approval before implementation.

---

## 1. Context

The Phase 05 Client Portal includes views that allow CLIENT-role users to
see assets associated with their campaigns and orders. These views were
described as including "client preview" and "preview" capabilities.

`production.assets` current columns: `id`, `organization_id`, `order_id`,
`status`, `archived_at`, `created_at`, `updated_at`.

The `status` column uses the approved state machine from DR 0006:
`UPLOADED`, `PROCESSING`, `READY_FOR_QC`, `CLIENT_PREVIEW`,
`REVISION_REQUIRED`, `REJECTED`.

No content-reference field exists. There is no URL, storage key, filename,
MIME type, or CDN reference in the schema. A CLIENT portal "preview" cannot
display actual file content because no file reference is stored.

Owner direction: Phase 05 remains read-only and should NOT introduce a
storage provider or asset-content storage architecture.

---

## 2. Decision

**What is being decided:**

1. Confirmation that Phase 05 CLIENT portal asset views are STATUS-ONLY.
2. What CLIENT users may and may not see regarding assets in Phase 05.
3. That no content-reference fields are added to `production.assets` in
   Phase 05.
4. That no object-storage provider is introduced in Phase 05.
5. What phase asset-content delivery is deferred to.

---

## 3. Options

### Option A — Status-Only (PROPOSED — Owner direction)

Phase 05 CLIENT portal asset views display only:
- Asset existence (the CLIENT can see that assets exist for their orders)
- Asset status (the current `status` value from `production.assets`)
- A CLIENT-appropriate status label (mapped from the internal status; see §3
  below for the CLIENT-safe status subset)
- Asset metadata available without a content reference: `created_at`,
  `updated_at`

CLIENT portal asset views do NOT display:
- Any actual file content (no image, video, PDF, or other media)
- Any URL, storage key, or access link to file content
- Any filename or MIME type (not in schema)
- Any internal-only status values not approved for CLIENT exposure

No change to the `production.assets` schema is required for this option.
No storage provider is introduced.

### Option B — Add Content Reference Fields to `production.assets`

Add one or more content-reference fields to `production.assets` (e.g.,
`storage_key text`, `cdn_url text`, `filename text`, `mime_type text`).
Introduce an object-storage provider to serve asset content.

**REJECTED for Phase 05** per Owner direction. Phase 05 must not introduce
a storage provider or asset-content storage architecture.

---

## 4. CLIENT-Safe Asset Status Mapping

**PROPOSED for Phase 05 (not approved until Owner explicitly approves):**

The internal `production.assets.status` values must not all be exposed
directly to CLIENT users. The following mapping is PROPOSED:

| Internal Status | CLIENT-Visible Label | Expose to CLIENT? |
|---|---|---|
| `UPLOADED` | (internal) | No — internal transition state |
| `PROCESSING` | (internal) | No — internal transition state |
| `READY_FOR_QC` | (internal) | No — internal QC state |
| `CLIENT_PREVIEW` | "Ready for Review" | Yes |
| `REVISION_REQUIRED` | "Revision in Progress" | Yes |
| `REJECTED` | (internal) | No — internal/terminal state |

**Rationale:** CLIENT users are exposed only to states that are meaningful
from their perspective: assets ready for their review and assets currently
being revised. Internal states (`UPLOADED`, `PROCESSING`, `READY_FOR_QC`)
reflect internal production workflow steps that are not CLIENT-facing.
`REJECTED` is a terminal internal state; whether and how to surface this to
a CLIENT is DEFERRED.

All status-mapping decisions are PROPOSED. The Owner may revise the mapping
before approving this record.

**Security requirement:** Status filtering and label mapping must be performed
server-side. The raw `status` value from the database must not be passed
directly to a client component without mapping through the approved CLIENT-
safe label set.

---

## 5. Reason

**Why status-only is the correct Phase 05 decision:**

1. `production.assets` has no content-reference field. Adding one requires:
   (a) deciding on a storage provider and architecture (not approved),
   (b) adding schema fields (requires a new Decision Record and migration),
   (c) implementing upload/storage logic (out of Phase 05 scope).
   None of these are approved for Phase 05.

2. Asset-content delivery is a distinct architectural concern from portal
   visibility. A CLIENT knowing that an asset is in `CLIENT_PREVIEW` status
   is useful information independent of being able to view the file.

3. Phase 05 is explicitly read-only. A storage architecture introduces
   presigned URL generation, CDN configuration, and access-control
   requirements that are disproportionate to Phase 05's read-only portal
   scope.

4. The governing security constraints prohibit exposing internal-only
   production/QC states directly to CLIENT users. Status-only still requires
   careful status filtering, which is achievable without content references.

---

## 6. Impact

**Schema changes:** None. `production.assets` is not modified.

**Phase 05 asset views:** CLIENT portal routes that reference assets render
status and metadata only. No "preview" of file content is shown. UI must
clearly indicate that asset content preview is not available in Phase 05,
or omit the preview section entirely.

**Future phases:** Asset content delivery, storage provider selection, CDN
configuration, presigned URL generation, and content-reference schema fields
are all deferred to the appropriate later phase. This record does not
constrain the architecture of that phase.

---

## 7. Risks

- **User expectation mismatch:** CLIENT users accessing a portal labeled
  "preview" who cannot view actual file content may find the experience
  confusing. Mitigation: Phase 05 portal UI should clearly describe what
  is and is not available (status information only; file preview in a
  future update).
- **Status information leakage:** Exposing any status value to CLIENT users
  that reveals internal production/QC workflow details violates the governing
  security constraint "Do not expose internal-only production/QC states
  directly to CLIENT users." Mitigation: server-side status mapping per §3
  above; raw `status` values are never passed to client components.
- **Over-exposure of asset existence:** A CLIENT must not see assets
  belonging to another organization's orders. Cross-tenant asset visibility
  is prohibited. Mitigation: all asset queries must be scoped to the
  authenticated user's `organization_id` from their session, using
  `assertRole(userId, organizationId, ['CLIENT'])` before any query.
- **QC notes exposure:** `production.qc_reviews.notes` is an internal field
  that must not be exposed to CLIENT users. No QC review data is included
  in Phase 05 CLIENT asset views.

---

## 8. Status

**APPROVED — Owner explicitly approved all decisions on 2026-09-04.**

Approved decisions:
1. Phase 05 CLIENT portal asset views are STATUS-ONLY.
2. No content-reference fields are added to `production.assets` in Phase 05.
3. No object-storage provider is introduced in Phase 05.
4. No file delivery is implemented in Phase 05.
5. Actual asset-content delivery is deferred to the appropriate future phase.
6. CLIENT-safe status mapping is approved as proposed:
   - `CLIENT_PREVIEW` → "Ready for Review"
   - `REVISION_REQUIRED` → "Revision in Progress"
7. The following internal states must NOT be exposed to CLIENT users:
   `UPLOADED`, `PROCESSING`, `READY_FOR_QC`, `REJECTED`.
8. Status filtering and label mapping must be performed server-side.
9. CLIENT must only receive authorized client-safe asset status information.

---

## Deferred Items

- Storage provider selection (cloud object storage: provider TBD).
- Content-reference fields for `production.assets` (storage_key, cdn_url,
  filename, mime_type, or equivalent).
- Presigned URL generation for asset delivery.
- CDN configuration.
- Client-facing asset download or streaming.
- `REJECTED` status exposure to CLIENT and label.
- Phase at which asset-content delivery is introduced (not Phase 05).

## Explicitly Prohibited Assumptions

- Do not assume any content-reference field exists or will be added to
  `production.assets` in Phase 05.
- Do not assume an object-storage provider is selected or approved.
- Do not assume a CLIENT may receive a URL, storage key, filename, MIME
  type, or any content reference for any asset in Phase 05.
- Do not assume the raw `production.assets.status` value may be returned
  directly to a CLIENT user without server-side mapping.
- Do not assume QC review data or internal notes are visible to CLIENT users.
- Do not assume assets from another organization are accessible to a CLIENT
  user under any circumstance.
- Do not assume this record authorizes implementation, schema changes,
  migrations, or storage configuration.
- Do not assume Decision Records 0001–0037 are altered by this record.
