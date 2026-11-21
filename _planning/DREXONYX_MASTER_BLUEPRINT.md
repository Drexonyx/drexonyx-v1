# DREXONYX — Master Blueprint

**Document version:** 1.0  
**Date:** 2026-11-21  
**Prepared by:** Claude Code (Principal Architect)  
**Status:** DRAFT — AWAITING CEO REVIEW AND APPROVAL  
**Supersedes:** All prior planning assumptions from previous sessions

---

## PART I — THE CENTRAL DECISION

### Decision: Absolute Fresh Start

The CEO has made a definitive decision: the new DREXONYX platform is a **genuinely new creation**, independent of all V1 application code, V1 architecture, V1 databases, and V1 operational assumptions.

This decision means:

| What is fresh | What may be selectively retained |
|---|---|
| New GitHub repository | Existing GitHub account and organization |
| New application code | Existing Vercel account |
| New database project + schemas | Existing Neon account |
| New authentication system | Existing Cloudflare account (DNS + R2) |
| New API integrations | Existing Resend account |
| New environment configuration | Existing domain: drexonyx.com |
| New AI agent architecture | Existing Anthropic API access |
| New workflows and automations | Existing Google Gemini API access |
| New documentation | Useful business knowledge (reference only) |
| Fresh database — no old records | External API accounts (reconfigured, not reused) |

The old application continues to run at `drexonyx.com` on Vercel until the new platform is ready to replace it. The two systems will never share a database, credentials, or codebase.

---

## PART II — COMPANY IDENTITY

### Official Name and Positioning

**Company name:** DREXONYX  
**Tagline:** AI-Native Technology Company  
**Domain:** drexonyx.com  
**Location:** Dubai, UAE  
**Public contact:** info@drexonyx.com  

**Label:** CONFIRMED—USER (CEO statement, 2026-11-21)

### What DREXONYX Is

DREXONYX is a technology company. It is not positioned as a website design agency or a media production house.

**Primary business focus (10 areas):**

1. Software Products — proprietary business management systems
2. Custom Software Solutions — bespoke development for enterprise clients
3. AI Solutions — AI integration and automation for businesses
4. Business Automation — workflow automation and process optimization
5. Enterprise Systems — large-scale management and operations platforms
6. CRM and Management Systems — customer and business relationship systems
7. Web Applications — commercial web application development
8. E-commerce and Digital Platforms — digital commerce infrastructure
9. Technology Integration — connecting and integrating business systems
10. Future Technology — commercial opportunities in emerging technology

**Label for scope:** CONFIRMED—USER

### Operating Under DREXONYX

MDA (Master Digital Agency) is a **sub-brand** that operated as the initial commercial entry point. It is not the company's identity. The new platform positions DREXONYX as the primary technology brand.

MDA's historical business knowledge (service catalog, pricing, demo standards) is preserved as reference material only — not as the new platform's primary business model.

---

## PART III — OPERATING MODEL

### AI-Operated Company

DREXONYX will operate initially with **one human executive (Founder & CEO)** supported by an AI agent workforce. This is not a marketing claim — it is an engineering constraint. Every system design decision must account for the fact that routine operations will be executed by AI agents, not human employees.

This model requires:
- Clear task decomposition (agent tasks must be unambiguous)
- Structured inputs and outputs (agents cannot work with ambiguous data)
- Staged execution (all agent outputs are staged before consequences)
- Escalation paths (agents must know when to stop and ask)
- Audit trails (every action is recorded — human or agent)
- Emergency stop capability (the CEO can halt all agents instantly)

### Three Permission Levels

Every agent action is classified into exactly one permission level before the platform is built. No agent may change its own permission level.

**AUTONOMOUS**
Routine, low-risk, reversible operations that the CEO has pre-approved as a class:
- Generating text drafts (reports, summaries, briefs) for human review
- Analyzing data and producing structured output
- Discovering and enriching prospect data from public sources
- Scoring and classifying leads
- Generating daily/weekly company briefs
- Populating the Knowledge Base from verified sources
- Running checks and producing QC reports

**POLICY-BOUND**
Operations that agents may execute independently, but only within defined policies and within explicit limits set by the CEO:
- Drafting outreach messages (within approved templates, within daily volume limits)
- Scheduling tasks and reminders
- Updating project status records
- Queuing content for publishing (not publishing itself)
- Triggering pre-approved workflows
- Updating Knowledge Base with verified new data

