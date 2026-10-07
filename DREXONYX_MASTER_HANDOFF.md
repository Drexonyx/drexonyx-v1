# DREXONYX V1 — Master Handoff Document

**Purpose:** Permanent reference for any AI assistant (or human) continuing work on this
project. Written to survive context loss. All secret _values_ are omitted; only variable
_names_ appear.

**Last updated:** 2026-10-07  
**Branch at time of writing:** `ccr-3a71ba38-pwua60`  
**Latest commit on branch:** `e9676bf` (feat: dynamic platform personalization for outreach drafts)  
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
| Sales Engine — DB schema | ✅ Done | `db/schema/sales.ts` — `sales` PostgreSQL schema |
| Sales Engine — Lead skills | ✅ Done | `lib/skills/sales/` — discover, qualify, score, outreach-draft |
| Sales Engine — Discovery agent | ✅ Done | `lib/agents/sales-discovery-specialist.ts` |
| Sales Engine — Orchestration writer | ✅ Done | `lib/orchestration/sales-writer.ts` |
| Sales Engine — Outreach sender | ✅ Done | `lib/sales/outreach-sender.ts` (Resend, email only) |
| Sales Engine — Approval policy | ✅ Done | `lib/sales/queries.ts` → `getApprovalPolicy` |
| Sales Engine — Opt-out system | ✅ Done | `email_opt_outs` + `opt_out_tokens` tables; checked before every send |
| Ziina CTA in proposal emails | ✅ Done | `buildEmailHtml` renders "Pay 599 AED Securely" button for proposals only |
| Proposal copy — correct offer | ✅ Done | SYSTEM_PROMPT corrected: AED 599 one-time, static website, domain setup |
| Proposal copy — voice and structure | ✅ Done | Confident hook, outcome framing, approved CTA line |
| Dynamic platform personalization | ✅ Done | `sourcePlatform`/`sourceUrl` flow through skill → AI prompt |
| MDA Demo Production Standard | ✅ Done | Section T in this Master File — full QC + handoff + payment→production spec |

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

### Before live sales outreach
8. **Set `SALES_OUTREACH_TEST_MODE=false`** only after owner explicitly authorises live email sends.
9. **Verify `RESEND_FROM_ADDRESS`** is set to the correct MDA sender address in Vercel Production.
10. **Smoke test opt-out flow** end-to-end: send a test email, click unsubscribe link, confirm token is consumed and `opted_out_at` is set.
11. **Verify approval gate** for proposals: confirm PENDING messages do not auto-send; confirm APPROVED messages do auto-send on next cron run.

### Demo Production workflow (Section T)
12. **Implement demo generator** — a skill or agent that takes prospect data (from `sales_leads` + `lead_sources`) and produces a complete static HTML demo page following the MDA Demo Production Standard (Section T).
13. **Implement demo QC runner** — automated checks covering T5–T9 that produce a DEMO_READY / DEMO_BLOCKED decision with specific failure reasons.
14. **Implement demo delivery flow** — sends the prospect the demo link + explanation + payment CTA when DEMO_READY.
15. **Implement payment→production conversion** — on Ziina `completed` webhook, snapshot the approved demo, lock scope in the order record, trigger production build.

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
- SALES_OUTREACH_TEST_MODE must remain true (no live outreach email sends)
- organizationId always comes from server-side session or DB row (never from client)
- Unauthenticated webhooks must never mutate production state
- HIGGSFIELD_WEBHOOK_SECRET absence must cause 401 — never allow fallthrough
- No NEXT_PUBLIC_ prefix on any secret or credential variable
- Do not create duplicate production jobs, orders, or payment records
- Do not modify database records directly
- Do not expose secret values in any output
- Never fabricate business data (services, prices, testimonials, contact details) in demos
- Demo must reach DEMO_READY (all QC gates in Section T pass) before sending to any prospect
- Ziina payment URL https://pay.ziina.com/drexonyx/Md6AyFJ0z?source=app must never be changed

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

## S. MDA Sales Engine

The Sales Engine is a separate overlay on top of the core Drexonyx V1 system. It runs
independently of the video-production pipeline and has its own DB schema, skills, agents,
orchestration layer, and outreach transport.

### S1. Database schema — `sales` (PostgreSQL schema)
**File:** `db/schema/sales.ts`

