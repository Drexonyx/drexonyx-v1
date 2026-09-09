# Decision Record 0039 — Phase 05: Authentication Strategy and Schema Extension

- **Decision Round:** Phase 05
- **Phase:** 05 — Client Portal
- **Status:** APPROVED — explicitly approved by Owner on 2026-09-04.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-04
- **Relationship to prior records:** Does not modify Decision Records
  0001–0037. All remain authoritative and unchanged. This record addresses
  the absence of an approved authentication strategy and credential schema,
  identified as a Phase 05 implementation blocker.

## Governance Note

No authentication strategy, session model, or credential storage schema has
been approved in any Decision Record 0001–0037. Auth.js / NextAuth v5 was
identified by the Owner as the approved authentication library for Phase 05.
This record formalizes the minimum schema extension and configuration required
to support email/password authentication via Auth.js v5 Credentials provider.

Every substantive recommendation below is labeled **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REJECTED**. No schema, migration, dependency, or
application-code change is authorized by this record. All items marked
PROPOSED require explicit Owner approval before implementation.

---

## 1. Context

Phase 05 requires user authentication. The `identity.users` table currently
has the following columns: `id`, `email`, `display_name`, `archived_at`,
`created_at`, `updated_at`. No credential storage field exists.

Auth.js / NextAuth v5 Credentials provider requires a mechanism to verify a
supplied password against a stored credential. This cannot be implemented
without a schema extension.

Owner direction: use email/password credentials (Credentials provider).
No OAuth, magic-link, or social login is approved for Phase 05.

---

## 2. Decision

**What is being decided:**

1. The exact authentication strategy for Phase 05.
2. The exact schema extension required to support it.
3. The session model (JWT vs. database sessions).
4. Password reset behavior for Phase 05.
5. Email verification behavior for Phase 05.
6. Required secrets and environment variables.
7. Security requirements for credential handling.

---

## 3. Options

### 3.1 Authentication Strategy

**Option A — Auth.js v5 Credentials Provider with bcrypt (PROPOSED — Owner
direction)**

Use Auth.js / NextAuth v5 with the Credentials provider. Password hashes are
stored in `identity.users` using bcrypt. This is the minimum viable
implementation consistent with the Owner's direction.

- Library: `next-auth@5.x` (Auth.js v5) — PROPOSED (not yet installed)
- Password hashing: `bcryptjs` — PROPOSED (not yet installed; pure-JS
  implementation avoids native build dependencies)
- Strategy: email + password via Credentials provider

**Option B — Any other strategy** — REJECTED per Owner direction
(no OAuth, magic link, or social login in Phase 05).

### 3.2 Schema Extension

**PROPOSED: Add `password_hash` column to `identity.users`**

| Column | Type | Null | Notes |
|---|---|---|---|
| password_hash | text | NULL | bcrypt hash of user's password — PROPOSED |

**Justification for nullable:**
- Existing user records in `identity.users` do not have a password hash.
  Making the column NOT NULL would prevent inserting or migrating existing
  users without setting a hash. Nullable allows the column to be added
  without forcing immediate backfill of all existing rows.
- A user with `password_hash IS NULL` cannot authenticate via Credentials
  provider (no valid hash to compare against). This is safe: the Credentials
  authorize callback must reject null hashes explicitly.

**No separate credentials table is proposed for Phase 05.** The minimal
approach adds one column to the existing table. A separate credentials table
would be a cleaner long-term separation (enabling multiple credential types
per user) but is not required for Phase 05's single-strategy scope.
Separation can be introduced in a future phase.

**No OAuth accounts table is proposed for Phase 05.** Auth.js v5 uses
adapters that may require `accounts`, `sessions`, and `verification_tokens`
tables when using database sessions or OAuth. These are NOT proposed for
Phase 05 (see session model below).

**Migration impact:** One nullable column addition to `identity.identity.users`
(PostgreSQL schema: `identity`, table: `users`). A migration is required
before Phase 05 authentication can execute against the database.

