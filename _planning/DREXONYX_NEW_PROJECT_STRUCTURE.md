# DREXONYX — New Project Structure

**Document version:** 3.3 (revised 2026-11-22)  
**Previous version:** 3.2 (no content errors found; version-only bump to align with v3.3 correction pass across all six planning documents)  
**Prepared by:** Claude Code  
**Status:** PHASE 0 — DOCUMENTATION COMPLETE, CEO APPROVAL PENDING  
**Authority:** Derives from DREXONYX_MASTER_BLUEPRINT.md v3.3

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

## 1a. Scope and System Identification

**This document describes System A — the CEO Command Center only.** The public DREXONYX website (System B) and DREXONYX's commercial software products (CBMS, RMS, etc.) are separate systems with separate repositories and separate development phases. See Master Blueprint Part II.B.

This repository is built from scratch. Zero V1 code is imported. The structure below is designed for the CEO Command Center — the private internal operating system of DREXONYX. It is not the public website, and it does not contain the commercial software products.

**Directories are created only when their phase begins.** This document shows the full intended structure across all phases. Phase 1–3 creates the CEO Command Center, security infrastructure, and agent platform only. Phase 4–5 modules are not created as empty placeholders — they are added when their phase begins.

---

## 2. Phase 1–3 Directory Layout

