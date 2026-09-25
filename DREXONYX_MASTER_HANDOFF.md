# DREXONYX V1 — Master Handoff Document

**Purpose:** Permanent reference for any AI assistant (or human) continuing work on this
project. Written to survive context loss. All secret _values_ are omitted; only variable
_names_ appear.

**Last updated:** 2026-09-24  
**Branch at time of writing:** `claude/drexonyx-v1-baseline-inspection-fb76lg`  
**Latest merged commit to main:** `3963e51` (PR #23 — GitHub Actions polling workflow)

---

## A. Project Identity

| Field | Value |
|---|---|
| Project name | Drexonyx V1 |
| Domain | `www.drexonyx.com` |
| Repository | `github.com/Drexonyx/drexonyx-v1` |
| Vercel project ID | `prj_kL0zfETb2cjnRsoWQZ7bIBrFxNaW` |
| Stack | Next.js 16.x App Router, NextAuth v5, Drizzle ORM + postgres.js, Neon PostgreSQL, Cloudflare R2, Higgsfield AI, Ziina payments, Resend email |
| Runtime | Node.js (Vercel serverless functions) |
| Test framework | Vitest, 955+ tests |
| Phase | 21 — all core systems implemented |
| Organisation env var | `DREXONYX_ORG_ID` — **always server-side only, never `NEXT_PUBLIC_`** |

---

## B. Architecture

```
UI Layer            → app/(admin)/**   app/(portal)/**   app/(public)/**
Application Layer   → app/api/**
Domain Layer        → lib/agent/**   lib/admin/**   lib/commercial/**
Services Layer      → lib/auth/**   lib/pricing.ts   lib/ziina.ts
Infrastructure      → lib/infrastructure/**   db/**
External Providers  → Higgsfield AI   Ziina   Resend   Cloudflare R2   Neon
```

**Strict rules (from `ARCHITECTURE.md`):**
- Dependency flows left → right only. UI may never import Infrastructure directly.
- No Browser → DB calls. All DB access is server-side only.
- Tenant isolation is enforced server-side. `organization_id` comes from the session or DB
  row — **never from client payload or webhook body**.
- Secrets never in `NEXT_PUBLIC_*` env vars (DR 0103 §3.2).
- Unauthenticated webhooks must never mutate production state.

---

## C. Database

**Provider:** Neon PostgreSQL (serverless)  
**ORM:** Drizzle  
**Schema file root:** `db/schema/`

### PostgreSQL schemas and their tables

#### `production` schema (`db/schema/production.ts`)
| Table | Purpose |
|---|---|
| `assets` | Materialised output files (video/image/audio). Transitions: PENDING → UPLOADING → READY_FOR_QC → CLIENT_PREVIEW → APPROVED / REVISION_REQUIRED / REJECTED |
| `productionJobs` | Top-level work order. Transitions: PENDING → RUNNING → SUCCEEDED / FAILED |
| `aiGenerations` | One Higgsfield dispatch per attempt. Transitions: PENDING → RUNNING → SUCCEEDED / FAILED |
| `assetAiGenerations` | Junction: asset ↔ ai_generation |
| `qcReviews` | QC pass/fail records per asset |
| `approvals` | Client approval records per asset |
| `deliveries` | Client delivery records |
| `deliveryAssets` | Junction: delivery ↔ asset |
| `skillOutputs` | Structured outputs from AI skills |

#### `system` schema (`db/schema/system.ts`)
| Table | Purpose |
|---|---|
| `idempotencyKeys` | One-time operation guards (key, organization_id, status, expires_at) |
| `auditEvents` | Append-only audit log (entity_type, entity_id, actor_id, actor_role, action, payload) |

#### `identity` schema (`db/schema/identity.ts`)
| Table | Purpose |
|---|---|
| `organizations` | Tenant records |
| `users` | Admin/staff user accounts |

#### `commercial` schema (`db/schema/commercial.ts`)
| Table | Purpose |
|---|---|
| `orders` | Customer orders |
| `customers` | Customer records |
| `credits` | Credit ledger entries |

#### `core` schema (`db/schema/core.ts`)
| Table | Purpose |
|---|---|
| `skillDefinitions` | AI skill registry |

### Design patterns
- **CAS (Compare-And-Swap):** Every state transition uses `WHERE status = 'EXPECTED'` inside a
  Drizzle transaction. If 0 rows updated → throw `CONCURRENT_MODIFICATION`, which is caught and
  treated as a no-op (idempotent retry safe).
- **Idempotency keys:** `idempotencyKeys` table guards all webhook handlers and cron outcomes.
  Key format: `AI_GEN_WEBHOOK:{gen.id}:{status}`.
- **Audit trail:** Every state change writes to `auditEvents` with `actor_id = production_job_id`
  and `actor_role = 'AGENT'` (DR 0064).

---

## D. API Routes

### Internal / Cron
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/internal/poll-generations` | POST | Bearer `CRON_SECRET` | Poll up to 50 RUNNING generations; single `pollGenerationStatus` per invocation |

### Webhooks
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/webhooks/higgsfield` | POST | HMAC-SHA256 `HIGGSFIELD_WEBHOOK_SECRET` | Higgsfield job completion callback |
| `/api/webhooks/ziina` | POST | HMAC `ZIINA_WEBHOOK_SECRET` | Ziina payment status callback |
| `/api/webhooks/whatsapp` | POST | HMAC `WHATSAPP_WEBHOOK_SECRET` | WhatsApp inbound message routing |

### Admin Portal API
| Route | Purpose |
|---|---|
| `/api/admin/orders/**` | Order CRUD |
| `/api/admin/customers/**` | Customer management |
| `/api/admin/production-jobs/**` | Job management and dispatch |
| `/api/admin/assets/**` | Asset management |
| `/api/admin/qc/**` | QC review operations |
| `/api/admin/approvals/**` | Approval workflow |
| `/api/admin/pipeline/**` | Automated pipeline triggers |
| `/api/admin/credits/**` | Credit management |

### Client Portal API
| Route | Purpose |
|---|---|
| `/api/portal/orders/**` | Client-facing order status |
| `/api/portal/assets/**` | Client asset preview |
| `/api/portal/approvals/**` | Client approval submission |

### Public API
| Route | Purpose |
|---|---|
| `/api/checkout` | Payment intent creation (Ziina) |
| `/api/auth/[...nextauth]` | NextAuth v5 handlers |

---

## E. Environment Variables

**Security rule:** Variables marked "server-only" must never have `NEXT_PUBLIC_` prefix.
**ZIINA_TEST_MODE must remain `true` until explicitly authorised to go live.**

| Variable | Where used | Classification |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection | server-only |
| `NEXTAUTH_SECRET` | NextAuth session signing | server-only |
| `NEXTAUTH_URL` | NextAuth redirect base URL | server-only |
| `DREXONYX_ORG_ID` | Tenant isolation — canonical org ID | server-only |
| `CRON_SECRET` | Bearer auth for `/api/internal/poll-generations` | server-only |
| `HIGGSFIELD_API_KEY` | `Key {KEY_ID}:{KEY_SECRET}` composite | server-only |
| `HIGGSFIELD_WEBHOOK_SECRET` | HMAC-SHA256 webhook verification | server-only |
| `CLOUDFLARE_ACCOUNT_ID` | R2 account | server-only |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 access key | server-only |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 secret | server-only |
| `CLOUDFLARE_R2_BUCKET_NAME` | R2 bucket for assets | server-only |
| `CLOUDFLARE_R2_PUBLIC_URL` | Public CDN URL for R2 | may be public |
| `ZIINA_API_KEY` | Ziina payment API | server-only |
| `ZIINA_WEBHOOK_SECRET` | Ziina HMAC verification | server-only |
| `ZIINA_TEST_MODE` | `true` = test/sandbox mode (**default: true**) | server-only |
| `RESEND_API_KEY` | Transactional email | server-only |
| `RESEND_FROM_EMAIL` | Sender address | server-only |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Facebook Graph API publishing | server-only |
| `FACEBOOK_PAGE_ID` | Target Facebook page ID | server-only |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp webhook hub.verify_token | server-only |
| `WHATSAPP_WEBHOOK_SECRET` | WhatsApp HMAC verification | server-only |
| `ANTHROPIC_API_KEY` | Anthropic Claude API | server-only |
| `ADMIN_CREDENTIALS_SECRET` | Admin portal password hash seed | server-only |
| `PORTAL_CREDENTIALS_SECRET` | Client portal password hash seed | server-only |
| `PRODUCTION_AI_PROVIDER` | Default AI provider for auto-jobs | server-only |
| `PRODUCTION_AI_MODEL` | Default AI model for auto-jobs | server-only |
| `PRODUCTION_AI_PROMPT` | Default AI prompt for auto-jobs | server-only |
| `AUTOMATED_QC_REQUIRE_FILE` | `true` = fail QC if file_key absent (default: `true`) | server-only |
| `NEXT_PUBLIC_APP_URL` | Public app base URL | public |

Full canonical list in `.env.example`.

---

## F. Higgsfield AI Integration

**Provider file:** `lib/agent/providers/higgsfield.ts`

### Authentication
```
Authorization: Key {HIGGSFIELD_API_KEY}
```
`HIGGSFIELD_API_KEY` is a single env var containing `{KEY_ID}:{KEY_SECRET}` (composite).

### Models and endpoints
| Model slug | Endpoint | Output type |
|---|---|---|
| `text2image/soul` | `POST /v1/text2image/soul` | Image |
| `image2video/dop` | `POST /v1/image2video/dop` | Video |
| `speak/higgsfield` | `POST /v1/speak/higgsfield` | Audio |

### Dispatch response fields
- Primary job ID: `request_id`
- Fallbacks (in order): `job_id`, `id`

### Status polling
- Endpoint: `GET /requests/{request_id}/status`
- SUCCEEDED statuses: `['completed']`
- NSFW status: `'nsfw'` (treated as permanent failure)
- Transient failure statuses: `['server_error', 'unavailable']`
- Output URL: `video?.url` (video/audio) or `images?.[0]?.url` (image)

### Webhook verification
- Header: `x-higgsfield-signature`
- Algorithm: HMAC-SHA256 with `HIGGSFIELD_WEBHOOK_SECRET`
- Comparison: constant-time (`crypto.timingSafeEqual`)
- **CRITICAL:** If `HIGGSFIELD_WEBHOOK_SECRET` is not set, the webhook handler returns 401
  immediately — it never accepts an unauthenticated payload.

---

## G. Generation Pipeline

```
Admin dispatch → productionJob RUNNING
              → aiGeneration PENDING → RUNNING (dispatchToProvider)
              → Higgsfield job created → provider_job_id stored
              → HALT — driver returns, no polling loop
              ↓
  [Webhook arrives OR GitHub Actions cron polls /api/internal/poll-generations]
              ↓
  aiGeneration RUNNING → SUCCEEDED / FAILED
              ↓
  SUCCEEDED → materializeGenerationAsset
            → Download resultUrl → upload to R2
            → Insert assets row (PENDING → READY_FOR_QC)
            → Insert assetAiGenerations junction row
            ↓
  attemptProductionJobCompletion
            → productionJob RUNNING → SUCCEEDED (if all gens done)
            ↓
  runAutomatedQcAndPipeline
            → QC checks (file_key, file_type, file_size present and >0)
            → PASS: asset → CLIENT_PREVIEW, insert approvals row (PENDING)
            → FAIL: asset → REVISION_REQUIRED, create revision job
              (AI_GENERATION if PRODUCTION_AI_* vars set, else MANUAL_UPLOAD)
              Max 3 revision cycles before REJECTED
              ↓
  FAILED (transient, retry_count < 2) → retryDispatch → new aiGeneration
  FAILED (permanent OR retry exhausted) → failProductionJob
```

**Key files:**
- `lib/agent/driver.ts` — `dispatchProductionJob`, `retryDispatch`
- `lib/agent/providers/higgsfield.ts` — provider implementation
- `lib/agent/materialization.ts` — `materializeGenerationAsset`
- `lib/agent/terminal.ts` — `attemptProductionJobCompletion`, `failProductionJob`
- `lib/admin/automated-pipeline.ts` — `runAutomatedQcAndPipeline`
- `app/api/webhooks/higgsfield/route.ts` — webhook handler
- `app/api/internal/poll-generations/route.ts` — cron polling endpoint

---

## H. Cron / Polling

### Primary path: Higgsfield webhook
`POST /api/webhooks/higgsfield` — fires on job completion, triggers full pipeline.

### Fallback path: GitHub Actions workflow
**File:** `.github/workflows/poll-generations.yml`  
**Schedule:** `*/5 * * * *` (every 5 minutes)  
**Action:** `curl` with `Authorization: Bearer ${{ secrets.CRON_SECRET }}` to
`https://www.drexonyx.com/api/internal/poll-generations`  
**Failure:** exits non-zero on HTTP status outside 200–299  
**Secret:** `CRON_SECRET` must be set as a GitHub repository Actions secret  
(`Settings → Secrets and variables → Actions → New repository secret`)

### Why GitHub Actions instead of Vercel Cron
Vercel Hobby plan only allows daily cron jobs. Sub-daily schedules (`*/5 * * * *`) are blocked
with `cron_jobs_limits_reached`. GitHub Actions scheduled workflows have no such restriction
and are free.

### vercel.json
Contains only `{}` — no `crons` block. This is intentional and correct.

### Polling endpoint behaviour
- Queries up to 50 RUNNING `aiGenerations` rows with non-null `provider_job_id`
- Calls `pollGenerationStatus` (single-shot) per generation
- Returns `{ polled, done, still_running, errors }`
- Returns 401 if `Authorization: Bearer {CRON_SECRET}` header missing or incorrect

---

## I. Payments (Ziina)

**Provider:** Ziina API v2 (`https://api-v2.ziina.com/api`)  
**File:** `lib/ziina.ts`  
**Currency:** AED only  
**Amount:** in fils (1 AED = 100 fils)  
**Test mode:** `ZIINA_TEST_MODE` — defaults to `true`. **Do NOT set to `false`** until
explicitly authorised for live payments.

### Payment intent lifecycle
1. `POST /payment_intent` — create intent with amount (fils), currency AED, redirect URLs
2. Client redirected to Ziina hosted page
3. Ziina POSTs to `/api/webhooks/ziina` on completion
4. Webhook verifies HMAC, updates order status

### Payment status values
- `completed` — payment succeeded
- `failed` — payment failed
- `canceled` — payment canceled (note: single 'l' in Ziina API)

### Security
- `ZIINA_API_KEY` — server-only, never exposed to browser
- `ZIINA_WEBHOOK_SECRET` — HMAC verification, mandatory
- Amount calculated server-side from `lib/pricing.ts` — never trust client-supplied price

---

## J. Authentication

**Library:** NextAuth v5  
**Config file:** `auth.ts` (project root)

### Providers
Two separate Credentials providers:

| Provider ID | Portal | Session shape |
|---|---|---|
| `admin-credentials` | Admin portal (`/admin`) | `{ role: 'admin', userId, organizationId }` |
| `portal-credentials` | Client portal (`/portal`) | `{ role: 'client', customerId, organizationId }` |

### Session rules
- `organizationId` is always taken from the server-side session — never from request body
- Admin routes protected by `role === 'admin'` check in middleware
- Client portal routes protected by `role === 'client'` check

### Middleware
- `middleware.ts` at project root
- Protects `/admin/**` and `/portal/**`
- Public routes: `/`, `/pricing`, `/checkout`, `/api/webhooks/**`, `/api/checkout`

---

## K. Facebook Integration

**Skill file:** `lib/skills/facebook-publish.ts` (DR 0126)  
**Status:** Implemented, requires `HUMAN_GATE` before publish  
**Pages:** Only 2 preconfigured pages (IDs from `FACEBOOK_PAGE_ID` env var)  
**Media:** R2 URLs only — no external URLs passed to Facebook Graph API  
**Endpoint:** Facebook Graph API v18 `POST /{page-id}/videos` or `/{page-id}/photos`

### WhatsApp inbound (DR 0125)
**File:** `app/api/webhooks/whatsapp/route.ts`  
**Verification:** HMAC-SHA256 with `WHATSAPP_WEBHOOK_SECRET`  
**Direction:** Inbound only — routes to orchestration layer. No outbound sends implemented.

---

## L. Pricing & Credits

**File:** `lib/pricing.ts` — static data, no server-side calculation.  
**Currency:** AED only.

### Micro packages
| Slug | Name | Price (AED) |
|---|---|---|
| `micro-creative` | Micro Creative | 199 |
| `creative-brief` | Creative Brief | 299 |

### Production packages
| Slug | Name | Price (AED) | Notes |
|---|---|---|---|
| `spark` | Spark | 499 | |
| `starter` | Starter | 1,500 | |
| `growth` | Growth | 3,500 | Highlighted (recommended) |
| `scale` | Scale | 6,500 | |
| `production` | Production | 14,500 | |

### Custom tiers
| Slug | Name | Price |
|---|---|---|
| `brand-film` | Brand Film | From AED 35,000 |
| `enterprise` | Enterprise | Custom (contact) |

### Credits
- Credits are stored in the `commercial.credits` ledger table
- Credit balance is calculated server-side by summing ledger entries
- Credits are denominated in AED-equivalent units

---

## M. Known Issues / Active Blockers

### 1. GitHub Actions secret `CRON_SECRET` — MANUAL ACTION REQUIRED
The `CRON_SECRET` must be added as a GitHub repository Actions secret manually:
1. Go to `github.com/Drexonyx/drexonyx-v1/settings/secrets/actions`
2. Click **New repository secret**
3. Name: `CRON_SECRET`
4. Value: the exact same `CRON_SECRET` value configured in Vercel Production

**Why this can't be automated:** No `gh` CLI is available in the remote execution environment,
the GitHub MCP server exposes no secrets management tool, and the Vercel API cannot read
sensitive environment variable values.

**Impact:** Until this secret is set, the GitHub Actions polling workflow will run but the
`/api/internal/poll-generations` endpoint will return 401 for all poll attempts.

### 2. Vercel Production deployment
The `vercel.json` now contains only `{}`. The Vercel GitHub integration should auto-deploy
on the next push to main. If not, trigger a manual deployment from the Vercel dashboard.

### 3. ZIINA_TEST_MODE
Must remain `true` until explicitly authorised for live payment collection. Do NOT set to
`false` without business/legal clearance.

### 4. Facebook HUMAN_GATE
Facebook publishing requires manual approval step before posts are sent. This is intentional
and must not be removed.

---

## N. Completed Work (cumulative)

| Item | Status | Notes |
|---|---|---|
| NextAuth v5 dual-portal auth | ✅ Done | Admin + client credentials providers |
| Drizzle ORM + Neon PostgreSQL | ✅ Done | 5 PostgreSQL schemas, full migration history |
| Cloudflare R2 asset storage | ✅ Done | `lib/infrastructure/object-storage.ts` |
| Higgsfield AI provider | ✅ Done | text2image, image2video, speak models |
| AI generation dispatch (fire-and-forget removed) | ✅ Done | `lib/agent/driver.ts` |
| Higgsfield webhook handler | ✅ Done | HMAC-SHA256, mandatory auth, CAS transactions |
| Asset materialization | ✅ Done | `lib/agent/materialization.ts` |
| Automated QC pipeline | ✅ Done | `lib/admin/automated-pipeline.ts` |
| Retry logic (transient failures) | ✅ Done | `retryDispatch`, max 2 retries |
| Production job terminal states | ✅ Done | `lib/agent/terminal.ts` |
| Idempotency keys pattern | ✅ Done | All webhook + cron handlers protected |
| Audit events | ✅ Done | All state transitions logged |
| Ziina payment integration | ✅ Done | Test mode, AED, fils conversion |
| Ziina webhook handler | ✅ Done | HMAC verified |
| Resend email | ✅ Done | Transactional emails |
| Admin portal | ✅ Done | Orders, customers, jobs, assets, QC, approvals |
| Client portal | ✅ Done | Order status, asset preview, approval flow |
| Public site + pricing page | ✅ Done | Static pricing from `lib/pricing.ts` |
| Checkout flow | ✅ Done | Ziina payment intent creation |
| Facebook publish skill | ✅ Done | HUMAN_GATE enforced, R2 media only |
| WhatsApp inbound webhook | ✅ Done | HMAC verified, routes to orchestration |
| GitHub Actions polling workflow | ✅ Done | `.github/workflows/poll-generations.yml` |
| Vercel Cron removed | ✅ Done | `vercel.json` = `{}`, no sub-daily limit |
| Vitest test suite | ✅ Done | 955+ tests |
| `ARCHITECTURE.md` + `CLAUDE.md` | ✅ Done | Governing documents in repo |

---

## O. Verification Status

### Last full check run (2026-09-24)
| Check | Result |
|---|---|
| `tsc --noEmit` | Pass |
| `eslint` | Pass |
| `vitest run` | Pass (955+ tests) |
| `next build` | Pass |
| Webhook auth (missing secret → 401) | Confirmed in code |
| Webhook auth (bad signature → 401) | Confirmed in code |
| Fire-and-forget polling removed | Confirmed — no `void boundedPollUntilTerminal(...)` call |
| GitHub Actions workflow schedule | `*/5 * * * *` confirmed |
| GitHub Actions secret reference | `secrets.CRON_SECRET` confirmed |
| `vercel.json` crons removed | Confirmed — file contains only `{}` |
| ZIINA_TEST_MODE default | `true` confirmed in `lib/ziina.ts` |

---

## P. Exact Next Steps (priority order)

### Immediate (unblock production)
1. **Set GitHub Actions secret `CRON_SECRET`**
   - URL: `github.com/Drexonyx/drexonyx-v1/settings/secrets/actions`
   - Name: `CRON_SECRET`
   - Value: same as `CRON_SECRET` in Vercel Production
   
2. **Verify Vercel auto-deploys main** — check Vercel dashboard for latest deployment status
   after PR #23 merge.

3. **Test the polling endpoint end-to-end** — trigger a test generation through the admin
   portal, wait for webhook or GitHub Actions cron, confirm asset materialises.

### Before going live
4. **Enable ZIINA_TEST_MODE=false** only after business/legal clearance for live payments.
5. **Configure `HIGGSFIELD_WEBHOOK_SECRET`** in Vercel Production if not already set (mandatory
   for webhook path to function).
6. **Smoke test the full generation pipeline** end-to-end in production environment.
7. **Review Facebook HUMAN_GATE flow** — confirm approval UX is satisfactory before enabling
   social publishing.

### Future work (not yet scoped)
- Analytics / reporting dashboard
- Multi-tenant expansion (additional organisations)
- Stripe integration (if Ziina is replaced or supplemented)
- WhatsApp outbound messaging

---

## Q. New-Chat Bootstrap Prompt

Use this verbatim at the start of a new AI chat session to restore context:

---

```
You are continuing work on the DREXONYX V1 project.
Repository: github.com/Drexonyx/drexonyx-v1
Branch: claude/drexonyx-v1-baseline-inspection-fb76lg

Read DREXONYX_MASTER_HANDOFF.md at the repository root before doing anything else.
That document contains the complete project state, architecture, all env var names,
the generation pipeline, known issues, and exact next steps.

Key constraints that are ALWAYS in effect — never override these without explicit approval:
- ZIINA_TEST_MODE must remain true (no live payments)
- organizationId always comes from server-side session or DB row (never from client)
- Unauthenticated webhooks must never mutate production state
- HIGGSFIELD_WEBHOOK_SECRET absence must cause 401 — never allow fallthrough
- No NEXT_PUBLIC_ prefix on any secret or credential variable
- Do not create duplicate production jobs, orders, or payment records
- Do not modify database records directly
- Do not expose secret values in any output

The active blocker is: CRON_SECRET must be added as a GitHub Actions repository secret manually at:
github.com/Drexonyx/drexonyx-v1/settings/secrets/actions
```

---

## R. Historical Context

### Phase 1–20 (prior to this handoff document)
- Full stack implemented across all phases: auth, portals, orders, credits, payments, AI
  generation, asset management, QC, approvals, deliveries, email, R2 storage, Facebook, WhatsApp
- All systems passed typecheck, lint, and 955+ Vitest tests

### PR history (recent)
| PR | Title | Status |
|---|---|---|
| #22 | Higgsfield production hardening (webhook auth, materialization, QC, retry) | Merged → main at `987d09b` |
| #23 | Replace Vercel Cron with GitHub Actions polling workflow | Merged → main at `3963e51` |

### Why GitHub Actions instead of Vercel Cron
Vercel Hobby plan enforces a `cron_jobs_limits_reached` error for any cron schedule more
frequent than daily. The polling requirement is every 5 minutes. GitHub Actions scheduled
workflows support `*/5 * * * *` at no cost. The endpoint authentication model (`Bearer CRON_SECRET`)
is identical — only the scheduler changed.

### Why fire-and-forget polling was removed
The original `dispatchProductionJob` implementation called
`void boundedPollUntilTerminal(...)` after dispatch, which would hold a serverless function
open for the full generation duration (minutes). This caused Vercel function timeouts and
wasted compute. The correct model is: dispatch, halt, let webhook complete the pipeline,
with cron as a durable fallback. The driver now returns immediately after dispatch (Step 6).

### Security decisions on record
- **DR 0059:** Higgsfield webhook mandatory signature verification
- **DR 0061:** Retry logic — transient failures retry up to 2 times; permanent failures go
  directly to `failProductionJob`
- **DR 0063:** `attemptProductionJobCompletion` called after every successful generation
- **DR 0064:** `actor_id = production_job_id`, `actor_role = 'AGENT'` on all audit events
- **DR 0078:** Asset materialization failure leaves job RUNNING (recoverable), never silently
  marks job failed
- **DR 0103:** No secret in `NEXT_PUBLIC_*` vars
- **DR 0125:** WhatsApp webhook HMAC-verified; inbound only
- **DR 0126:** Facebook publish requires HUMAN_GATE; R2 media only

---

*End of DREXONYX_MASTER_HANDOFF.md*
