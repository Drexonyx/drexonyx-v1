# MDA SINGLE SESSION MASTER GUIDE
**Project:** DREXONYX / MDA — drexonyx-v1  
**Purpose:** Everything a new Claude Code session needs to understand and continue work on this project.  
**Last Updated:** 2026-10-30  
**Authoritative Version:** This file + `MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md` + `ARCHITECTURE.md` + `CLAUDE.md`

---

## 1. PROJECT STRUCTURE

### Repositories
- **GitHub:** `drexonyx/drexonyx-v1` (private)
- **Dev Branch:** `ccr-3a71ba38-pwua60` (current active session branch)
- **Production Branch:** `main`
- **Latest Production Commit:** `210ff06` (PR #49 — chatbot fixes)

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

### CHATBOT SUBSCRIPTION (⚠️ PRICING PENDING OWNER CONFIRMATION — SEE ISS-003)
| Code Value | Status |
|---|---|
| Basic: AED 299/month | In code — NEEDS OWNER CONFIRMATION |
| Advanced: AED 499/month | In code — NEEDS OWNER CONFIRMATION |
| Professional: AED 799/month | In code — NEEDS OWNER CONFIRMATION |

**⚠️ WITHDRAWN:** AED 650 = SUPERSEDED/WITHDRAWN. DO NOT use.

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
- **Models:** `['gemini-3.5-flash-lite', 'gemini-2.0-flash']` ← PRIMARY MODEL IS WRONG (ISS-001)
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
| Connection string | `DATABASE_URL` env var (lazy init, fails closed if missing) |
| Schemas | 8: core, identity, commercial, production, financial, system, orchestration, sales |
| ORM | Drizzle ORM with postgres-js driver |
| Config | `prepare: false` (PgBouncer compatible) |
| Verification | UNVERIFIED — Neon MCP requires OAuth (ISS-018) |
| Migration | 0026_email_optouts may not be applied (ISS-012) |

### 5.2 Email — Resend
| Item | Status |
|---|---|
| API Key | `RESEND_API_KEY` env var |
| From Address | `RESEND_FROM_ADDRESS` env var |
| Admin Notifications | `ADMIN_NOTIFICATION_EMAIL` (defaults to drexonyx.studio@gmail.com) |
| Orchestration Alerts | `ORCHESTRATION_ALERT_EMAIL` env var |
| Verification | UNVERIFIED (ISS-009) |
| Safety Gate | `SALES_OUTREACH_TEST_MODE` — MUST be "true" (ISS-010 — CRITICAL) |

### 5.3 Cloudflare R2 (Object Storage)
| Item | Status |
|---|---|
| Account ID | `R2_ACCOUNT_ID` env var |
| Access Key | `R2_ACCESS_KEY_ID` env var |
| Secret Key | `R2_SECRET_ACCESS_KEY` env var |
| Bucket Name | `R2_BUCKET_NAME` env var |
| Endpoint | Optional `R2_ENDPOINT` (auto-derived from account ID) |
| Status | NOT CONFIGURED (ISS-007) |
| Impact | Blocks: Facebook IMAGE/VIDEO publishing, asset management |

### 5.4 Vercel (Hosting)
| Item | Status |
|---|---|
| Plan | Free tier |
| Deployment Limit | 100/day (hit Oct 29, 2026) |
| Cron Jobs | 6 active (see section 6) |
| Admin Routes | Separate deployment required (ENABLE_ADMIN_ROUTES=true) |

### 5.5 Google Gemini (AI)
| Item | Status |
|---|---|
| API Key | `GEMINI_API_KEY` — CONFIRMED SET |
| Chatbot | WORKING ✅ |
| Skills AI | `SKILLS_AI_MODEL` env var (defaults to gemini-2.5-flash) |

### 5.6 Facebook Graph API
| Item | Status |
|---|---|
| Access Token | `META_PAGE_ACCESS_TOKEN` — NOT SET (ISS-008) |
| Page ID 1 | `META_PAGE_ID_1` — NOT SET |
| Page ID 2 | `META_PAGE_ID_2` — NOT SET |
| Status | COMPLETELY BLOCKED |

### 5.7 Authentication
| Item | Status |
|---|---|
| NextAuth v5 | `AUTH_SECRET`, `AUTH_URL` env vars |
| Admin Login | Custom bcrypt: `ADMIN_LOGIN_PASSWORD_HASH` + DB lookup |
| Admin Session | HMAC-SHA256 cookie (`ADMIN_SESSION_SECRET` or falls back to `AUTH_SECRET`) |
| Status | UNVERIFIED (ISS-011) |

### 5.8 Payments (Stripe + Ziina)
| Item | Status |
|---|---|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — UNVERIFIED |
| Ziina | `ZIINA_API_KEY`, `ZIINA_BASE_URL`, `ZIINA_TEST_MODE` — UNVERIFIED |
| Status | DEFERRED (ISS-014) |

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

## 7. ENVIRONMENT VARIABLES CHECKLIST

### CONFIRMED WORKING
- [x] `GEMINI_API_KEY` — chatbot working

### MUST VERIFY (check in Vercel dashboard)
- [ ] `DATABASE_URL` — Neon connection string
- [ ] `SALES_OUTREACH_TEST_MODE` — CRITICAL: must be "true"
- [ ] `CRON_SECRET` — cron auth
- [ ] `DREXONYX_ORG_ID` — production org UUID
- [ ] `AUTH_SECRET` — NextAuth
- [ ] `RESEND_API_KEY` — email
- [ ] `RESEND_FROM_ADDRESS` — email sender

### NOT SET (need to configure when ready)
- [ ] `META_PAGE_ACCESS_TOKEN` + `META_PAGE_ID_1` + `META_PAGE_ID_2` — Facebook
- [ ] `R2_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_BUCKET_NAME` — R2
- [ ] `HIGGSFIELD_API_KEY` + related — Higgsfield
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — Stripe
- [ ] `ZIINA_API_KEY` + related — Ziina
- [ ] `WHATSAPP_*` — WhatsApp
- [ ] `ADMIN_LOGIN_PASSWORD_HASH` — Admin

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

## 9. OPEN ISSUES SUMMARY

See `MDA_MASTER_ISSUES_REGISTER.md` for full details. Priority order:

1. **ISS-010** (CRITICAL) — Verify SALES_OUTREACH_TEST_MODE=true in Vercel before crons fire
2. **ISS-002** (HIGH) — Replace Netflix logo in /chat/try background
3. **ISS-001** (MEDIUM) — Fix chatbot primary model name
4. **ISS-004** (MEDIUM) — Update promo.html CTA to link to /chat/try
5. **ISS-005** (MEDIUM) — Embed MDA bot widget on /mda page
6. **ISS-016** (MEDIUM) — Verify PR #49 production deployment is live
7. **ISS-018** (MEDIUM) — Verify Neon DB connection and schema state
8. **ISS-009** (MEDIUM) — Verify Resend email configuration
9. **ISS-007** (HIGH, deferred) — Configure R2 when Facebook publishing needed
10. **ISS-008** (HIGH, deferred) — Configure Meta credentials when publishing needed

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