**CEO-ONLY**
Operations that require explicit CEO authorization before execution. No agent may proceed:
- Sending any external communication (email to prospects, customers, or partners)
- Publishing any content to external platforms (social media, website, App Store)
- Creating, modifying, or deleting financial records
- Issuing invoices or processing payments
- Signing or committing to any commercial terms
- Making any change to external service configuration (DNS, deployments, API credentials)
- Deleting any record from the system (soft or hard delete)
- Making any strategic, legal, or ownership decision
- Accessing or modifying production database outside the platform
- Granting permissions to any agent or user

### Emergency Stop

The platform must implement a global emergency stop capability accessible to the CEO from the Command Center:
- One action suspends all queued agent tasks
- All running tasks complete their current step and halt before the next
- No new tasks are dispatched until the CEO explicitly resumes
- Emergency stop events are logged to the audit trail with timestamp and actor

### Realistic Runtime Constraints

The AI agent workforce does not run continuously. It operates in task-driven bursts:
- Tasks are queued by the CEO or by scheduled triggers
- Agents are invoked per-task, not as persistent background processes
- Vercel serverless functions handle agent execution (5–10 second tasks fit within function timeout; longer tasks use background jobs via GitHub Actions)
- API rate limits and costs are managed by daily/weekly task budgets set by the CEO

---

## PART IV — INITIAL SOFTWARE PRODUCT PORTFOLIO

The following four products are DREXONYX's initial product portfolio. These are the products the company will develop, market, sell, and support.

**Label for portfolio:** CONFIRMED—USER (CEO statement, 2026-11-21)

### Product 1: CBMS — Commercial Brokerage Management System

**Category:** Business Management Software  
**Target market:** Commercial brokers, trading companies, brokerage firms  
**Purpose:** End-to-end management of brokerage operations — deals, clients, counterparties, commissions, documentation

**Management requirements in the new platform:**
- Product specification (features, modules, pricing tiers)
- Version history and release management
- Development status and roadmap
- License management (clients, license keys, expiry)
- Customer registry (clients using this product)
- Support tickets
- Revenue tracking

**Current status:** PENDING CEO CLARIFICATION — specific development state unknown to Claude Code

### Product 2: RMS — Retail Management System

**Category:** Business Management Software  
**Target market:** Retail businesses, stores, multi-branch retail operations  
**Purpose:** Inventory, sales, POS, customers, staff, suppliers, and financial reporting for retail operations

**Management requirements:** Same as CBMS above

**Current status:** PENDING CEO CLARIFICATION

### Product 3: Auto Workshop Management System

**Category:** Industry-Specific Management Software  
**Target market:** Auto repair workshops, car service centres  
**Purpose:** Job cards, vehicle records, parts inventory, technician assignments, invoicing, customer history

**Management requirements:** Same as CBMS above

**Current status:** PENDING CEO CLARIFICATION

### Product 4: DREXONYX International Trade System

**Category:** Enterprise Trade Management Software  
**Target market:** Import/export companies, international trading businesses  
**Purpose:** Shipments, suppliers, buyers, trade documentation, compliance, financial settlements

**Management requirements:** Same as CBMS above

**Current status:** PENDING CEO CLARIFICATION

**IMPORTANT:** No product pricing, feature claims, or development status is stated here. Historical prices and commercial terms from V1 or prior research are reference information only and must be explicitly re-approved by the CEO for the new platform.

---

## PART V — CEO COMMAND CENTER

### What It Is

The CEO Command Center is the **private internal operating system** for DREXONYX. It is a web application accessible only to authenticated DREXONYX users. It is **completely separate from the public DREXONYX website**.

The public website (`drexonyx.com`) presents DREXONYX to the world. The CEO Command Center is where the CEO runs the company.

### MVP Scope (Phase 2)

The MVP must be immediately useful to a single operator (the CEO). It must not be overbuilt.

**MVP modules (required for first usable version):**

| Module | Purpose | Priority |
|---|---|---|
| Company Overview | KPIs, company health, key metrics | P0 |
| Approval Queue | All pending human decisions in one place | P0 |
| Audit Log | Complete history of every action | P0 |
| Task Board | Tasks by domain, owner, deadline | P1 |
| Knowledge Base | Searchable company intelligence | P1 |
| AI Agent Monitor | Active tasks, queue status, outputs staged for review | P1 |

**Post-MVP modules (Phase 4+):**

| Module | Priority |
|---|---|
| Product Portfolio | P2 |
| Sales Pipeline | P2 |
| Finance & Reporting | P2 |
| Marketing Operations | P3 |
| Infrastructure Monitor | P3 |
| Security & Permissions | P3 |