| Table | Purpose |
|---|---|
| `sales_leads` | One record per business identity. Statuses: NEW → REVIEWING → QUALIFIED → OUTREACH_SENT → REPLIED → FOLLOW_UP → WON / REJECTED / ARCHIVED |
| `lead_sources` | Multiple platform sources per lead. Unique constraint on `(platform, identifier)` prevents duplicates. |
| `outreach_messages` | One row per drafted/sent message. Channels: email, instagram, whatsapp, linkedin, manual. Types: cold_outreach, follow_up, reply, proposal. |
| `follow_ups` | Scheduled follow-up actions (default +3 days after initial outreach). |
| `outreach_approvals` | Human-approval records for PENDING messages. |
| `email_opt_outs` | Email addresses that opted out. Checked before every send. |
| `opt_out_tokens` | One-time unsubscribe tokens embedded in email footers. |

### S2. AI Skills (`lib/skills/sales/`)

| Skill ID | File | Purpose |
|---|---|---|
| `sales.lead.discover` | `lead-discover.ts` | Extract structured lead data from raw text (social profile, web copy, directory listing). One AI call. No DB access. |
| `sales.lead.qualify` | `lead-qualify.ts` | Assess lead quality and channel recommendation. |
| `sales.lead.score` | `lead-score.ts` | Assign numeric score and HOT/WARM/COLD priority. |
| `sales.outreach.draft` | `outreach-draft.ts` | Draft outreach message and classify risk flags. One AI call. No DB access. |
| `sales.strategy.campaign.develop` | `strategy-campaign-develop.ts` | Campaign strategy planning. |

**Approval policy (`lib/sales/queries.ts` → `getApprovalPolicy`):**
- Standard email `cold_outreach` and `follow_up` → `NOT_REQUIRED` (auto-sendable by cron)
- Proposals, pricing offers, discounts, sensitive content, non-email channels → `PENDING` (human must approve)

### S3. Agents (`lib/agents/sales-discovery-specialist.ts`)

Exported functions:
- `delegateLeadDiscovery(params)` — runs discover → qualify → score → outreach draft sub-task chain
- `delegateOutreachDrafting(params)` — drafts and queues a single outreach message
- `delegateFollowUpScheduling(params)` — schedules a follow-up record

Inputs include `sourcePlatform?` and `sourceUrl?` which are passed through to the AI draft skill for platform-aware personalization.

### S4. Outreach sender (`lib/sales/outreach-sender.ts`)

Two exported async functions:
- `sendOutreachEmail(params)` — initial cold outreach / proposal email via Resend
- `sendFollowUpEmail(params)` — follow-up email via Resend

**Hard boundary (DR 0128):** Neither function sends when `SALES_OUTREACH_TEST_MODE=true`. In test mode every send is redirected to `OUTREACH_TEST_RECIPIENT` (`Irenfold@gmail.com`).

**Proposal emails** include a Ziina payment CTA: `https://pay.ziina.com/drexonyx/Md6AyFJ0z?source=app` rendered as "Pay 599 AED Securely". This URL must never be changed without explicit owner approval.

**Opt-out / unsubscribe:**
- Production sends check `email_opt_outs` before dispatch; opted-out addresses → `OPT_OUT` error, no send.
- Each production email includes a unique unsubscribe link (`/api/unsubscribe?token=...`).
- Test-mode sends skip opt-out checks.

### S5. Orchestration writer (`lib/orchestration/sales-writer.ts`)
Writes sales DB records from orchestration step outputs. Called exclusively by STATUS_TRANSITION and VERIFY step handlers in the runner. Never sends email.

### S6. Environment variables (Sales Engine)

| Variable | Purpose | Classification |
|---|---|---|
| `SALES_OUTREACH_TEST_MODE` | `true` = redirect all sends to test recipient, skip opt-out | server-only |
| `RESEND_API_KEY` | Resend transactional email API key | server-only |
| `RESEND_FROM_ADDRESS` | Sender address for outreach emails | server-only |
| `NEXT_PUBLIC_APP_URL` | Base URL used in unsubscribe links | public |
| `GOOGLE_GEMINI_API_KEY` (or equivalent AI key) | AI provider for sales skills | server-only |

### S7. Security boundaries (DR 0128)

