# MDA SINGLE SESSION MASTER GUIDE
**Project:** DREXONYX / MDA — drexonyx-v1  
**Purpose:** Everything a new Claude Code session needs to understand and continue work on this project.  
**Last Updated:** 2026-10-30 (Reconciliation Audit — Session 2)  
**Authoritative Version:** This file + `MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md` + `ARCHITECTURE.md` + `CLAUDE.md`

---

## 1. PROJECT STRUCTURE

### Repositories
- **GitHub:** `drexonyx/drexonyx-v1` (private)
- **Dev Branch:** `ccr-3a71ba38-pwua60` (current active session branch)
- **Production Branch:** `main`
- **Latest Main Branch Commit:** `210ff06` (PR #49 — chatbot fixes)  
**Current Production Deployment:** `1588e5e` — PR #49 NOT YET LIVE (ISS-016 — requires explicit owner approval to deploy)

### Hosting
- **Platform:** Vercel (free tier — 100 deployments/day limit)
- **Domain:** drexonyx.com
- **Project Name:** drexonyx-v1

### Directory Layout
```
drexonyx-v1/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── chatbot/route.ts      # Chatbot API (Edge Runtime)
│   │   ├── admin/                # Admin login/logout
│   │   ├── internal/             # Cron jobs (CRON_SECRET required)
│   │   ├── orchestration/        # Agent task management
│   │   ├── webhooks/             # Stripe, WhatsApp, Higgsfield
│   │   └── auth/[...nextauth]/   # NextAuth v5
│   ├── chat/[slug]/              # Chatbot client pages (dynamic)
│   ├── mda/                      # MDA service page
│   ├── admin/                    # Admin panel UI
│   └── portal/                   # Client portal UI
├── db/
│   ├── index.ts                  # DB connection (Neon/Postgres via Drizzle)
│   └── schema/                   # 8 schemas: core, identity, commercial,
│                                 #   production, financial, system,
│                                 #   orchestration, sales
├── lib/
│   ├── catalog/mda-services.ts   # APPROVED service catalog with prices
│   ├── chatbot/clients.ts        # Chatbot client registry
│   ├── email/                    # Resend email templates
│   ├── infrastructure/
│   │   └── object-storage.ts     # Cloudflare R2 (S3-compatible)
│   ├── orchestration/            # Full AI agent orchestration engine
│   ├── skills/                   # 30+ skill modules (facebook, sales, qc, etc.)
│   └── admin/                    # Admin session/auth utilities
├── master-digital-agency/        # Business documents
│   ├── business-development/
│   │   ├── MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md  ← READ THIS FIRST
│   │   └── MDA_COMPANY_PROFILE_PRODUCTION_STANDARD.md
│   ├── AGENCY.md
│   ├── MDA_MASTER_ISSUES_REGISTER.md   ← issue tracking
│   └── MDA_SINGLE_SESSION_MASTER_GUIDE.md  ← this file
├── public/
│   └── promo.html               # Promotional landing page
├── vercel.json                   # Cron job schedule
└── .env.example                  # Complete env var reference (no secrets)
```

---

## 2. BRAND IDENTITY (READ-ONLY)

### DREXONYX
- Master/Group brand
- Parent company for all sub-brands
- Website: drexonyx.com

### MDA — Master Digital Agency
- Flagship commercial brand under DREXONYX
- Based in Dubai, UAE
- Contact: info@drexonyx.com
- **DO NOT change brand identity, logos, colors, or names**

---

## 3. APPROVED SERVICE CATALOG AND PRICES
*Source: `lib/catalog/mda-services.ts` + `MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md`*  
*Evidence: CONFIRMED—USER (owner-approved, 2026-10-21)*

### Website Design
| Tier | Price (AED) |
|---|---|
| Starter (5 pages, 7-day delivery) | 599 |
| Professional | 899 |
| Premium | 1,899 |

### Branding & Logos
| Service | Price (AED) |
|---|---|
| Basic logo | 99 |
| Logo + colors & fonts | 249 |
| Brand identity (logo + guide) | 349 |

### Company Profile Design (design only — client provides text & images)
| Pages | Price (AED) |
|---|---|
| 4 pages | 60 |
| 8 pages | 160 |
| 12 pages | 249 |

### Graphic Design
| Service | Price (AED) |
|---|---|
| Poster or flyer | 49 |
| Simple brochure | 99 |
| Product catalog (10 pages) | 249 |

### Social Media Management (monthly)
| Package | Price (AED) |
|---|---|
| 1 platform | 549 |
| 2 platforms | 899 |

### Ad Campaigns (MDA fee only — ad spend paid by client to platform)
| Service | Price (AED) |
|---|---|
| Campaign setup | 149 per campaign |
| Campaign management | 299/month |

### Research Services (CONFIRMED—USER, 2026-10-21)
| Service | Price (AED) |
|---|---|
| Product Research | 99 |
| Market Research | 199 |

### Digital Launch Package
- Starting from AED 699

### CHATBOT SUBSCRIPTION (OWNER-CONFIRMED — 2026-10-30)
| Tier | Price (AED) | Status |
|---|---|---|
| Basic | 299/month | **OWNER-CONFIRMED** |
| Advanced | 499/month | In code — UNCONFIRMED (no explicit owner approval) |
| Professional | 799/month | In code — UNCONFIRMED (no explicit owner approval) |

**⚠️ WITHDRAWN:** AED 650 = SUPERSEDED/WITHDRAWN. DO NOT use.  
**PENDING:** Owner to confirm whether 499/799 tiers are approved or if service is single-tier at 299 AED/month only.

---

## 4. ACTIVE CHATBOT CLIENTS

| Client ID | URL | Purpose | Status |
|---|---|---|---|
| `mda` | /chat/mda | MDA Business Assistant (premium dark theme, WA integration) | ✅ WORKING |
| `demo` | /chat/demo | DREXONYX Bot demo | ✅ WORKING |
| `try` | /chat/try | Try Live — promotional demo for prospects | ⚠️ Netflix logo issue (ISS-002) |
| `template-restaurant` | /chat/template-restaurant | Restaurant template | ✅ (template) |
| `template-shop` | /chat/template-shop | Retail shop template | ✅ (template) |
| `template-salon` | /chat/template-salon | Salon/spa template | ✅ (template) |

### Chatbot Technical Details
- **API Route:** `app/api/chatbot/route.ts`
- **Runtime:** Edge (Vercel Edge Functions)
- **AI Provider:** Google Gemini
- **Models:** `['gemini-3.5-flash-lite', 'gemini-2.0-flash']` ← ISS-001: `gemini-3.5-flash-lite` is invalid; falls back to `gemini-2.0-flash` on every request
- **Fallback:** 404 → switch to next model
- **Max History:** 8 messages (last 8 kept)
- **History Rule:** Must start with `role: 'user'` (fixed in PR #49)
- **Markdown:** Custom parseMarkdown() for **bold** / *italic* (added in PR #49)
- **RTL/LTR:** `dir="auto"` per bubble (added in PR #49)
- **Languages:** Arabic and English (auto-detect per system prompt)

---

## 5. INFRASTRUCTURE STATUS

### 5.1 Database — Neon PostgreSQL
| Item | Status |
|---|---|
| Connection string | `DATABASE_URL` — VERIFIED SET in Vercel (sensitive) |
| Schemas | 8: core, identity, commercial, production, financial, system, orchestration, sales |
| ORM | Drizzle ORM with postgres-js driver |
| Config | `prepare: false` (PgBouncer compatible) |
| Migration 0026 | CONFIRMED—APPLIED (email_optouts, opt-out system live) |
| Schema verification | UNVERIFIED — Neon MCP requires OAuth (ISS-018) |

### 5.2 Email — Resend
| Item | Status |
|---|---|
| API Key | `RESEND_API_KEY` — VERIFIED SET in Vercel (sensitive) |
| From Address | `RESEND_FROM_ADDRESS` — VERIFIED SET in Vercel (sensitive) |
| Admin Notifications | `ADMIN_NOTIFICATION_EMAIL` (defaults to drexonyx.studio@gmail.com) |
| Orchestration Alerts | `ORCHESTRATION_ALERT_EMAIL` env var |
| Domain verification | UNVERIFIED (Resend dashboard access required) |
| Safety Gate | `SALES_OUTREACH_TEST_MODE` = "false" — **LIVE MODE** (intentional, activated 2026-10-07). Real sends require explicit owner approval each time — LIVE MODE is not standing permission for Claude to initiate sends. |

### 5.3 Cloudflare R2 (Object Storage)
| Item | Status |
|---|---|
| Account ID | `R2_ACCOUNT_ID` — VERIFIED SET in Vercel (sensitive) |
| Access Key | `R2_ACCESS_KEY_ID` — VERIFIED SET in Vercel (sensitive) |
| Secret Key | `R2_SECRET_ACCESS_KEY` — VERIFIED SET in Vercel (sensitive) |
| Bucket Name | `R2_BUCKET_NAME` — VERIFIED SET in Vercel (sensitive) |
| Endpoint | Optional `R2_ENDPOINT` (auto-derived from account ID) |
| Connectivity | UNVERIFIED (bucket existence not confirmed without live test) |
| Note | GitHub Actions FB publishing does NOT use R2 (uses repo files) |

### 5.4 Vercel (Hosting)
| Item | Status |
|---|---|
| Plan | Free tier |
| Deployment Limit | 100/day (hit Oct 29, 2026; resets daily) |
| Cron Jobs | 6 active (see section 6) |
| Admin Routes | ANOMALY: `ENABLE_ADMIN_ROUTES=true` on main public project (ISS-019) |
| Production SHA | `1588e5e` — PR #49 (`210ff06`) NOT yet deployed (ISS-016) |

### 5.5 Google Gemini (AI)
| Item | Status |
|---|---|
| API Key | `GEMINI_API_KEY` — CONFIRMED SET |
| Chatbot | WORKING ✅ (falling back to gemini-2.0-flash due to ISS-001) |
| Primary model | `gemini-3.5-flash-lite` — INVALID name (ISS-001) |
| Fallback model | `gemini-2.0-flash` — WORKING |
| Skills AI | `SKILLS_AI_MODEL` env var (defaults to gemini-2.5-flash) |

### 5.6 Facebook Publishing (TWO SYSTEMS)
| System | Credentials | Status |
|---|---|---|
| GitHub Actions (fb-publish.yml, fb-schedule.yml) | GitHub Secrets: `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID_1` | UNKNOWN (GitHub Secrets not readable from this session) |
| Vercel Skill (lib/skills/facebook/page-publish.ts) | Vercel: `META_PAGE_ACCESS_TOKEN` SET, `META_PAGE_ID_1` SET, `META_PAGE_ID_2` **MISSING** | PARTIAL |
| R2 (for Vercel Skill IMAGE/VIDEO) | All R2 vars SET | PARTIAL (connectivity unverified) |

### 5.7 Authentication
| Item | Status |
|---|---|
| NextAuth v5 | `AUTH_SECRET` SET, `AUTH_URL` SET |
| Admin Login | `ADMIN_LOGIN_PASSWORD_HASH` SET (sensitive) |
| Admin Session | HMAC-SHA256 cookie |
| `DREXONYX_ORG_ID` | SET (sensitive) |
| ANOMALY | `ENABLE_ADMIN_ROUTES=true` on main public project — see ISS-019 |

### 5.8 Payments (Stripe + Ziina)
| Item | Status |
|---|---|
| Stripe | `STRIPE_SECRET_KEY` SET, `STRIPE_WEBHOOK_SECRET` SET |
| Ziina | `ZIINA_API_KEY` SET; `ZIINA_BASE_URL` + `ZIINA_TEST_MODE` — NOT FOUND in Vercel |
| Status | PARTIAL (ISS-014) |

### 5.9 Higgsfield AI
| Item | Status |
|---|---|
| API Key | `HIGGSFIELD_API_KEY` — VERIFIED SET (sensitive) |
| Base URL | `HIGGSFIELD_API_BASE_URL` — VERIFIED SET (sensitive) |
| Webhook URL | NOT FOUND in Vercel — inbound callbacks will not work |
| Webhook Secret | NOT FOUND in Vercel |
| Status | PARTIAL (ISS-013) |

---

## 6. CRON JOBS (vercel.json)

All times UTC. Need `CRON_SECRET` set in Vercel as Bearer token.

| Path | Schedule (UTC) | Dubai Time | Purpose |
|---|---|---|---|
| /api/internal/poll-generations | 0 0 * * * | 04:00 | Poll Higgsfield AI job status |
| /api/internal/sales-discovery | 0 6 * * * | 10:00 | Advance DISCOVER_SALES_LEAD tasks (batch 20) |
| /api/internal/sales-daily-report | 0 7 * * * | 11:00 | Send daily sales report |
| /api/internal/sales-followups | 0 8 * * * | 12:00 | Process follow-up email tasks |
| /api/internal/sales-outreach-send | 0 9 * * * | 13:00 | Send outreach emails |
| /api/internal/sales-reply-poll | 0 12 * * * | 16:00 | Poll for email replies |

**⚠️ SAFETY:** All sales crons MUST have `SALES_OUTREACH_TEST_MODE=true` in production until owner authorizes live mode.

---

## 7. ENVIRONMENT VARIABLES STATUS (Verified 2026-10-30)

### CONFIRMED SET in Vercel Production
- [x] `GEMINI_API_KEY` — chatbot working
- [x] `DATABASE_URL` — SET (sensitive)
- [x] `RESEND_API_KEY` — SET (sensitive)
- [x] `RESEND_FROM_ADDRESS` — SET (sensitive)
- [x] `R2_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_BUCKET_NAME` — ALL SET (sensitive)
- [x] `META_PAGE_ACCESS_TOKEN` + `META_PAGE_ID_1` — SET (sensitive)
- [x] `HIGGSFIELD_API_KEY` + `HIGGSFIELD_API_BASE_URL` — SET (sensitive)
- [x] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — SET (sensitive)
- [x] `ZIINA_API_KEY` — SET (sensitive)
- [x] `ADMIN_LOGIN_PASSWORD_HASH` + `DREXONYX_ORG_ID` — SET (sensitive)
- [x] `AUTH_SECRET` + `AUTH_URL` — SET
- [x] `ENABLE_ADMIN_ROUTES` = "true" — SET (anomaly — ISS-019)
- [x] `CRON_SECRET` — SET (sensitive)
- [x] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — SET (sensitive)
- [x] `SALES_OUTREACH_TEST_MODE` = "false" — **LIVE MODE** (intentional)
- [x] `ANTHROPIC_API_KEY` — SET (undocumented — ISS-021)

### PARTIAL / MISSING
- [ ] `META_PAGE_ID_2` — NOT FOUND (ISS-020)
- [ ] `HIGGSFIELD_WEBHOOK_URL` + `HIGGSFIELD_WEBHOOK_SECRET` — NOT FOUND
- [ ] `ZIINA_BASE_URL` + `ZIINA_TEST_MODE` — NOT FOUND
- [ ] `WHATSAPP_APP_SECRET` + `WHATSAPP_PHONE_NUMBER_ID` — NOT FOUND

---

## 8. RECENT COMMITS (CONTEXT)

```
210ff06  fix(chatbot): history role order, markdown rendering, auto text direction (#49)
1588e5e  feat(chatbot): language fix, Try Live, model fallback, logo fix
68e0697  perf(chat): switch chatbot API to Edge Runtime
4104e92  fix(deps): regenerate lock file in sync with npm ci
1e9ae9d  fix(deps): upgrade next to 16.4.3, fix zod audit vulnerability
42c8f6b  fix(lint): fix 3 ESLint errors blocking CI and production deploy
6347658  chore(chat): add client registry comment to trigger production build
a21febc  feat(chat): MDA chatbot — premium dark design
```

---

## 9. OPEN ISSUES SUMMARY (Updated 2026-10-30)

See `MDA_MASTER_ISSUES_REGISTER.md` for full details. Priority order:

1. **ISS-019** (HIGH) — ENABLE_ADMIN_ROUTES=true on main public project (security anomaly — needs owner decision)
2. **ISS-002** (HIGH) — Replace Netflix logo in /chat/try background
3. **ISS-003** (MEDIUM) — 299 AED/month CONFIRMED; owner to confirm 499/799 tiers or declare single-tier
4. **ISS-016** (MEDIUM) — Deploy PR #49 to production (currently at 1588e5e, not 210ff06) — **requires owner decision**
5. **ISS-001** (MEDIUM) — Fix chatbot primary model name (gemini-3.5-flash-lite is invalid)
6. **ISS-004** (MEDIUM) — Update promo.html/promo-en.html CTA to link to /chat/try
7. **ISS-005** (MEDIUM) — Embed MDA bot widget on /mda page
8. **ISS-020** (MEDIUM) — Add META_PAGE_ID_2 to Vercel for second-page FB publishing
9. **ISS-011** (MEDIUM) — Confirm admin panel architecture (tied to ISS-019)
10. **ISS-008** (MEDIUM) — Verify GitHub Actions Facebook secrets separately
11. **ISS-013** (LOW) — Add Higgsfield webhook vars when video production begins
12. **ISS-014** (LOW) — Confirm Ziina test mode before accepting payments
13. **ISS-021** (LOW) — Document ANTHROPIC_API_KEY purpose in .env.example

**RESOLVED since last session:**
- ISS-010: Was "CRITICAL UNVERIFIED" — RESOLVED: LIVE MODE is deliberate (activated 2026-10-07)
- ISS-009: Was "UNVERIFIED" — RESOLVED: Resend vars SET
- ISS-007: Was "NOT CONFIGURED" — RESOLVED: R2 vars SET
- ISS-012: Was "may not be applied" — RESOLVED: Migration APPLIED
- ISS-018: Was "UNVERIFIED" — RESOLVED: DATABASE_URL SET

---

## 10. OPERATING RULES (ACTIVE IN ALL SESSIONS)

### Security Constraints (ABSOLUTE — never override)
- لا ترسل أي رسالة لأي عميل (No client messages)
- لا تقدم أي عرض (No offers)
- لا تنفذ أي إجراء مالي (No financial actions)
- لا ترسل DM أو Email أو WhatsApp (No outreach of any kind)
- لا تستخدم بيانات خاصة أو مسربة
- ممنوع إرسال أي رسالة أو التواصل مع أي Lead
- لا تنشئ أو تعدل أي Gig بدون موافقة
- لا تغير أي credentials أو account settings
- لا تعدل DREXONYX Architecture
- Do NOT create new MDA agents or skills without approval
- Do NOT modify existing workflows without approval
- لا تلمس: Sales, Outreach, Resend, Cron, Database, Environment Variables without explicit permission
- Do NOT schedule triggers/check-ins without explicit user request

### Code Rules (from CLAUDE.md)
- Read `node_modules/next/dist/docs/` before writing any Next.js code
- Apply evidence labels to all business claims (CONFIRMED—USER / UNVERIFIED / etc.)
- AED 650 = SUPERSEDED/WITHDRAWN — never recommend
- All competitor pricing = UNVERIFIED
- Never invent requirements, API capabilities, pricing, or project scope
- Do not silently expand scope

### Business Rules (from AGENCY.md)
- Human Approval Gates required before: spending money, publishing high-risk material, irreversible actions
- First-Revenue Principle: $50 → $100 → $250 → $500 → $1K → $5K → $10K
- Approved domains: websites, branding, video, social strategy, market research
- Excluded: paid ads, WhatsApp API, AI calling, SMS, paid CRM without approval

---

## 11. HOW TO START A NEW SESSION

1. **Read this file** (`MDA_SINGLE_SESSION_MASTER_GUIDE.md`)
2. **Read** `MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md` (business rules + pricing)
3. **Check** `MDA_MASTER_ISSUES_REGISTER.md` for open issues
4. **Read** `CLAUDE.md` (technical operating rules)
5. **Read** `ARCHITECTURE.md` (system boundaries)
6. **Check git log** for recent commits: `git log --oneline -10`
7. **Check branch**: `git status && git branch`

**Before any modification:** get explicit owner approval. Start with inventory/analysis/documentation only.

---

## 12. UPDATE PROCEDURE

When an issue is resolved:
1. Update `MDA_MASTER_ISSUES_REGISTER.md` — change Status, add Test Result
2. Update `MDA_SINGLE_SESSION_MASTER_GUIDE.md` — update Infrastructure Status or Issues sections
3. Commit both files along with the code change
4. Note: updates to these documents require the same level of owner approval as code changes

---

*Document created: 2026-10-30. Read-only inventory — no code changes made.*