### Public Website vs CEO Command Center

| Aspect | Public Website | CEO Command Center |
|---|---|---|
| Audience | Prospects, clients, partners | CEO (and future staff) |
| Access | Public | Private, authenticated only |
| Hosting | Vercel (existing, drexonyx.com) | Vercel (new project, e.g. app.drexonyx.com) |
| Repository | New shared repo or same (see note) | New repository: `drexonyx-platform` |
| Phase | Phase 5+ (replace V1 public site) | Phase 1–2 (built first) |

**Note on repository structure:** The CEO Command Center (private) and future public website are built in the **same new repository** (`drexonyx-platform`) but with clear URL and code separation. The Command Center is at `/app.*` or `/platform.*` subdomain; the public site is at `drexonyx.com`. This avoids managing two repositories unnecessarily in the early stages.

---

## PART VI — TECHNICAL ARCHITECTURE

### Architecture Principles

1. **Fresh code, proven patterns.** The V1 architecture produced correct, secure patterns. The new platform applies the same patterns (layered architecture, CAS state machines, idempotency keys, audit events) but writes them fresh — not by copying V1 code.

2. **Layered dependency direction.** Presentation → Application → Domain → Services → Infrastructure → External Providers. Inner layers never depend on outer layers.

3. **Server-side authority.** All authorization, business logic, and data mutation happen on the server. The browser is a display terminal.

4. **Security by default.** HMAC verification on all webhooks. Idempotency keys on all external mutations. Append-only audit log. Test-mode flags default to `true`.

5. **Modularity over completeness.** Build one module at a time. A working partial system is better than a broken complete system.

6. **Minimal external dependencies.** Use existing accounts. Do not purchase new services without CEO approval and a specific business case.

### Recommended Technology Stack

| Layer | Technology | Decision status |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | PROPOSED — same as V1, proven, Vercel-native |
| Auth | NextAuth v5 / Auth.js | PROPOSED — proven in V1 |
| Database ORM | Drizzle ORM | PROPOSED — type-safe, proven in V1 |
| Database | Neon PostgreSQL (new project) | PROPOSED — existing account |
| File Storage | Cloudflare R2 (new bucket) | PROPOSED — existing account |
| AI — Primary | Anthropic Claude API | PROPOSED — existing access |
| AI — Secondary | Google Gemini API | PROPOSED — existing access, free tier |
| Email | Resend (same account, new config) | PROPOSED — existing account |
| Payments | Ziina (new credentials) | PROPOSED — UAE/AED market |
| Deployment | Vercel (new project) | PROPOSED — existing account |
| Version Control | GitHub (new repo, existing org) | PROPOSED — existing org |
| CI/CD | GitHub Actions | PROPOSED — free, proven in V1 |
| Testing | Vitest | PROPOSED — fast, TypeScript-native |

**All technology choices are PROPOSED. CEO approval is required before any implementation begins.**

### Database Architecture

**Principle:** New Neon project, completely fresh schema design for the new platform. Zero connection to V1 production data.

**New database schemas (proposed):**

| Schema | Tables | Description |
|---|---|---|
| `identity` | users, roles | Platform users and permissions |
| `command` | kpis, alerts, briefs | CEO Command Center data |
| `knowledge` | articles, documents, research, decisions | Company knowledge base |
| `products` | catalog, versions, licenses, customers | Software product portfolio |
| `sales` | leads, pipeline, outreach, proposals, opt_outs | Sales and acquisition |
| `marketing` | campaigns, content, publishing_queue | Marketing operations |
| `finance` | invoices, payments, expenses | Financial tracking |
| `tasks` | tasks, workflows, automations | Task management |
| `agents` | definitions, task_queue, outputs | AI agent workforce |
| `system` | audit_events, idempotency_keys, settings | System-wide |

**Environment separation:**
- Development: local PostgreSQL or Neon development branch
- Staging: Neon staging branch (from new project)
- Production: Neon production branch (new project, never connected to V1)

**V1 database schemas (for reference only):**
V1 uses: `core`, `identity`, `commercial`, `production`, `financial`, `system`, `sales`, `ssb`. These schemas remain in the V1 Neon project. The new platform starts its own schema set with no overlap in naming or data.

---

## PART VII — RESOURCE RETENTION INVENTORY

Every identified external resource and V1 asset is classified below.