### 3.3 Session Model

**Option A — JWT Sessions (PROPOSED)**

Auth.js v5 JWT sessions store the session payload in a signed, encrypted
cookie. No database table is required for session storage. This is the
minimum viable session model for Phase 05.

- Session data stored client-side in a signed/encrypted cookie.
- `AUTH_SECRET` environment variable is required to sign/encrypt the JWT.
- No `sessions` table in the database.
- No `accounts` table required (Credentials provider does not use the
  OAuth accounts table).
- Session duration and rotation are configurable in Auth.js config.

**What the JWT payload must contain (PROPOSED):**
- `userId`: `identity.users.id` (UUIDv7)
- `organizationId`: active `identity.org_memberships.organization_id`
- `role`: active `identity.org_memberships.role`

**The `organizationId` and `role` MUST come from the server-side session
only.** They must never be accepted from client-supplied request parameters.
This is mandatory per the governing security constraint: "The organization ID
must come from the authenticated membership/session, never from
client-controlled input."

**Option B — Database Sessions** — DEFERRED. Database sessions require a
`sessions` table. This is not proposed for Phase 05 in order to minimize
schema surface. May be adopted in a future phase if JWT sessions prove
insufficient.

### 3.4 Password Reset

**DEFERRED for Phase 05.** Password reset requires either:
- An email delivery provider (not yet selected or approved), or
- An admin-initiated reset flow (internal tooling, out of Phase 05 scope).

No password reset endpoint is approved for Phase 05.

### 3.5 Email Verification

**DEFERRED for Phase 05.** Email verification requires an email delivery
provider. No `verification_tokens` table or email delivery provider is
approved for Phase 05. Users are provisioned by internal roles; the email
is trusted at provisioning time.

### 3.6 Account Lifecycle

**User provisioning:** Internal roles create user accounts. CLIENT-role users
do not self-register in Phase 05. A self-registration flow is not in Phase 05
scope.

**Account archival:** `identity.users.archived_at` already supports soft
archival. An archived user (non-null `archived_at`) must not be permitted to
authenticate. The Credentials authorize callback must check `archived_at`
and reject archived users.

**Membership archival:** `identity.org_memberships.archived_at` already
supports soft archival. Session minting must verify that the user has a
non-archived membership for the target organization. If no active membership
exists, authentication must be rejected.

---

## 4. Reason

The Credentials provider is the minimum viable strategy consistent with the
Owner's direction. It requires only one schema extension (`password_hash`),
no additional tables, and no external email provider. JWT sessions eliminate
the need for a `sessions` table, keeping the Phase 05 schema footprint
minimal.

Password reset and email verification are deferred because they require an
email delivery provider that has not been selected or approved. Deferring
avoids a dependency on an unapproved external service.

No OAuth or social login is proposed for Phase 05 per Owner direction.

---

## 5. Impact

**Schema changes (all PROPOSED, not authorized until Owner approves):**
- One nullable column: `password_hash text` on `identity.identity.users`.
- No new tables for Phase 05 JWT session model.

**Package additions (PROPOSED, not authorized until Owner approves):**
- `next-auth@5.x` — Auth.js v5 authentication library.
- `bcryptjs` — pure-JS bcrypt implementation for password hashing.

**Environment variables required (PROPOSED):**
- `AUTH_SECRET` — random secret (minimum 32 bytes) used by Auth.js v5 to
  sign and encrypt session JWTs. Must be supplied exclusively via the hosting
  platform's environment variable injection. Must NOT be committed to the
  repository. Must NOT carry the `NEXT_PUBLIC_` prefix. Must NOT appear in
  any client-side code path.

**Server-side only:**
- Password hashes are never returned to browser/client components.
- `password_hash` must be excluded from every API response and client-visible
  data shape.
- Session validation, role assertion, and organization scoping are performed
  server-side on every portal request. Client components receive only
  the minimum session data required for rendering.

