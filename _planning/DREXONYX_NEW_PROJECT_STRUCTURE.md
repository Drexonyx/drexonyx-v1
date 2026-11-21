# DREXONYX — New Project Structure

**Document version:** 3.0 (revised 2026-11-21)  
**Previous version:** 1.0 (MDA-agency product framing)  
**Prepared by:** Claude Code  
**Status:** DRAFT — AWAITING CEO REVIEW AND APPROVAL  
**Authority:** Derives from DREXONYX_MASTER_BLUEPRINT.md v2.0

---

## 1. Repository Identity

| Field | Proposed Value |
|---|---|
| Repository name | `drexonyx-platform` |
| GitHub organization | `drexonyx` |
| Primary domain | `drexonyx.com` (existing, Vercel) |
| Deployment target | Vercel (existing account) |
| Node version | `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` |
| Framework | Next.js 16+ (App Router, TypeScript) |

---

## 1a. Absolute Fresh Start

This repository is built from scratch. Zero V1 code is imported. The structure below is designed for the new platform as an AI-Native Technology Company operating system — not for the MDA digital agency model. See DREXONYX_MASTER_BLUEPRINT.md for the company scope (10 business areas, 4 initial software products).

---

## 2. Top-Level Directory Layout

```
drexonyx-platform/
│
│   # Configuration & Tooling
├── .github/
│   ├── workflows/
│   │   ├── ci.yml               # lint + typecheck + test + build
│   │   └── migrate.yml          # manual DB migration (MIGRATE confirmation)
│   └── dependabot.yml
│
├── .env.example                 # All env var names. No values. Committed.
├── .gitignore
├── .npmrc                       # engine-strict=true
├── .nvmrc                       # Node version pin
│
│   # Next.js Core
├── app/
│   ├── (auth)/
│   │   └── login/               # Login page
│   ├── (platform)/              # All authenticated routes
│   │   ├── layout.tsx           # Platform shell (nav, sidebar)
│   │   ├── command/             # CEO Command Center
│   │   ├── agents/              # AI Agent Workforce
│   │   ├── company/             # Company Management
│   │   ├── knowledge/           # Knowledge Base
│   │   ├── products/            # Product Portfolio
│   │   ├── devops/              # Dev Operations
│   │   ├── sales/               # Sales & Acquisition
│   │   ├── marketing/           # Marketing Operations
│   │   ├── finance/             # Finance & Reporting
│   │   ├── tasks/               # Task Management
│   │   └── security/            # Approvals & Security
│   ├── api/
│   │   ├── auth/                # NextAuth handlers
│   │   ├── command/             # Command Center APIs
│   │   ├── agents/              # Agent dispatch & status
│   │   ├── knowledge/           # Knowledge Base APIs
│   │   ├── sales/               # Sales APIs
│   │   ├── marketing/           # Marketing APIs
│   │   ├── finance/             # Finance APIs
│   │   ├── tasks/               # Task APIs
│   │   ├── security/            # Approval APIs
│   │   ├── webhooks/            # External webhooks (Ziina, Higgsfield, etc.)
│   │   └── internal/            # Cron / internal scheduled jobs
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Redirect to /command (authenticated) or /login
│   └── globals.css
│
│   # Domain Logic (framework-agnostic TypeScript)
├── domain/
│   ├── command/                 # CEO Command Center business rules
│   ├── agents/                  # Agent definitions, dispatch, approval policies
│   │   ├── definitions/         # Individual agent modules
│   │   ├── executor.ts          # Agent task execution engine
│   │   └── approval.ts          # Approval policy engine
│   ├── knowledge/               # Knowledge Base rules
│   ├── products/                # Product catalog, demo, pricing rules
│   ├── sales/                   # Lead funnel, outreach, opt-out rules
│   │   ├── skills/              # AI skills: discover, qualify, score, outreach
│   │   ├── pipeline.ts          # Lead state machine
│   │   └── outreach.ts          # Outreach approval and dispatch
│   ├── marketing/               # Campaign and content rules
│   ├── finance/                 # Revenue tracking, expense rules
│   ├── tasks/                   # Task state machine, workflow engine
│   └── security/                # Approval gate rules, audit policy
│
│   # Service Interfaces (abstractions — no implementations here)
├── services/
│   ├── ai.ts                    # IAIProvider interface
│   ├── email.ts                 # IEmailService interface
│   ├── storage.ts               # IStorageService interface
│   ├── payment.ts               # IPaymentService interface
│   └── notifications.ts        # INotificationService interface
│
│   # Infrastructure (concrete implementations)
├── infrastructure/
│   ├── ai/
│   │   ├── anthropic.ts         # Anthropic Claude provider
│   │   └── gemini.ts            # Google Gemini fallback
│   ├── email/
│   │   └── resend.ts            # Resend implementation
│   ├── storage/
│   │   └── cloudflare-r2.ts     # R2 implementation
│   ├── payment/
│   │   └── ziina.ts             # Ziina implementation (AED)
│   └── github/
│       └── client.ts            # GitHub API client (for DevOps module)
│
│   # Database
├── db/
│   ├── schema/
│   │   ├── identity.ts          # users, sessions
│   │   ├── command.ts           # kpis, alerts, briefs
│   │   ├── knowledge.ts         # articles, documents, research
│   │   ├── products.ts          # software catalog, versions, licenses, customers, demos
│   │   ├── sales.ts             # leads, outreach, proposals
│   │   ├── marketing.ts         # campaigns, content, publishing
│   │   ├── finance.ts           # invoices, payments, expenses
│   │   ├── tasks.ts             # tasks, workflows
│   │   ├── agents.ts            # agent registry, tasks, outputs
│   │   └── system.ts            # audit_events, idempotency_keys, settings
│   ├── migrations/              # Drizzle migration files
│   └── index.ts                 # DB connection (Neon + Drizzle)
│
│   # Shared Components
├── components/
│   ├── ui/                      # Base UI components (buttons, inputs, cards)
│   ├── platform/                # Platform shell components (nav, sidebar)
│   ├── command/                 # Command Center components
│   ├── agents/                  # Agent Workforce components
│   ├── knowledge/               # Knowledge Base components
│   ├── sales/                   # Sales components
│   └── shared/                  # Cross-module shared components
│
│   # Shared Utilities
├── lib/
│   ├── auth/                    # NextAuth config, session utilities
│   ├── utils/                   # General TypeScript utilities
│   ├── constants.ts             # Platform-wide constants
│   └── types.ts                 # Shared TypeScript types
│
│   # Public Assets
├── public/
│   ├── brand/                   # Logo, favicons, brand assets
│   └── images/                  # Static images
│
│   # Knowledge Base Content (static files for initial seed)
├── knowledge-seed/
│   ├── products/                # DREXONYX software product specs; MDA service catalog (if MDA continues)
│   ├── processes/               # SOPs, production standards (from V1 reference material)
│   ├── decisions/               # Architecture decisions (new series, starts at #0001)
│   └── research/                # Referenced research (manually curated from V1 reference only)
│
│   # Governance Documents
├── ARCHITECTURE.md              # Platform architecture + security rules
├── CLAUDE.md                    # Claude Code operating rules
├── README.md
│
│   # Next.js / Config
├── auth.ts                      # NextAuth v5 config
├── auth.config.ts
├── middleware.ts                # Route protection
├── next.config.ts
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── eslint.config.mjs
└── vitest.config.mts
```