**Classification legend:**
- **KEEP** — Retain as-is. Already useful for the new company.
- **KEEP BUT RECONFIGURE** — Retain the account; create new project/bucket/key for the new platform.
- **REFERENCE ONLY** — Historical information useful for decisions but must not be imported into the new application.
- **REBUILD** — The concept or capability is valuable; it must be rewritten fresh in the new platform.
- **RETIRE** — No longer needed. Can eventually be removed after CEO approval.
- **PENDING CEO DECISION** — Future use unclear. CEO must decide.

---

### 7.1 GitHub

| Resource | Classification | Notes |
|---|---|---|
| GitHub organization: `drexonyx` | KEEP | The organization itself is permanent infrastructure |
| Repository: `drexonyx-v1` | KEEP | Preserve as legacy. Do not delete. Continue serving V1. |
| New repository: `drexonyx-platform` | (To be created in Phase 1) | New platform home |
| GitHub Actions workflows (V1) | REFERENCE ONLY | Pattern reference for new CI/CD |
| GitHub Actions secrets (V1) | KEEP | V1 operational secrets stay with V1 |

---

### 7.2 Vercel

| Resource | Classification | Notes |
|---|---|---|
| Vercel account (drexonyx.studio@gmail.com) | KEEP | Account is infrastructure; free Hobby plan |
| Vercel project: `drexonyx-v1` (drexonyx.com) | KEEP | Continues serving the public website until new platform is ready |
| New Vercel project: `drexonyx-platform` | (To be created in Phase 1) | For new platform deployment |
| Preview deployments (V1) | PENDING CEO DECISION | Old preview URLs may be cleaned up eventually |

**Note on Vercel plan:** Hobby plan is free and allows multiple projects. If team collaboration on Vercel is needed, upgrade to Pro ($20/month) requires CEO approval.

---

### 7.3 Neon PostgreSQL

| Resource | Classification | Notes |
|---|---|---|
| Neon account | KEEP | Account itself is infrastructure |
| V1 production database | KEEP — DO NOT CONNECT | Production data must be preserved. Never connect to new platform. |
| V1 development/preview branches | REFERENCE ONLY | Available if V1 needs investigation |
| New Neon project (for new platform) | (To be created in Phase 1) | Completely fresh — see database strategy |

**Neon free tier constraint:** The Neon Free plan allows **1 project**. Options (CEO must decide):
- **Option A (Recommended):** Create a second Neon account using a different email. Second account = second free project. Zero cost.
- **Option B:** Upgrade existing Neon account to Launch ($19/month) for multi-project support.
- **Option C:** Use Neon development branches within the same project — not recommended (risks proximity to V1 production data).

---

### 7.4 Cloudflare

| Resource | Classification | Notes |
|---|---|---|
| Cloudflare account | KEEP | Account is permanent infrastructure |
| DNS for drexonyx.com | KEEP | Primary domain; must not be changed |
| SSL/TLS on drexonyx.com | KEEP | Active certificate; do not touch |
| R2 bucket (V1 assets — videos, images) | KEEP — DO NOT CONNECT | V1 production storage; never use in new platform |
| New R2 bucket for new platform | (To be created in Phase 1) | Fresh bucket, completely separate |
| Cloudflare Workers (if any) | PENDING CEO DECISION | Need to verify if any Workers exist |

---

### 7.5 Resend (Email)

| Resource | Classification | Notes |
|---|---|---|
| Resend account | KEEP BUT RECONFIGURE | Same account; create new API key for new platform |
| Existing Resend API key (V1) | KEEP — DO NOT SHARE | V1 continues using its own key |
| New Resend API key (new platform) | (To be generated in Phase 1) | Fresh key, separate from V1 |
| Existing sender domain configuration | KEEP IF DOMAIN VERIFIED | If `info@drexonyx.com` or similar is verified in Resend, it can be used in the new platform |
| Email sending volume (3,000/month free) | KEEP | Shared across V1 and new platform; monitor usage |

**CEO question:** Is the email domain `drexonyx.com` verified in Resend for sending? This needs to be confirmed before the new platform uses Resend for outreach.

---

### 7.6 Domain

| Resource | Classification | Notes |
|---|---|---|
| drexonyx.com | KEEP | Primary company domain; already registered |
| Any subdomains in use | PENDING CEO DECISION | Verify what subdomains exist and their purpose |

---

### 7.7 AI Providers