**This section shows only the directories created during Phases 1–3 (CEO Command Center, Security Infrastructure, and AI Agent Workforce).** Phase 4–5 module directories are added when their phase begins — see [Section 2.A](#2a-phase-45-directory-additions) for the full list.

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
├── .env.example                 # Phase 1–3 variable names. No values. Committed.
├── .gitignore
├── .npmrc                       # engine-strict=true
├── .nvmrc                       # Node version pin
│
│   # Next.js Core (Phase 1–3 routes only)
├── app/
│   ├── (auth)/
│   │   └── login/               # Login page
│   ├── (platform)/              # All authenticated routes
│   │   ├── layout.tsx           # Platform shell (nav, sidebar — includes Phase 4–5 nav links as placeholders)
│   │   ├── command/             # CEO Command Center (Phase 1)
│   │   ├── agents/              # AI Agent Workforce (Phase 3)
│   │   └── security/            # Approvals & Security (Phase 2)
│   ├── api/
│   │   ├── auth/                # NextAuth handlers (Phase 1)
│   │   ├── command/             # Command Center APIs (Phase 1)
│   │   ├── agents/              # Agent dispatch & status (Phase 3)
│   │   ├── security/            # Approval APIs (Phase 2)
│   │   └── internal/            # Cron / internal scheduled jobs (Phase 2+)
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Redirect to /command (authenticated) or /login
│   └── globals.css
│
│   # Domain Logic (framework-agnostic TypeScript)
├── domain/
│   ├── command/                 # CEO Command Center business rules (Phase 1)
│   ├── agents/                  # Agent definitions, dispatch, approval policies (Phase 3)
│   │   ├── definitions/         # Individual agent modules
│   │   ├── executor.ts          # Agent task execution engine
│   │   └── approval.ts          # Approval policy engine
│   └── security/                # Approval gate rules, audit policy (Phase 2)
│
│   # Service Interfaces (abstractions — no implementations here)
├── services/
│   ├── ai.ts                    # IAIProvider interface (Phase 3)
│   └── email.ts                 # IEmailService interface (added Phase 4 when outreach begins)
│
│   # Infrastructure (concrete implementations — Phase 1–3 only)
├── infrastructure/
│   └── ai/
│       ├── anthropic.ts         # Anthropic Claude provider (Phase 3)
│       └── gemini.ts            # Google Gemini fallback (Phase 3)
│
│   # Database (Phase 1–3 schemas only)
├── db/
│   ├── schema/
│   │   ├── system.ts            # audit_events, idempotency_keys, settings (Phase 1 — first schema written)
│   │   ├── identity.ts          # users, sessions (Phase 1)
│   │   ├── command.ts           # kpis, alerts, briefs (Phase 2)
│   │   └── agents.ts            # agent registry, tasks, outputs (Phase 3)
│   ├── migrations/              # Drizzle migration files
│   └── index.ts                 # DB connection (Neon + Drizzle)
│
│   # Shared Components (Phase 1–3 only)
├── components/
│   ├── ui/                      # Base UI components (buttons, inputs, cards)
│   ├── platform/                # Platform shell components (nav, sidebar)
│   ├── command/                 # Command Center components
│   ├── agents/                  # Agent Workforce components
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

## 2.A Phase 4–5 Directory Additions

**These directories do not exist at Phase 1–3 initialization.** Each is created when its phase begins. This appendix documents the full intended structure for reference during planning only.

### Phase 4 Additions (Business Operations Core)

```
app/(platform)/
├── company/                     # Company Management (Phase 4)
├── knowledge/                   # Knowledge Base (Phase 4B)
├── products/                    # Product Portfolio (Phase 4C)
└── sales/                       # Sales & Acquisition (Phase 4A)

app/api/
├── knowledge/                   # Knowledge Base APIs (Phase 4B)
├── sales/                       # Sales APIs (Phase 4A)
└── webhooks/                    # External webhooks — Ziina, etc. (Phase 5A+)

domain/
├── knowledge/                   # Knowledge Base rules (Phase 4B)
├── products/                    # Product catalog, demo, pricing rules (Phase 4C)
└── sales/                       # Lead funnel, outreach, opt-out rules (Phase 4A)
    ├── skills/                  # AI skills: discover, qualify, score, outreach
    ├── pipeline.ts              # Lead state machine
    └── outreach.ts              # Outreach approval and dispatch

services/
└── email.ts                     # IEmailService interface (Phase 4A — when outreach begins)

infrastructure/
└── email/
    └── resend.ts                # Resend implementation (Phase 4A)

db/schema/
├── knowledge.ts                 # articles, documents, research (Phase 4B)
├── products.ts                  # software catalog, versions, licenses, customers, demos (Phase 4C)
└── sales.ts                     # leads, outreach, proposals, opt_outs (Phase 4A)

components/
├── knowledge/                   # Knowledge Base components (Phase 4B)
└── sales/                       # Sales components (Phase 4A)

knowledge-seed/                  # Static files for Phase 4B Knowledge Base initial seed
├── products/                    # DREXONYX software product specs; MDA service catalog (if MDA continues)
├── processes/                   # SOPs, production standards (from V1 reference material)
├── decisions/                   # Architecture decisions (new series, starts at #0001)
└── research/                    # Referenced research (manually curated from V1 reference only)
```

### Phase 5 Additions (Expansion)

```
app/(platform)/
├── devops/                      # Dev Operations (Phase 5D)
├── finance/                     # Finance & Reporting (Phase 5A)
├── marketing/                   # Marketing Operations (Phase 5B)
└── tasks/                       # Task Management (Phase 5C)

app/api/
├── devops/                      # DevOps APIs (Phase 5D)
├── finance/                     # Finance APIs (Phase 5A)
├── marketing/                   # Marketing APIs (Phase 5B)
└── tasks/                       # Task APIs (Phase 5C)

domain/
├── finance/                     # Revenue tracking, expense rules (Phase 5A)
├── marketing/                   # Campaign and content rules (Phase 5B)
└── tasks/                       # Task state machine, workflow engine (Phase 5C)

services/
├── payment.ts                   # IPaymentService interface (Phase 5A)
└── storage.ts                   # IStorageService interface (Phase 5D)

infrastructure/
├── github/
│   └── client.ts                # GitHub API client (Phase 5D — DevOps module)
├── payment/
│   └── ziina.ts                 # Ziina implementation (Phase 5A)
└── storage/
    └── cloudflare-r2.ts         # R2 implementation (Phase 5D)

db/schema/
├── finance.ts                   # invoices, payments, expenses (Phase 5A)
├── marketing.ts                 # campaigns, content, publishing (Phase 5B)
└── tasks.ts                     # tasks, workflows (Phase 5C)
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

Follows the same security model as V1. **This section lists Phase 1–3 variables only.** Phase 4–5 variables are added when their phase begins — see [Section 2.A](#2a-phase-45-directory-additions) for the phase breakdown.

**Phase 1 variables (at repository initialization):**
```bash
# Identity
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Database
DATABASE_URL=

# Safety flags (always default true — CEO authorization required to change)
SALES_OUTREACH_TEST_MODE=true
ZIINA_TEST_MODE=true
OUTREACH_TEST_RECIPIENT=        # Test redirect address for outreach in test mode

# Public (safe for browser)
NEXT_PUBLIC_APP_URL=
```

**Phase 2 addition (when cron jobs are set up):**
```bash
# Cron
CRON_SECRET=
```

**Phase 3 addition (when AI agents go live):**
```bash
# AI Providers
ANTHROPIC_API_KEY=
GOOGLE_GEMINI_API_KEY=          # Gemini fallback provider
```

**Phase 4–5 additions:** Resend, Ziina, Cloudflare R2, Facebook, GitHub, and other provider credentials are added in their respective phases. See Section 2.A for the full per-phase breakdown.

**Security rule:** Only `NEXT_PUBLIC_*` variables reach the browser. All others are server-only. Never violate this.

**Safety flag rule:** `SALES_OUTREACH_TEST_MODE` and `ZIINA_TEST_MODE` default to `true`. They must remain `true` until the CEO explicitly authorizes disabling them. Each is a separate CEO action with separate business/legal clearance requirements.

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

## 10. What This Structure Intentionally Excludes

The following are **not in scope** for this repository:

| Excluded | System | Reason |
|---|---|---|
| Public DREXONYX website | System B | Separate system, separate repository. PENDING CEO DECISION (D4). |
| Commercial software products (CBMS, RMS, etc.) | System C | Each is a separate repository and deployment. This repo only tracks them in a Product Portfolio management module. |
| Client portal | N/A | Internal-only platform |
| Resend email integration | Phase 4+ | Not needed until outreach begins |
| Ziina payment integration | Phase 5+ | Not needed until payment processing begins |
| Facebook / WhatsApp API | Phase 5+ | Marketing operations; not needed until Phase 5 |
| GitHub API (DevOps) | Phase 5+ | DevOps visibility; not needed until Phase 5 |
| Cloudflare R2 | Phase 2+ | Add when file storage is first needed — not Day 1 |
| Google Gemini | Phase 3+ | Add AI fallback when it is actually needed — not Day 1 |
| Android native apps | PENDING D10 | Separate product; separate timeline |
| Fleet Tracker | PENDING D9 | Separate product; not in platform scope |
| CMS or blog | N/A | Not needed for internal platform |
| Multi-tenancy | N/A | Single-tenant (DREXONYX internal) |
| SSB (Social Seller Bot) | V1-only | Not rebuilt unless CEO requests |

---

*Document version: 3.3 — Revised 2026-11-22 by Claude Code*  
*Source of authority: DREXONYX_MASTER_BLUEPRINT.md v3.3*  
*Supersedes: v3.2 (no content errors found in v3.2; version-only bump to align with v3.3 correction pass across all six planning documents)*