---

## 3. Module-to-Route Mapping

| Module | URL prefix | Main pages |
|---|---|---|
| CEO Command Center | `/command` | `/command` (dashboard), `/command/brief`, `/command/alerts` |
| AI Agents | `/agents` | `/agents` (registry), `/agents/tasks`, `/agents/outputs` |
| Company Management | `/company` | `/company`, `/company/team`, `/company/documents`, `/company/brand` |
| Knowledge Base | `/knowledge` | `/knowledge` (search), `/knowledge/articles`, `/knowledge/research`, `/knowledge/decisions` |
| Product Portfolio | `/products` | `/products` (catalog), `/products/demos`, `/products/standards` |
| Dev Operations | `/devops` | `/devops` (projects), `/devops/deployments`, `/devops/debt` |
| Sales | `/sales` | `/sales` (pipeline), `/sales/leads`, `/sales/outreach`, `/sales/proposals` |
| Marketing | `/marketing` | `/marketing` (calendar), `/marketing/assets`, `/marketing/campaigns` |
| Finance | `/finance` | `/finance` (summary), `/finance/invoices`, `/finance/expenses` |
| Tasks | `/tasks` | `/tasks` (board), `/tasks/workflows`, `/tasks/automations` |
| Security | `/security` | `/security/approvals`, `/security/audit`, `/security/access` |

---

## 4. API Route Conventions

All API routes follow this pattern:
```
/api/{module}/{resource}
/api/{module}/{resource}/{id}
/api/{module}/{resource}/{id}/{action}
```

Examples:
```
GET  /api/sales/leads
POST /api/sales/leads
GET  /api/sales/leads/:id
POST /api/sales/leads/:id/qualify
POST /api/agents/tasks
GET  /api/agents/tasks/:id
POST /api/agents/tasks/:id/approve
POST /api/security/approvals/:id/approve
POST /api/security/approvals/:id/reject
```

Internal/cron routes:
```
POST /api/internal/agents/process-queue
POST /api/internal/sales/send-approved-outreach
POST /api/internal/command/generate-daily-brief
```