- Skills ONLY draft text. They do NOT send any message.
- Sending requires `approval_status = NOT_REQUIRED` or `APPROVED`.
- All proposals, discounts, pricing, and non-email channels require `PENDING` approval.
- PII boundary: `contact_email` / personal phone are NEVER emitted in skill output.
- `SALES_OUTREACH_TEST_MODE` must remain `true` until explicitly authorised for live outreach.
- No social DM, WhatsApp, or non-email outreach is implemented — email only.

---

## T. MDA DEMO PRODUCTION STANDARD

**This section governs the complete demo → payment → production workflow for the MDA AED 599 website offer.**

The demo is the primary sales artifact. Its purpose is to demonstrate, using the prospect's real
business data, that MDA can deliver a professional website worth the AED 599 purchase. Quality must
be high enough that the prospect can confidently approve after reviewing.

This is a commercial workflow involving real customers and real money. Accuracy, transparency, data
integrity, legal/safety compliance, and prevention of misleading claims are non-negotiable.
**Never fabricate information to make a demo look better.**

---

### T1. Prospect Data Collection

Before generating a demo, collect all available public business information:

| Data point | Required | Source |
|---|---|---|
| Business name | Yes | Lead record |
| Business category / industry | Yes | Lead discovery |
| Services / products offered | Yes | Business profile, website, social |
| Location (city, country) | Yes | Lead record |
| Public contact (phone, email) | If available | Publicly listed only |
| Website URL | If available | Lead record |
| Social profiles (Instagram, Facebook, etc.) | If available | Lead sources |
| Public business description / bio | If available | Profile copy |
| Public images / logo | If available | Profile or website (only where use is permitted) |
| Opening hours | If available | Verified source only |
| Calls to action (WhatsApp, call, book) | If available | Verified from profile/site |
| Other relevant public business information | As found | Any verified public source |

**Rule:** Only public, voluntarily published information is used. Never use private, scraped, or
leaked data.

---

### T2. Data Verification

Every factual element appearing in the demo must have a verifiable source. Store the source alongside the data point.

**Never invent or assume:**
- Services or products not confirmed by the business's own published content
- Prices, rates, or packages not publicly stated by the business
- Offers, promotions, or deals
- Testimonials, reviews, or ratings
- Certifications, awards, or credentials
- Exact locations or addresses beyond what is publicly listed
- Contact details (phone, email, WhatsApp) not publicly stated
- Social media account URLs not confirmed in lead sources
- Any business claim not directly attributable to a verified source

**If information cannot be verified:**
- Omit it from the demo entirely, OR
- Clearly treat it as unavailable (e.g., leave a "Contact us for services" placeholder)

Do not use a placeholder that implies real content exists.

---

### T3. Demo Architecture

The AI generating the demo must select the appropriate page structure based on the business
category. There is no universal template. Structure is always business-specific.

**Architecture decision logic:**

| Business type | Likely page sections |
|---|---|
| Restaurant / café | Hero, About, Menu, Gallery, Hours, Location/Map, Reserve/Order CTA, Social, Footer |
| Retail / product shop | Hero, Products, About, Gallery, Contact, Social, Footer |
| Service business (plumber, clinic, salon) | Hero, Services, About, Why Us, Gallery, Contact/Book CTA, Location, Footer |
| Professional / freelancer | Hero, Services, Portfolio/Work, About, Contact, Footer |
| B2B / corporate | Hero, Services, About, Clients/Partners (verified only), Contact, Footer |
| Event / entertainment | Hero, About, Events, Gallery, Tickets/Book CTA, Contact, Footer |