**Migration impact:** One migration required (`ALTER TABLE identity.users ADD
COLUMN password_hash text`). The migration must be applied to the local
development database and to any staging/production database before
Phase 05 authentication is functional.

---

## 6. Risks

- **Password hash exposure:** If `password_hash` is ever included in a SELECT
  query result that flows to a client response, credentials are exposed.
  Mitigation: explicitly exclude `password_hash` from all data-layer queries
  that return user data to application/client code.
- **Null hash bypass:** If the Credentials authorize callback does not
  explicitly check for a null `password_hash`, a user with no password set
  could authenticate with any input. Mitigation: the authorize callback must
  reject null hashes before attempting bcrypt comparison.
- **Archived user bypass:** If `archived_at` is not checked during
  authentication, soft-archived users remain able to log in. Mitigation:
  the authorize callback must check `archived_at IS NULL`.
- **Membership not verified at session mint:** If organization membership
  is not verified when the session JWT is created, a user who loses their
  membership may retain a valid session. Mitigation: the authorize callback
  must call `getMembership` (from `lib/auth/authorization.ts`) and reject if
  no active membership exists. Session expiry limits the window of exposure.
- **AUTH_SECRET committed to repository:** If `AUTH_SECRET` is accidentally
  committed, all existing sessions can be forged. Mitigation: verify
  `.gitignore` excludes `.env` and all `.env.*` files before any commit.
- **bcrypt cost factor:** A cost factor that is too low weakens password
  security; a factor that is too high degrades login performance.
  PROPOSED default: cost factor 12 (current bcryptjs default). This is
  PROPOSED and not approved by this record.

---

## 7. Status

**APPROVED — Owner explicitly approved all decisions on 2026-09-04.**

Approved decisions:
1. Auth.js / NextAuth v5 with Credentials provider (email + password).
2. `password_hash text NULL` added to `identity.identity.users`.
3. bcryptjs for password hashing.
4. JWT session model for Phase 05.
5. `AUTH_SECRET` required as a server-side environment variable.
6. `password_hash` must never appear in any client-facing query result.
7. Self-registration is OUT OF SCOPE for Phase 05.
8. Password reset is DEFERRED.
9. Email verification is DEFERRED.
10. OAuth, social login, and magic links are NOT approved for Phase 05.
11. Installation of `next-auth@5.x` and `bcryptjs` is authorized.
12. Migration for the `password_hash` column is authorized.

---

## Deferred Items

- Password reset flow and email delivery provider selection.
- Email verification at account creation.
- OAuth / social login (explicitly out of Phase 05 scope per Owner direction).
- Database sessions (deferred; JWT sessions are proposed for Phase 05).
- Multi-organization session handling (a user with memberships in more than
  one organization — which organization's context should the session carry?
  DEFERRED; Phase 05 assumes a user has one active membership).
- `accounts` table (Auth.js adapter table for OAuth; not needed for Phase 05
  Credentials-only implementation).
- `verification_tokens` table (Auth.js adapter table for magic link; not
  needed for Phase 05).
- Session invalidation on membership archival (sessions persist until expiry;
  immediate invalidation on membership revocation is not implemented in Phase 05).

## Explicitly Prohibited Assumptions

- Do not assume `password_hash` is added to `identity.users` until the Owner
  explicitly approves this record.
- Do not assume any authentication dependency is installed until the Owner
  explicitly approves installation.
- Do not assume `password_hash` may ever be returned to a browser or client
  component.
- Do not assume OAuth, magic link, or social login is in Phase 05 scope.
- Do not assume self-registration is available to CLIENT users in Phase 05.
- Do not assume `AUTH_SECRET` or any other secret may carry the
  `NEXT_PUBLIC_` prefix or appear in client-side code.
- Do not assume this record authorizes implementation, schema changes,
  migrations, or dependency installation.
- Do not assume Decision Records 0001–0037 are altered by this record.