Webhook routes:
```
POST /api/webhooks/ziina
POST /api/webhooks/higgsfield
POST /api/webhooks/whatsapp
```

---

## 5. Database Schema Conventions

Each schema follows the same conventions:
- `id` column: `uuid` with `defaultRandom()`
- `created_at`: `timestamp with time zone` default `now()`
- `updated_at`: `timestamp with time zone` updated on modification
- `status` columns: typed enum with explicit allowed values
- State transitions: CAS pattern — `UPDATE ... WHERE status = 'CURRENT'`
- Cross-schema references: via `uuid` foreign keys only
- No business logic in DB — logic lives in `domain/` layer

---

## 6. Domain Module Conventions

Each domain module in `domain/` exports:
```typescript
// State definitions
export const LEAD_STATUSES = ['NEW', 'REVIEWING', 'QUALIFIED', ...] as const
export type LeadStatus = typeof LEAD_STATUSES[number]

// Business rules
export function isQualifiable(lead: Lead): boolean { ... }
export function transitionStatus(lead: Lead, to: LeadStatus): void { ... }

// No DB imports here — domain is I/O-free
```

Application layer (`app/api/`) coordinates domain + infrastructure:
```typescript
// app/api/sales/leads/[id]/qualify/route.ts
const lead = await leadsRepo.findById(id)          // infrastructure
const result = domain.qualify(lead, criteria)        // domain
await leadsRepo.update(lead.id, { status: result }) // infrastructure
await audit.log(...)                                 // system
```

---

## 7. Environment Variable Structure

Follows the same security model as V1:

```bash
# Identity
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Database
DATABASE_URL=

# AI Providers
ANTHROPIC_API_KEY=
GOOGLE_GEMINI_API_KEY=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Storage
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_PUBLIC_URL=

# Payments
ZIINA_API_KEY=
ZIINA_WEBHOOK_SECRET=
ZIINA_TEST_MODE=true        # Default TRUE. Never change without CEO approval.

# Sales
SALES_OUTREACH_TEST_MODE=true  # Default TRUE. Never change without CEO approval.
OUTREACH_TEST_RECIPIENT=        # Test redirect address

# Marketing
FACEBOOK_PAGE_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_WEBHOOK_SECRET=

# DevOps
GITHUB_TOKEN=                   # Read-only token for DevOps module

# Cron
CRON_SECRET=

# Public (safe for browser)
NEXT_PUBLIC_APP_URL=
```

**Security rule:** Only `NEXT_PUBLIC_*` variables reach the browser. All others are server-only. Never violate this.

---

## 8. Testing Structure

Tests are colocated with source files. Test file naming:
```
domain/sales/pipeline.ts        → domain/sales/pipeline.test.ts
infrastructure/email/resend.ts  → infrastructure/email/resend.test.ts
```

Test categories:
- **Unit** — domain logic, state machines, skill outputs
- **Integration** — infrastructure adapters (mocked external services)
- **Authorization** — every protected route tested for unauthorized access
- **Security** — webhook signature verification, injection prevention

CI requirement: All tests must pass before any PR merges.

---

## 9. Key Files Created at Repo Initialization

| File | Contents |
|---|---|
| `ARCHITECTURE.md` | Platform architecture, security rules, dependency direction |
| `CLAUDE.md` | Claude Code operating rules (similar to V1's CLAUDE.md) |
| `.env.example` | All variable names, no values, with security classification |
| `README.md` | Project identity, setup instructions, scripts |
| `db/schema/system.ts` | `audit_events` + `idempotency_keys` — first schema written |
| `db/schema/identity.ts` | Users table — second schema written |
| `.github/workflows/ci.yml` | lint + typecheck + test + build |

---

## 10. What This Structure Intentionally Excludes (Phase 1)

The following are **not in scope** for the initial repository setup:

| Excluded | Reason |
|---|---|
| Client portal | New platform is internal-only |
| Public DREXONYX website | drexonyx.com continues serving V1 during Phases 1–5; new public site is Phase 5+ |
| Payment checkout flow | No public purchases in Phase 1 |
| Android native apps | PENDING CEO DECISION — separate product, separate timeline |
| Fleet Tracker | PENDING CEO DECISION — separate product, not in platform scope |
| CMS or blog | Not needed in Phase 1 |
| Multi-tenancy | Single-tenant (DREXONYX internal) |
| SSB (Social Seller Bot) | V1-only feature; not rebuilt unless CEO requests |

---

*Document version: 3.0 — Revised 2026-11-21 by Claude Code*  
*Source of authority: DREXONYX_MASTER_BLUEPRINT.md v2.0*  
*Supersedes: v2.0 (2026-11-21, "(same as V1)" qualifier on Node version; referenced Master Blueprint v1.0)*