**Allowed sections (include only those relevant to the actual business):**
- Hero with real business name and actual tagline / business description
- Business introduction (from verified public copy)
- Services / products (verified from the business's own listings)
- Why choose this business (honest, based on verified differentiators)
- Gallery (public images where permitted — never stock that misrepresents the business)
- Location / map embed (only if address is publicly verified)
- Contact section (phone/email/WhatsApp only from verified public data)
- Social links (only confirmed accounts from lead sources)
- Footer (business name, city, year)

**Sections to omit when data is unavailable:**
- No pricing section unless prices are publicly confirmed
- No testimonials section unless real public reviews exist
- No certifications / awards unless publicly documented
- No map if address is not publicly available
- No WhatsApp CTA unless the number is publicly listed

---

### T4. Visual Quality Standard

The demo must meet this bar before being shown to any prospect:

- **Professional:** appropriate for a real business website, not a rough prototype
- **Coherent:** consistent colour palette, typography, and spacing throughout
- **Responsive:** works correctly on mobile, tablet, and desktop
- **Visually balanced:** no single section dominates disproportionately; layout proportions match content importance
- **Business-specific:** design choices (palette, imagery style, tone) reflect the actual business category
- **Conversion-oriented:** clear calls to action; the next step for the visitor is always obvious
- **Modern:** current design conventions; no outdated UI patterns
- **Free from template residue:** no generic placeholder text, no "Lorem Ipsum", no "Your Business Name", no "Company Logo Here"

**Imagery:**
- Prefer verified public business imagery (photos from their social profile, website) over stock
- Stock images may be used only when no suitable business imagery is available and when the stock image is accurate (e.g., a food photo for a restaurant that sells that type of food)
- Never use stock imagery that misrepresents the business (wrong product type, wrong location, wrong people)
- AI-generated imagery may be used only with explicit owner approval per individual demo

---

### T5. Responsive QC

Test at three breakpoints before demo release:

| Breakpoint | Target width |
|---|---|
| Mobile | 375px–430px |
| Tablet | 768px–1024px |
| Desktop | 1280px+ |

At each breakpoint check:
- [ ] No horizontal overflow / scrollbar
- [ ] Correct section spacing (no collapsed or doubled gaps)
- [ ] Typography readable and correctly sized
- [ ] Images cropped correctly; no stretching or distortion
- [ ] Navigation usable (hamburger on mobile if applicable)
- [ ] All buttons and CTAs visible and tappable at mobile size
- [ ] Forms usable (input fields not cut off)
- [ ] External links open correctly
- [ ] Layout shifts do not occur on load

**All three breakpoints must pass before the demo proceeds to Functional QC.**

---

### T6. Functional QC

Check every interactive element:

- [ ] All buttons have correct actions (no dead/no-op buttons)
- [ ] All internal anchor links reach the correct section
- [ ] All external links (social, website) open to the correct verified URL
- [ ] Phone `tel:` links dial the correct verified number
- [ ] WhatsApp `wa.me/` links open to the correct verified number
- [ ] Email `mailto:` links use the correct verified address
- [ ] Map embeds / location links point to the correct verified address
- [ ] No broken images (all images load; no 404 alt-text placeholders)
- [ ] No placeholder URLs (`example.com`, `yourwebsite.com`, `#`)
- [ ] No placeholder text (`[PHONE]`, `[EMAIL]`, `YOUR NAME`, `Lorem ipsum`)
- [ ] Contact form (if present) submits correctly or clearly indicates it is a demo

**Any failure = DEMO_BLOCKED. Identify the exact failing element.**

---

### T7. Content QC

Before showing the demo to the prospect, verify each content element:

- [ ] Business name: matches lead record exactly (correct spelling, correct capitalisation)
- [ ] All contact information: matches verified public source
- [ ] All services listed: confirmed from the business's own published content
- [ ] Location: matches verified public address/city
- [ ] Source URLs recorded for every factual claim
- [ ] CTAs: accurate (correct phone, correct WhatsApp number, correct social handle)
- [ ] Pricing (if displayed): matches publicly stated pricing only
- [ ] Spelling: correct in English and/or Arabic as appropriate to the business
- [ ] Language: appropriate to the business's primary market
- [ ] Zero placeholders remaining anywhere in the page
- [ ] Zero unsupported claims (no invented certifications, reviews, stats, or credentials)

**Any failure = DEMO_BLOCKED. Identify the exact failing element.**

---

### T8. Commercial QC

The demo must represent the offer honestly:

- [ ] Demo clearly shows what MDA will build — a static website / landing page
- [ ] Demo does NOT promise features not included in the AED 599 offer
- [ ] Demo does NOT claim the website has been completed — it is explicitly a preview/proposal
- [ ] Demo does NOT imply services have been paid for or delivered when they have not
- [ ] No fabricated results ("your website will get X visitors/month")
- [ ] No fabricated customer reviews or star ratings
- [ ] No fabricated business statistics
- [ ] AED 599 is stated as the price only if a payment CTA is included; never rounded up or altered

**Any failure = DEMO_BLOCKED. Identify the exact failing element.**

---

### T9. Security and Privacy

- [ ] No private information (personal phone numbers, private emails, home addresses, staff names not publicly listed)
- [ ] No information obtained through scraping against platform terms of service
- [ ] No sensitive business information (revenue figures, internal operations, non-public client lists)
- [ ] All images used are from sources where use is appropriate and legally/ethically acceptable (public social profiles, the business's own website, licensed stock, or MDA-generated with approval)
- [ ] Demo URL does not expose any MDA internal identifiers or database IDs to the prospect

**Any failure = DEMO_BLOCKED. Identify the exact issue before proceeding.**

---

### T10. Final Gate — DEMO_READY / DEMO_BLOCKED Decision

A demo **MUST NOT** be sent to the prospect until all required QC gates pass.

**Checklist summary:**

| Gate | Sections | Pass condition |
|---|---|---|
| Data verification | T2 | All facts have verified sources; nothing invented |
| Architecture | T3 | Section set appropriate to business category; no inapplicable sections |
| Visual quality | T4 | Professional, responsive, business-specific, template-free |
| Responsive QC | T5 | All three breakpoints pass all checks |
| Functional QC | T6 | All interactive elements work; no dead links, placeholder URLs, or placeholder text |
| Content QC | T7 | Business name, contact, services, location all verified; spelling correct; no placeholders |
| Commercial QC | T8 | No misleading claims, no undelivered promises, no fabricated content |
| Security / Privacy | T9 | No private or unauthorized information exposed |

**Decision:**
```
IF all 8 gates pass  → DEMO_READY
IF any gate fails    → DEMO_BLOCKED: [exact gate] [exact failing element]
```

When `DEMO_BLOCKED`:
1. Identify the exact reason (gate name + failing element)
2. Fix the issue or omit the unsupported content
3. Re-run the full checklist from the beginning
4. Do not send the demo until the decision reaches DEMO_READY

---

### T11. Client Handoff (Demo Delivery)

When `DEMO_READY`, the prospect receives:

**What to send:**
1. A direct link to the demo (shareable, no login required)
2. A concise explanation of what was prepared:
   - What the demo shows (their business, professionally presented as a static website)
   - What is and is not included in the AED 599 offer
   - That this is a proposal preview — not a completed or deployed website
3. The AED 599 offer stated clearly
4. A clear next step: "If you're happy with this, we can confirm and publish it for AED 599."
5. The Ziina payment CTA: `https://pay.ziina.com/drexonyx/Md6AyFJ0z?source=app` (rendered as "Pay 599 AED Securely") — only after the prospect has seen the demo and expressed intent

**What NOT to send:**
- Do not send a payment link before the prospect has reviewed the demo
- Do not send a payment link if the demo is DEMO_BLOCKED
- Do not promise a delivery timeline unless one has been approved
- Do not include scope items not in the AED 599 package

---

### T12. Payment → Production Conversion

After confirmed payment (Ziina webhook `status = completed`):

1. **Preserve the approved demo:** snapshot the approved demo version before any edits. Record the approved scope (sections, content, images) in the order record.
2. **Convert to production:** begin production build from the approved demo exactly as reviewed by the client.
3. **Scope lock:** the approved demo defines the delivery scope. No features, sections, or content changes may be added without explicit client approval and (if priced separately) a new payment.
4. **Production QC:** run the complete QC checklist (T5–T9) again on the production build before final delivery. The production version must pass all gates.
5. **Final delivery:** deliver the production website (files or published URL) to the client. Record delivery in the `production.deliveries` table.
6. **Audit trail:** every step — demo approval, payment received, production started, QC passed, delivery made — is logged in `system.audit_events`.

**Accidental scope expansion prevention:**
- Never add sections not in the approved demo without written client approval
- Never change contact information, prices, or services without re-verifying against the client's confirmed data
- If the client requests a change after payment, confirm in writing before implementing

---

### T13. Continuity Requirement

This entire workflow (T1–T12) is documented in this Master File so that any AI session, engineer, or
team member can continue the project without guessing. When a new session starts, read this file before
doing any demo-related work. The workflow is authoritative; do not deviate from it without owner approval.

---

*End of DREXONYX_MASTER_HANDOFF.md*
