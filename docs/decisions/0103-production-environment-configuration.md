# Decision Record 0103 — Phase 18: Production Environment Configuration

- **Decision Round:** Phase 18
- **Phase:** 18 — Production Hardening (Minimum Viable Ops)
- **Status:** PROPOSED — Awaiting Owner approval. No schema, migration,
  application-code change, or `.env.example` update is authorized by this
  record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-09
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg`
  — Head commit `a866ee9` (Phase 16 complete)
- **Resolves:** Phase 17 finding M-1 — `.env.example` is missing five critical
  runtime variables required by the deployed application, making deployment
  from the existing documentation incomplete.
- **Relationship to prior records:** Does not modify Decision Records
  0001–0102. All remain authoritative and unchanged. Depends on DR 0039
  (AUTH_SECRET, JWT session model), DR 0044/0045 (Stripe integration),
  DR 0077 (Higgsfield REST API contract), DR 0081 (R2 object storage),
  DR 0099 (RESEND delivery email). Supersedes no prior record; extends the
  environment variable documentation only.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0102. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified source
code, or an explicit Owner instruction.

---

## 1. Context

**FACT (Phase 17 inspection, `.env.example`):** The committed `.env.example`
documents the following variables: `DATABASE_URL`, `SKILLS_AI_MODEL`,
`ANTHROPIC_API_KEY`, `HIGGSFIELD_API_BASE_URL`, `HIGGSFIELD_API_KEY_ID`,
`HIGGSFIELD_API_KEY_SECRET`, `HIGGSFIELD_WEBHOOK_URL`,
`HIGGSFIELD_WEBHOOK_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`.

**FACT (Phase 17 inspection, verified from source):** The following variables
are read by production code and throw or fail silently if absent, but are
**not documented** in `.env.example`:

| Variable | Source file | Behavior if absent |
|---|---|---|
| `AUTH_SECRET` | NextAuth v5 (`auth.ts`, DR 0039) | JWT signing/encryption fails; all sessions invalid |
| `STRIPE_SECRET_KEY` | `lib/stripe.ts:7–9` | Stripe client construction throws |
| `STRIPE_WEBHOOK_SECRET` | `app/api/webhooks/stripe/route.ts:20–22` | Webhook verification logs error, returns 500 |
| `RESEND_API_KEY` | `lib/email/delivery.ts:20–21` | `sendDeliveryEmail` throws at runtime |
| `RESEND_FROM_ADDRESS` | `lib/email/delivery.ts:23–24` | `sendDeliveryEmail` throws at runtime |

**FACT (Phase 17 inspection, `lib/email/delivery.ts:43–44`):**
`NEXT_PUBLIC_BASE_URL` is read in `sendDeliveryEmail` to construct the portal
link in delivery emails. It is already present in `.env.example` (implicitly,
as it carries the `NEXT_PUBLIC_` prefix and is referenced in the existing
documentation comments), but its role in email construction is not documented.
Verified: the variable is **not** used to carry a secret; it is used to
construct a URL only.

**FACT (Phase 17 inspection, `lib/admin/deliveries.ts:21`):**
`DELIVERY_EMAIL_URL_EXPIRY_SECONDS` is a **code constant**, not an environment
variable. Its value (`604800`) is hard-coded per DR 0099. It must not be
promoted to an environment variable unless a future DR explicitly approves
that change.

**FACT (DR 0039 §3.3, §5):** `AUTH_SECRET` is a required server-side secret.
It must never carry the `NEXT_PUBLIC_` prefix. It must not be committed to
the repository. It must be injected exclusively via the hosting platform's
environment variable management.

**FACT (DR 0039 §3.1):** The authentication strategy is NextAuth v5 with the
Credentials provider. `AUTH_SECRET` is the only authentication-layer secret.

**FACT (`lib/stripe.ts:31`):** The constant `STRIPE_WEBHOOK_SECRET_KEY =
'STRIPE_WEBHOOK_SECRET'` is the string name of the environment variable read
by the webhook route. No other name is used.

---

## 2. Decision

**What is being decided:**

1. The complete, authoritative list of environment variables required for a
   production deployment of DREXONYX V1 at HEAD.
2. The classification of each variable (required runtime secret vs. required
   runtime configuration vs. optional with documented default).
3. The documentation standard for `.env.example`.
4. The server-only boundary rule for secrets.
5. Deployment validation expectations.

---

## 3. Proposed Decisions

### 3.1 Complete Variable Inventory

**PROPOSED — the following is the authoritative variable inventory for
production deployment:**

#### Required Runtime Secrets (server-side only, never `NEXT_PUBLIC_*`)

These variables carry sensitive credentials. Absence causes a runtime failure.
They must be injected via the hosting platform; they must never appear in any
file committed to the repository.

| Variable | Purpose | Source DR |
|---|---|---|
| `AUTH_SECRET` | NextAuth v5 JWT signing/encryption — minimum 32 bytes, random | DR 0039 |
| `STRIPE_SECRET_KEY` | Stripe API client authentication | DR 0044/0045 |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook HMAC verification (`whsec_...` prefix) | DR 0044/0045 |
| `RESEND_API_KEY` | Resend email delivery API authentication (`re_...` prefix) | DR 0099 |
| `DATABASE_URL` | PostgreSQL connection string (includes credentials) | DR 0001/0002 |
| `ANTHROPIC_API_KEY` | Anthropic API — Skills AI model invocations | DR 0073 |
| `HIGGSFIELD_API_KEY_ID` | Higgsfield API authentication (ID component) | DR 0077 |
| `HIGGSFIELD_API_KEY_SECRET` | Higgsfield API authentication (secret component) | DR 0077 |
| `HIGGSFIELD_WEBHOOK_SECRET` | Higgsfield webhook HMAC verification | DR 0077 |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key | DR 0081 |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key | DR 0081 |

#### Required Runtime Configuration (server-side, not secrets)

These variables carry configuration that is required for the application to
function correctly but do not carry secret credentials. They must be set in
every environment (development, staging, production).

| Variable | Purpose | Notes |
|---|---|---|
| `RESEND_FROM_ADDRESS` | Sender address for delivery emails | Format: `Name <email@domain.com>` |
| `DATABASE_URL` | PostgreSQL connection string | Listed above; included here for completeness — it contains credentials |
| `HIGGSFIELD_API_BASE_URL` | Higgsfield REST API base URL | V2: `https://platform.higgsfield.ai` |
| `HIGGSFIELD_WEBHOOK_URL` | Callback URL appended to Higgsfield dispatch requests | Must be publicly reachable |
| `R2_ACCOUNT_ID` | Cloudflare R2 account identifier | Not a secret |
| `R2_BUCKET_NAME` | R2 bucket name | Not a secret |
| `SKILLS_AI_MODEL` | Anthropic model ID for skill invocations | Example: `claude-sonnet-4-6` |