| Resource | Classification | Notes |
|---|---|---|
| Anthropic API account | KEEP BUT RECONFIGURE | Use same account; generate new API key for new platform, or use same key with separation by purpose |
| Existing ANTHROPIC_API_KEY (V1) | KEEP — DO NOT SHARE | V1 uses its own key |
| Google AI Studio account (Gemini) | KEEP BUT RECONFIGURE | Gemini is free tier; same account usable |
| Existing GEMINI_API_KEY (V1) | KEEP — DO NOT SHARE | V1 uses its own key |

---

### 7.8 Payment Providers

| Resource | Classification | Notes |
|---|---|---|
| Ziina account | KEEP BUT RECONFIGURE | Create new credentials for new platform; keep existing test-mode setup in V1 |
| Existing Ziina payment link: `https://pay.ziina.com/drexonyx/Md6AyFJ0z?source=app` | PENDING CEO DECISION | This is the AED 599 MDA website offer link. If MDA operations continue in the new platform, this link may still be used. CEO must confirm. |
| Stripe account | PENDING CEO DECISION | Stripe was integrated in V1 (`.env.example` shows `STRIPE_SECRET_KEY`). Verify if Stripe account exists and whether it's needed in new platform. |

---

### 7.9 Meta / Social APIs

| Resource | Classification | Notes |
|---|---|---|
| Facebook Graph API access | PENDING CEO DECISION | V1 had Facebook organic publishing. New platform may need it in Marketing Operations (Phase 4+). Do not set up until needed. |
| WhatsApp Cloud API | RETIRE (from new platform) | V1 had inbound WhatsApp. Not needed in new platform Phase 1–4. CEO to confirm eventual retirement. |
| Meta Business Manager access | PENDING CEO DECISION | May be needed for Facebook publishing |

---

### 7.10 Fleet Tracker (Expo Mobile App)

| Resource | Classification | Notes |
|---|---|---|
| Fleet Tracker source code | PENDING CEO DECISION | Built with Expo/React Native. Uses Wialon GPS API. Expo account: `drexonyx.studio`. Bundle ID: `com.drexonyx.fleettracker`. Not part of new platform. |
| Expo account (drexonyx.studio) | PENDING CEO DECISION | May need to be maintained for Fleet Tracker builds |
| Wialon API access | PENDING CEO DECISION | GPS tracking platform required by Fleet Tracker |

**Recommendation:** Fleet Tracker is a separate product. It should be treated independently — not merged into the new platform. CEO to decide: continue development, pause, or prioritize based on the four main software products.

---

### 7.11 Android Applications

| Resource | Classification | Notes |
|---|---|---|
| android-project/ | PENDING CEO DECISION | Base Android native project |
| android-official/ | PENDING CEO DECISION | Official release variant |
| android-play/ | PENDING CEO DECISION | Google Play store variant with store listing materials (account-deletion, privacy policy, data safety, listing) |
| android-apk/ (debug builds) | RETIRE (eventually) | Debug APKs; not production releases |
| Google Play Developer account | PENDING CEO DECISION | Needed if Android apps are published or planned for publication |

**Recommendation:** Pause Android native development during new platform Phase 1–4. CEO to review and restart as a separate product workstream when ready.

---

### 7.12 MDA Business Documents (Intellectual Property)

| Resource | Classification | Notes |
|---|---|---|
| MDA Source of Truth & Operating Rules | REFERENCE ONLY | Business rules, pricing, evidence standards — valuable for Sales module design |
| MDA Demo Production Standard (T1–T13) | REFERENCE ONLY | 13-step demo → payment → delivery workflow. Valuable if demo/website service continues. |
| Approved MDA pricing (CEO-approved 2026-10-21) | REFERENCE ONLY | Historical pricing. Must be re-approved for new platform context. |
| MDA Company Profile Production Standard | REFERENCE ONLY | Production and QC methodology for company profile service |
| Dubai company profile pricing research | REFERENCE ONLY — UNVERIFIED | Snippet-based research; cannot be used as market evidence |
| Facebook lead generation research | REFERENCE ONLY | Historical outreach research |
| MDA Client Acquisition Plan | REFERENCE ONLY | Historical sales planning |

---

### 7.13 MDA Deliverables (Completed Work Products)

| Resource | Classification | Notes |
|---|---|---|
| Company Profile v1–v6 (HTML + PDF) | KEEP | Completed agency work. Store as portfolio assets. |
| MDA Service Catalog v1–v3 (HTML + PDF) | KEEP | Agency catalog versions. Store as portfolio reference. |
| build-catalog-v3.py | REFERENCE ONLY | Python script used to generate catalog. Keep for reference if catalog is rebuilt. |
| Five demo websites (barbershop, clinic, salon, restaurant, real estate) | KEEP — DEPLOYED | Actively serving at Vercel. Sales asset for website offer. Do not remove. |

