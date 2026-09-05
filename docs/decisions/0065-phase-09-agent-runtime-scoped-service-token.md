# Decision Record 0065 — Phase 09: Agent Runtime Scoped Service Token Architecture

- **Decision Round:** Phase 09
- **Phase:** 09 — Agent Runtime
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration,
  or implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
- **Resolves:** DR 0055 §2.7 (service token format and validation open question);
  DR 0064 §2.9 (token storage open question)
- **Relationship to prior records:** Does not modify Decision Records 0001–0064.
  All remain authoritative and unchanged. Depends on DR 0055 (service authentication
  framework), DR 0056 (authority scope), DR 0058 (generation lifecycle), DR 0064
  (actor identity).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0064. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (DR 0055 §2.1):** The Agent Runtime is an internal platform service, not
a human user, and holds no org_membership row. It authenticates to internal
service endpoints via a Scoped Service Token — not via Auth.js session, not via
JWT.

**FACT (DR 0055 §2.7):** DR 0055 established that the Scoped Service Token exists
and that its exact format and validation mechanism required a separate Decision
Record. This record is that decision.

**FACT (DR 0056 §2.1):** The runtime operates within a strictly bounded authority
scope. Token validation must enforce that scope, not merely accept token possession
as sufficient authorization.

**FACT (verified schema, `production.ai_generations`):** The `provider` column is
TEXT nullable. `production_job_id` is TEXT nullable. Both are used as scope anchors
in this token model.

---

## 2. Decision

**PROPOSED (Owner instruction, Phase 09):**

### 2.1 Token Format — Opaque, Not JWT

**PROPOSED:** The Scoped Service Token is an opaque, randomly generated value.
It is NOT a JWT. It carries no encoded claims, no embedded expiry, no embedded
scope. All authorization attributes are stored and enforced server-side.

Rationale: A JWT is self-describing; a compromised JWT reveals its claims and
potentially permits scope manipulation by a holder who can decode it. An opaque
token reveals nothing about its scope or claims — all meaning is server-side.

### 2.2 Cryptographic Randomness — Minimum 256 Bits

**PROPOSED:** The raw token is generated from a cryptographically secure random
source at issuance time. The minimum entropy is 256 bits (32 bytes of CSPRNG
output, or equivalent in a URL-safe encoded form).

No other source of token randomness is permitted (e.g., UUIDv4 is insufficient —
UUID is 122 bits of randomness; UUIDv7 timestamp bits further reduce effective
entropy).

### 2.3 Token Storage — Hash Only; Raw Token Never Persisted

**PROPOSED:** The raw token is **never persisted** in the database.

At issuance:
1. The server generates the raw token from a CSPRNG (§2.2).
2. The server computes a cryptographic one-way hash of the raw token using a
   collision-resistant cryptographic hash function. The specific algorithm is a
   BUILD-phase implementation detail; it MUST be a collision-resistant cryptographic
   hash function (e.g., SHA-256). General-purpose or non-cryptographic hash
   functions (MD5, CRC32, FNV, etc.) are prohibited.
3. Only the hash is persisted in `system.service_tokens` (§2.7), alongside the
   token's scope, expiry, and revocation fields.
4. The raw token is returned to the issuance caller exactly once, at issuance
   time. It is not logged, cached in application memory beyond the issuance
   response, or transmitted again by the server.

After issuance, the raw token exists only in the possession of the runtime that
received it. If lost, the token cannot be recovered — a new token must be issued.

### 2.4 Token Validation — Hash Comparison

**PROPOSED:** When a service endpoint receives a token:

1. The presented raw token is hashed server-side using the same algorithm used
   at issuance (§2.3 step 2).
2. The computed hash is used to look up the token record in `system.service_tokens`
   (§2.7).
3. Hash comparison is performed using a constant-time comparison to prevent
   timing-based token inference attacks.
4. If no matching record is found, or if the record is expired or revoked, the
   request is rejected.
5. After the hash lookup succeeds, the server validates the token's scope:
   - The `organization_id` in the token record must match the `organization_id`
     of the requested operation.
   - The `production_job_id` in the token record must match the `production_job_id`
     of the requested operation.