#### Optional with Application Default

| Variable | Purpose | Behavior if absent |
|---|---|---|
| `R2_ENDPOINT` | R2 endpoint override | Defaults to `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com` |
| `NEXT_PUBLIC_BASE_URL` | Application base URL for portal links in delivery emails | Falls back to `https://portal.example.com` in email construction; portal navigation unaffected |

#### Browser-Exposed Variables (`NEXT_PUBLIC_*`)

| Variable | Purpose | Notes |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | Base URL for portal link in delivery emails | URL only — no credentials. Readable by browser code. |

### 3.2 Server-Only Boundary Rule

**PROPOSED — the following rule applies to all existing and future
environment variables in this project:**

1. Any variable that carries a credential, API key, secret, private key,
   database password, HMAC secret, or JWT signing key **must not** carry
   the `NEXT_PUBLIC_` prefix and **must not** appear in any client-side
   code path, client component, or browser-accessible bundle.

2. `NEXT_PUBLIC_*` variables are **only** permitted for:
   - Public base URLs (e.g., `NEXT_PUBLIC_BASE_URL`)
   - Feature flags with no security implication
   - Other non-sensitive client-facing configuration

3. Any new environment variable proposed for a future DR must be classified
   against this rule before implementation is authorized.

**FACT (verified):** No currently used secret variable carries the
`NEXT_PUBLIC_` prefix. This rule formalizes the existing practice.