---

### 7.14 Lead and Prospect Data

| Resource | Classification | Notes |
|---|---|---|
| LEAD_TRACKER.csv | PENDING CEO DECISION | Active leads. CEO must decide: manual review and import to new sales system, or leave in V1 as historical record. |
| FLASH_DELIVERY_DUBAI_LEADS.csv / .json | PENDING CEO DECISION | Prospect data. Same decision as above. |
| OVERSEAS_RECRUITMENT_AGENCIES data | REFERENCE ONLY | Research output. No active prospects likely. |
| MANPOWER research files (25+ files) | RETIRE (from active use) | Research output. Can remain in V1 repo indefinitely. Not worth carrying forward. |
| FINAL_REJECTION_LOG, FINAL_RFQ, FINAL_VERIFIED_SHORTLIST | REFERENCE ONLY | Historical outreach results |

---

### 7.15 Test Projects

| Resource | Classification | Notes |
|---|---|---|
| test-projects/dubai-residential-dev-2026/ | REFERENCE ONLY | Test project for V1 development |
| test-projects/mda-client-acquisition-2026/ | REFERENCE ONLY | Test project for V1 development |

---

### 7.16 V1 Application Code (Patterns Worth Rebuilding)

These are **not to be copied** — they are concepts to be rewritten fresh using the new architecture.

| Concept | V1 Location | Rebuild value |
|---|---|---|
| CAS (Compare-And-Swap) state transitions | `lib/agent/`, `db/schema/` | HIGH — proven, safe concurrency pattern |
| Idempotency key pattern | `db/schema/system.ts` | HIGH — prevents duplicate processing |
| Append-only audit event log | `db/schema/system.ts` | HIGH — mandatory security pattern |
| HMAC webhook verification | `app/api/webhooks/` | HIGH — mandatory security pattern |
| Test-mode safety flags | `lib/ziina.ts`, `lib/sales/outreach-sender.ts` | HIGH — prevents accidental live actions |
| AI skill contract pattern (input → AI call → structured output) | `lib/skills/sales/` | MEDIUM — clean abstraction, worth adopting |
| Lead funnel state machine | `db/schema/sales.ts` | MEDIUM — the states are good; redesign schema fresh |
| Approval gate for outreach | `lib/sales/queries.ts` | HIGH — critical safety pattern for new platform |
| Agent dispatch → halt → webhook/poll → materialize | `lib/agent/driver.ts` | MEDIUM — reference for agent execution model |

---

## PART VIII — LEGACY CLEANUP INVENTORY

The following V1 assets are candidates for eventual deletion. No deletion is authorized during planning. Each deletion requires a separate CEO approval at Phase 6.

### V1 Repository Cleanup (after new platform is live)

| Item | Type | Cleanup action |
|---|---|---|
| 25+ root-level research dump files (`MANPOWER_*`, `OVERSEAS_*`, `FINAL_*`, `FLASH_DELIVERY_*`) | Files | Move to `_archive/` subfolder in V1, or delete after backup |
| `test-projects/` directory | Files | Delete after confirming no active work |
| `public/demo.html`, `public/promo.html`, `public/demo-en.html`, `public/promo-en.html` | Files | Delete — replaced by proper demo sites |
| `android-apk/` debug APKs | Files | Delete — debug builds, not releases |
| Old Vercel preview deployments (V1) | Cloud | Vercel → Project → Deployments — delete old previews via dashboard |
| Unused Neon database branches (V1 dev branches) | Cloud | Neon dashboard — delete non-production branches |

### V1 Application Components (not to be rebuilt)

If V1 is eventually decommissioned, these components are retired:
- UGC video production pipeline
- Client portal (replaced by new customer management)
- Multiple overlapping admin portal sections
- SSB (Social Seller Bot) application

**Timing:** No V1 component is retired until the new platform fully replaces it and the CEO explicitly approves decommission.

---

## PART IX — SECURITY MODEL

These rules apply to all code in the new platform, forever. They are non-negotiable.