6. Scope mismatch is rejected even if the hash matches.

**PROPOSED:** Token possession is necessary but not sufficient for authorization.
Scope validation (step 5) is mandatory on every request.

### 2.5 Server-to-Server Only — No Client or Browser Access

**PROPOSED:** The Scoped Service Token is exclusively for server-to-server
communication between the runtime process and internal service endpoints. It is
never:

- Included in any response to a browser client.
- Included in any portal or admin API response.
- Stored in a browser cookie or localStorage.
- Accessible via any client-facing route.

Any code path that would expose the token to a browser or client application is
prohibited.

### 2.6 Scope Binding — organization_id and production_job_id

**PROPOSED:** Every token record in `system.service_tokens` is bound to exactly
one `(organization_id, production_job_id)` pair at issuance. The token grants
authority only for operations within that scope, as defined by DR 0056.

A token issued for `production_job_id = X` in `organization_id = A` cannot
authorize any operation for a different job or organization, regardless of whether
the hash lookup succeeds.

### 2.7 Implied Schema — system.service_tokens

**PROPOSED (schema not authorized):** This decision implies a `system.service_tokens`
table with at minimum:

```
token_hash         TEXT NOT NULL UNIQUE   -- hash of the raw token; raw token never stored
organization_id    UUID NOT NULL
production_job_id  UUID NOT NULL
expires_at         TIMESTAMPTZ NOT NULL
revoked_at         TIMESTAMPTZ            -- nullable; NULL = not revoked
created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

An index on `token_hash` supports efficient lookup by hash. An index on
`(organization_id, production_job_id)` supports scope queries (e.g., revoking
all tokens for a given job).

**PROPOSED:** No schema change is authorized by this record. Any schema migration
requires separate authorization per CLAUDE.md.

### 2.8 Token Lifetime and Revocation

**PROPOSED:** Tokens have a finite lifetime enforced by `expires_at`. The specific
duration is a BUILD-phase implementation detail; it must be short enough to limit
blast radius in the event of token compromise, and long enough to cover the
expected maximum duration of a production job.

**PROPOSED:** Tokens may be revoked by setting `revoked_at`. A revoked token is
rejected by the validation path regardless of expiry.

**PROPOSED:** When a ProductionJob reaches a terminal state (COMPLETED or FAILED
per DR 0063), the corresponding service token SHOULD be revoked. The exact
revocation trigger is a BUILD-phase implementation detail.

### 2.9 No Client-Controlled Scope

**PROPOSED:** The scope embedded in a token record (`organization_id`,
`production_job_id`) is set exclusively by the server at issuance time. No caller
may supply or override scope via a request parameter, header, or payload. The
server determines scope from its own internal state (the ProductionJob being
initiated), not from caller input.

### 2.10 Open Items Resolved by This Record

- DR 0055 §2.7: Token format → opaque, not JWT (§2.1). ✓
- DR 0055 §2.7: Token validation → hash-compare, constant-time (§2.4). ✓
- DR 0064 §2.9: Token storage → hash only, raw token never persisted (§2.3). ✓

---

## 3. Explicitly Prohibited Assumptions

- Do not assume the raw token is stored anywhere in the database — it is not
  (§2.3).
- Do not assume token possession is sufficient for authorization — scope
  validation is always required (§2.4, §2.6).
- Do not assume a JWT is acceptable — it is not (§2.1).
- Do not assume UUIDv4 or UUIDv7 alone is acceptable as the token — minimum
  256-bit CSPRNG entropy is required (§2.2).
- Do not assume any client or browser endpoint receives the token — server-to-server
  only (§2.5).
- Do not assume MD5, CRC, or non-cryptographic hash functions are acceptable for
  token hashing — prohibited (§2.3).
- Do not assume this record authorizes schema changes, migrations, code changes,
  commits, or pushes.
- Do not assume Decision Records 0001–0064 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

**No implementation is authorized by approval of this record alone.**
Phase 09 BUILD authorization is a separate, subsequent decision.