### 3.3 `.env.example` Documentation Standard

**PROPOSED — `.env.example` must, after Phase 18 BUILD:**

1. Document every variable in §3.1 with:
   - The variable name
   - An empty value (no real credentials)
   - A one-line comment describing its purpose and the phase/DR that
     introduced it
   - A note if the variable is optional and what the default behavior is

2. Group variables by subsystem (Authentication, Stripe, Email, Higgsfield,
   R2, Database, Skills AI, Application).

3. Include the server-only boundary rule as a header comment.

4. Not contain any real credential values. The file is committed to the
   repository and must never carry secrets.

**The actual update to `.env.example` is authorized during Phase 18 BUILD
only, not during this DR drafting phase.**

### 3.4 Deployment Validation Expectation

**PROPOSED:** Every production deployment must verify, before first traffic:

1. All variables in the "Required Runtime Secrets" and "Required Runtime
   Configuration" categories are non-empty in the deployment environment.

2. `AUTH_SECRET` is at least 32 bytes of cryptographically random data.

3. `STRIPE_WEBHOOK_SECRET` matches the secret configured in the Stripe
   Dashboard for the production webhook endpoint.

4. `HIGGSFIELD_WEBHOOK_URL` is the publicly reachable URL registered with
   Higgsfield for production callbacks.

**PROPOSED:** The mechanism for this validation (startup check, CI gate,
deployment checklist) is not prescribed by this record. The choice of
mechanism is **DEFERRED** to the Phase 18 BUILD step.

---

## 4. Non-Goals

- Secret management infrastructure (Vault, AWS Secrets Manager, etc.) is not
  approved or required by this record. The hosting platform's native
  environment variable injection is the approved mechanism for Phase 18.
  A future DR may introduce a dedicated secrets manager.
- Certificate management, TLS configuration, or CDN secrets.
- Stripe publishable key (client-safe) — not a secret; not covered by this
  record's server-only boundary focus. A future DR may address client-side
  Stripe configuration if required.
- DELIVERY_EMAIL_URL_EXPIRY_SECONDS — this is a hard-coded constant per
  DR 0099 and must not be promoted to an environment variable by this record.

---

## 5. Deferred Items

1. Secret rotation policy and procedures — DEFERRED.
2. Staging vs. production variable separation strategy — DEFERRED.
3. CI/CD secret injection mechanism — DEFERRED.
4. Startup validation implementation — DEFERRED to BUILD step.
5. Stripe publishable key for any future client-side Stripe components — DEFERRED.

---

## 6. Explicitly Prohibited Assumptions

- Do not assume `.env.example` has been updated by this record. It is updated
  only during Phase 18 BUILD.
- Do not assume any new environment variable is introduced by this record. The
  inventory in §3.1 documents variables already present in the codebase.
- Do not assume `DELIVERY_EMAIL_URL_EXPIRY_SECONDS` is an environment
  variable. It is a code constant.
- Do not assume this record authorizes implementation, schema changes,
  migrations, dependency installation, or any code changes.
- Do not assume Decision Records 0001–0102 are altered by this record.
- Do not introduce secret-management infrastructure unless a future DR
  explicitly approves it.
- Do not expose any variable from §3.1 "Required Runtime Secrets" via
  `NEXT_PUBLIC_*` prefix or any client-accessible path.