1. `NEXT_PUBLIC_*` variables contain no secrets, credentials, or API keys.
2. Server-side authorization on every API route and server action.
3. HMAC-SHA256 verification on every inbound webhook before processing.
4. Idempotency keys on all external mutations (payment processing, email sends, API calls that create records).
5. Append-only `audit_events` table — no UPDATE or DELETE operations, ever.
6. Test-mode safety flags default to `true`: `SALES_OUTREACH_TEST_MODE=true`, `ZIINA_TEST_MODE=true`. Changing either to `false` requires explicit CEO authorization.
7. AI agent outputs for CEO-ONLY actions are always staged. No agent action in this category executes without a human approval record in `security.approvals`.
8. No database credentials shared between the new platform and V1.
9. No API keys shared between the new platform and V1 (separate keys per platform).
10. Emergency stop disables agent task dispatch. The flag is stored in `system.settings` and checked before every task dispatch.

---

## PART X — DEVELOPMENT PHASES

### Phase 0 — Blueprint and Approval (Current Phase)
**Goal:** Complete planning documents. CEO reviews and approves before any code is written.

**Deliverables:** This Master Blueprint + 5 supporting planning documents  
**Gate:** CEO approves all planning documents  
**CEO decisions required:** See Part XI below

---

### Phase 1 — Fresh Project Foundation
**Goal:** A deployable, authenticated shell exists. Database is fresh and isolated.

**Scope:**
- New GitHub repository created
- Next.js app scaffolded (TypeScript, App Router)
- NextAuth v5: single CEO login (email + password)
- Database: new Neon project, `system` and `identity` schemas
- `audit_events` and `idempotency_keys` tables operational from day one
- `system.settings` table including `agent_emergency_stop` flag
- Empty platform shell: authenticated route `/`, sidebar with all future module links
- GitHub Actions CI: lint + typecheck + test + build
- Vercel project created: `app.drexonyx.com` (or CEO-chosen subdomain)
- `.env.example` with complete variable inventory
- `ARCHITECTURE.md` and `CLAUDE.md` committed

**Success criteria:** CEO can log in at the staging URL. CI passes on every push. Zero connection to V1.

---

### Phase 2 — CEO Command Center MVP
**Goal:** The CEO has a usable home screen and all safety infrastructure is live.

**Scope:**
- `command` schema: kpis, alerts, briefs
- `agents` schema: definitions, task_queue, outputs
- `/command` dashboard: KPI tiles, alerts, company health
- `/security/approvals`: approval queue (empty initially)
- `/security/audit`: audit log viewer
- Emergency stop toggle in `/security`
- Manual KPI entry
- Alert creation and dismissal
- 50+ tests covering all domain logic and authorization

**Success criteria:** CEO can track company KPIs. Approval queue is live. Emergency stop works.

---

### Phase 3 — AI Agent Workforce
**Goal:** The agent execution engine is operational with real tasks.

**Scope:**
- Agent definition registry
- Task queue with status tracking (queued → running → staged → approved/rejected)
- Anthropic Claude provider (primary)
- Google Gemini provider (secondary/fallback)
- Three permission level enforcement
- First live agent: **Daily Brief Generator**
- `/agents` dashboard: task list, staged outputs, approve/reject UI
- 40+ tests covering executor, approval policies, permission enforcement

**Success criteria:** CEO triggers a brief → agent runs → output staged → CEO approves → brief on Command Center.

---

### Phase 4 — Business Operations Core
**Goal:** Sales pipeline, Knowledge Base, and Product Portfolio are operational.

**Scope:**

*Sales:*
- `sales` schema: leads, outreach, proposals, opt_outs, opt_out_tokens
- Lead pipeline (NEW → WON / REJECTED)
- Outreach approval gate (proposals require CEO approval)
- Resend integration: `SALES_OUTREACH_TEST_MODE=true` by default
- Opt-out system
- Sales AI skills: discover, qualify, score, outreach draft
- `/sales` pipeline view

*Knowledge Base:*
- `knowledge` schema: articles, documents, research, decisions
- Seed from V1 MDA business documents (reference only — manually reviewed)
- `/knowledge` search interface

*Product Portfolio:*
- `products` schema: catalog, versions, licenses, customers
- 4 initial products registered: CBMS, RMS, Auto Workshop MS, International Trade System
- `/products` management interface

**Success criteria:** Lead-to-outreach workflow operational (test mode). All 4 products visible in catalog. MDA knowledge seeded and searchable.

---

### Phase 5 — Expansion (Finance, Marketing, Tasks)
**Goal:** All core command center modules operational.

**Scope:**
- `finance` schema: invoices, payments, expenses
- `marketing` schema: campaigns, content, publishing_queue
- `tasks` schema: tasks, workflows, automations
- Ziina webhook (new credentials): payment confirmation → invoice update
- Facebook organic publishing (if approved by CEO) — with CEO-ONLY permission gate
- `/finance`, `/marketing`, `/tasks` modules

---

### Phase 6 — Selective Legacy Cleanup
**Goal:** Remove approved obsolete V1 resources after verifying they are not needed.

**Scope:**
- CEO reviews full cleanup inventory (Section VIII of this blueprint)
- Each deletion item gets individual CEO approval
- Root-level research files removed from V1 repo (after backup confirmation)
- Old Vercel preview deployments deleted
- Unused Neon database branches deleted
- V1 public site replaced by new public DREXONYX website (if scoped by CEO)

**Gate:** No item deleted without CEO sign-off on that specific item.

---

## PART XI — UNRESOLVED CEO DECISIONS

The following decisions must be made before Phase 1 begins. All are marked PENDING.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | New repository name | `drexonyx-platform` / other | `drexonyx-platform` |
| D2 | New platform subdomain/URL | `app.drexonyx.com` / `platform.drexonyx.com` / other | `app.drexonyx.com` |
| D3 | Neon database strategy | Option A (second free account) / Option B ($19/month upgrade) | Option A: second free Neon account |
| D4 | Vercel plan | Hobby (free, 1 member) / Pro ($20/month, team) | Hobby until team grows |
| D5 | Stripe | Keep the Stripe account active? Needed in new platform? | PENDING — CEO to confirm |
| D6 | Ziina AED 599 payment link | Reuse in new platform? / Create new? / Retire? | PENDING — CEO to confirm |
| D7 | Active leads (LEAD_TRACKER.csv) | Manual review and import? / Leave as V1 historical? | PENDING — CEO to confirm |
| D8 | Fleet Tracker | Continue development separately? / Pause? | PENDING — CEO to decide separately |
| D9 | Android projects | Pause development? / Continue separately? | PENDING — CEO to decide separately |
| D10 | MDA sub-brand | Continue MDA as DREXONYX sub-brand? / Rebrand fully under DREXONYX? | PENDING — CEO decision |
| D11 | Technology stack | Approve proposed stack (Next.js, Drizzle, Neon, Vercel)? | PENDING — CEO approval |
| D12 | AI model default | Claude Sonnet (balanced) / Claude Haiku (cheaper) / other? | Sonnet for complex tasks, Haiku for routine |
| D13 | Public DREXONYX website | Keep V1 as public site during platform build? When to rebuild? | Keep V1 until Phase 5+ |
| D14 | Phase 1 start | Approve after reviewing all planning documents? | Awaiting CEO |

---

## PART XII — APPROVAL REQUIREMENTS

Before any action outside documentation:

**Minimum approvals to begin Phase 1:**
- [ ] CEO approves this Master Blueprint (all parts)
- [ ] CEO approves D1 (repository name)
- [ ] CEO approves D2 (platform URL)
- [ ] CEO approves D3 (database strategy)
- [ ] CEO approves D11 (technology stack)
- [ ] CEO approves D13 (V1 public site strategy)

**Before any external service modification:**
- [ ] Individual CEO approval per service
- [ ] Separate CEO approval per deletion action

---

## PART XIII — DECISION HISTORY

| Date | Decision | Decision maker | Status |
|---|---|---|---|
| 2026-11-21 | DREXONYX is an AI-Native Technology Company (not an agency) | CEO | CONFIRMED |
| 2026-11-21 | New platform must be a fresh start, independent of V1 | CEO | CONFIRMED |
| 2026-11-21 | Initial software product portfolio: CBMS, RMS, Auto Workshop MS, International Trade System | CEO | CONFIRMED |
| 2026-11-21 | AI-operated company model with three permission levels | CEO | CONFIRMED |
| 2026-11-21 | External service accounts may be selectively retained | CEO | CONFIRMED |
| 2026-11-21 | No implementation begins until CEO approves planning documents | CEO | CONFIRMED |
| 2026-10-21 | MDA website pricing: AED 599 / 899 / 1,899 | CEO | HISTORICAL REFERENCE — requires re-approval for new platform |
| 2026-10-21 | Full MDA service price list | CEO | HISTORICAL REFERENCE — requires re-approval for new platform |

---

*Document version: 1.0 — Prepared 2026-11-21 by Claude Code (Principal Architect)*  
*This document is the authoritative source of truth for the DREXONYX platform rebuild. All other planning documents derive from it.*  
*Next update: After CEO review and approval decisions are recorded above.*
