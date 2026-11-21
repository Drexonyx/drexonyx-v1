# DREXONYX — Master Blueprint

**Document version:** 2.0 (revised 2026-11-21)  
**Previous version:** 1.0 (contained V1-dependent rationale, over-classified resources, oversimplified permission model, 14 redundant CEO decisions)  
**Prepared by:** Claude Code  
**Status:** DRAFT — AWAITING CEO REVIEW AND APPROVAL  
**Authority:** This document is the authoritative foundation. All other planning documents derive from it.

---

## PART I — THE CENTRAL DECISION

### Decision: Genuine Fresh Start (CEO CONFIRMED 2026-11-21)

The new DREXONYX platform is a **genuinely new creation**. It is not a migration, reorganization, continuation, or refactor of V1.

| What is completely new | What may be selectively retained |
|---|---|
| New GitHub repository | External service accounts (evaluated individually below) |
| New application source code | Existing domain: drexonyx.com |
| New user interface | Business knowledge (reference only) |
| New database project and all schemas | |
| New database records (empty) | |
| New authentication system | |
| New company management system | |
| New CEO Command Center | |
| New AI Agent system | |
| New workflows and automations | |
| New environment configuration | |
| New deployment configuration | |
| New testing and CI/CD setup | |

**Technology choices may coincidentally match V1.** When this occurs, the choice is justified by the new project's requirements independently — not because V1 used it. No technology is assumed correct because it was used before.

**No V1 code, schema, or credential may be imported.** V1 application artifacts are reference material only.

---

## PART II — COMPANY IDENTITY

### Official Name and Positioning

**Company name:** DREXONYX  
**Positioning:** AI-Native Technology Company  
**Domain:** drexonyx.com  
**Location:** Dubai, UAE  
**Label:** CEO CONFIRMED (2026-11-21)

### What DREXONYX Is

DREXONYX is a technology company. Its business scope covers 10 areas:

1. Software Products — proprietary business management systems
2. Custom Software Solutions — bespoke development for enterprise clients
3. AI Solutions — AI integration and automation for businesses
4. Business Automation — workflow and process optimization
5. Enterprise Systems — large-scale management platforms
6. CRM and Management Systems — customer and business relationship systems
7. Web Applications — commercial web application development
8. E-commerce and Digital Platforms — digital commerce infrastructure
9. Technology Integration — connecting and integrating business systems
10. Future Technology — commercial opportunities in emerging technology

**Label:** CEO CONFIRMED (2026-11-21)

### MDA (Master Digital Agency)

MDA is a **sub-brand** that operated as the initial commercial entry point. It is not the company's identity. CEO must decide whether to continue MDA as a sub-brand or fully rebrand under DREXONYX. See CEO Decision Sheet, Decision D2.

---

## PART III — OPERATING MODEL

### AI-Operated Company

DREXONYX will operate initially with one human executive (Founder & CEO) supported by an AI agent workforce. Every system design decision accounts for the fact that routine operations will be executed by AI agents, not human employees.

**Engineering requirements:**
- Clear task decomposition — agent tasks must be unambiguous and bounded
- Structured inputs and outputs — agents cannot work with ambiguous data
- Staged execution — agent outputs are staged before consequences
- Escalation paths — agents know when to stop and ask
- Audit trails — every action is recorded (human or agent)
- Emergency stop — CEO can halt all agents instantly
- Recovery — staged outputs can be rolled back

### Three Permission Levels (CEO CONFIRMED 2026-11-21)

Every agent action is classified into exactly one permission level before the platform is built. No agent may change its own permission level.

**AUTONOMOUS**  
Routine, low-risk, reversible actions that are pre-approved as a class. No human review required.

Examples:
- Generating draft text (reports, summaries, briefs) for internal records
- Analyzing data and producing structured output
- Discovering and enriching prospect data from public sources
- Scoring and classifying leads
- Generating daily/weekly company briefs
- Running status checks and QC reports
- Populating the Knowledge Base from verified sources

**POLICY-BOUND**  
Agents may execute independently within documented policies, quotas, limits, and conditions. No human approval required per action — but policy boundaries are enforced, logged, and auditable. The CEO sets the policies; agents operate within them.

Examples:
- Sending standard outreach emails within approved templates, within daily volume limits, to opted-in or verified prospect lists
- Queuing content for social publishing within approved campaign parameters
- Scheduling tasks and reminders
- Updating project status records
- Triggering pre-approved workflows within defined parameters
- Routine notifications to internal stakeholders

The boundary: when a POLICY-BOUND action would exceed a policy limit, or when no matching policy applies, the action escalates to CEO-ONLY.

**CEO-ONLY**  
Sensitive, high-impact, legal, financial, ownership, strategic, irreversible, or security-critical decisions. These require an explicit CEO approval record before execution. No agent proceeds without it.

Examples:
- Financial transactions — invoices, payments, expense commitments
- Legal commitments — contracts, terms, agreements
- Ownership and strategic decisions
- Security-critical changes — credentials, permissions, access
- Mass communications exceeding policy limits
- Irreversible actions — deletions, decommissions, DNS changes
- Any new external service account or subscription

**Important:** Not every external action is CEO-ONLY. Routine operational communications within approved policies are POLICY-BOUND. The goal is meaningful autonomy for agents within boundaries — not bottlenecking everything through the CEO.

### Emergency Stop and Recovery

A global flag in `system.settings.agent_emergency_stop`:
- When `true`: no new tasks dispatch; running tasks complete current step and halt
- CEO toggles this from `/security` in one action
- Emergency stop events logged to audit trail with timestamp and actor
- Recovery: CEO sets flag to `false` and reviews any incomplete tasks

---

## PART IV — INITIAL SOFTWARE PRODUCT PORTFOLIO

**Label:** CEO CONFIRMED (2026-11-21)

| Product | Category | Target market |
|---|---|---|
| CBMS — Commercial Brokerage Management System | Business Management Software | Commercial brokers, trading companies, brokerage firms |
| RMS — Retail Management System | Business Management Software | Retail businesses, stores, multi-branch retail |
| Auto Workshop Management System | Industry-Specific Management Software | Auto repair workshops, car service centres |
| DREXONYX International Trade System | Enterprise Trade Management Software | Import/export companies, international trading businesses |

**Note:** No product pricing, feature set, or development status is stated here. These are the CEO-confirmed portfolio items. Development priorities are PENDING CEO DECISION (see CEO Decision Sheet, Decision D3).

---

## PART V — CEO COMMAND CENTER

### What It Is

The CEO Command Center is the **private internal operating system** for DREXONYX. It is a web application accessible only to authenticated DREXONYX users. It is completely separate from the public DREXONYX website.

**Public website** (`drexonyx.com`): presents DREXONYX to the world. Separate application. Status is PENDING CEO DECISION (see Section VI.B and CEO Decision Sheet, Decision D4).

**CEO Command Center** (`app.drexonyx.com` or CEO-approved URL): where the CEO runs the company. Built first.

### MVP Scope (Phase 2)

| Module | Purpose | Priority |
|---|---|---|
| Company Overview | KPIs, company health, key metrics | P0 |
| Approval Queue | All pending human decisions in one place | P0 |
| Audit Log | Complete history of every action | P0 |
| Emergency Stop | Halt all agent tasks | P0 |
| Task Board | Tasks by domain, owner, deadline | P1 |
| Knowledge Base | Searchable company intelligence | P1 |
| AI Agent Monitor | Active tasks, queue, staged outputs | P1 |

---

## PART VI — TECHNICAL ARCHITECTURE

### Layered Architecture Principles

1. **Layered dependency direction:** Presentation → Application → Domain → Services → Infrastructure → External Providers. Inner layers never depend on outer layers.
2. **Server-side authority:** All authorization, business logic, and data mutation happen on the server. The browser is a display terminal.
3. **Security by default:** HMAC on webhooks. Idempotency keys on external mutations. Append-only audit log. Test-mode flags default to `true`.
4. **Modularity:** One module at a time. A working partial system is better than a broken complete system.
5. **Minimal external dependencies:** No new service without a specific, verified need and CEO approval.

### Recommended Technology Stack (Independent Evaluation)

Each technology is evaluated on its own merits for this project. The fact that a technology was used in V1 is not a justification — it is irrelevant.

| Technology | Why it fits this project | Main alternative | Cost implications | Complexity | Security implications | Vendor dependency | Status |
|---|---|---|---|---|---|---|---|
| **Next.js (App Router, TypeScript)** | Strong server/client boundary prevents accidental credential exposure; server components for data fetching; TypeScript eliminates runtime errors; App Router has clean file-based routing for a large internal application | Remix — similar server-first model; slightly better streaming primitives | Free; open source | Medium — App Router has learning curve | Server components enforce server-side data access; `NEXT_PUBLIC_*` convention makes secrets visible | Medium — optimized for Vercel; self-hosting possible but complex | PROPOSED |
| **Auth.js v5 (NextAuth)** | Maintained; Next.js-native; session management entirely server-side; supports credentials provider for email+password; no third-party session storage required | Lucia Auth — lighter, more manual; Clerk — fully managed, $25+/month, vendor lock-in | Free (self-hosted); open source | Medium — session configuration has complexity | Established security model; bcrypt hashing; no browser-accessible session storage | Low — open source, self-hosted | PROPOSED |
| **Drizzle ORM** | Type-safe SQL queries without abstraction magic; migration-based schema management; works with Neon's connection pooler; lightweight runtime | Prisma — popular, heavier runtime, more abstraction; Kysely — pure query builder, no schema management | Free; open source | Low — straightforward TypeScript API | No runtime injection risk via type system; explicit queries | None — open source | PROPOSED |
| **Neon PostgreSQL** | Serverless PostgreSQL; branch-based development workflow (dev/preview/production from one project); standard PostgreSQL compatibility | Supabase — PostgreSQL plus BaaS extras (overkill for this use); Railway — simpler ops, $5/month base | **PENDING VERIFICATION** — free tier reported as 1 project, 10 branches, 0.5 GB RAM, 10 GB storage. Verify actual current account plan before recommending strategy. | Low — standard PostgreSQL | TLS enforced; standard PostgreSQL authentication | Medium — startup; data portability via standard pg_dump | PROPOSED — pending account verification |
| **Cloudflare R2** | S3-compatible; existing account; zero egress fees (unlike S3); free tier available | AWS S3 — industry standard, egress costs; Vercel Blob — simpler API, $0.023/GB | **PENDING VERIFICATION** — free tier reported as 10 GB storage, 1M Class A ops/month. Verify actual current account. | Low — standard S3 API | Access key authentication; no public access by default | Low — existing account; standard S3 API for portability | PROPOSED |
| **Anthropic API (Claude)** | Required for AI agent workforce; Claude models (Haiku/Sonnet) support tool use and structured output; reliable for complex reasoning | OpenAI GPT-4o — comparable capability; Google Gemini — free tier available, useful as fallback | **PENDING VERIFICATION** — pricing changes frequently. Verify current Claude Haiku, Sonnet pricing. | Low — HTTP API | API key authentication; no user data retained server-side | Medium — single provider; mitigate with Gemini fallback | PROPOSED |
| **Resend (email)** | Existing account; dedicated email delivery; simple API; supports custom domains for DKIM/SPF | Postmark — similar, $0.10/1,000 emails; SendGrid — complex, free tier | **PENDING VERIFICATION** — free tier reported as 3,000 emails/month, 100/day. Verify actual account plan, current usage, and whether sender domain is verified. Do not change email configuration during planning. | Low | DKIM/SPF via domain configuration | Low — existing account | PROPOSED — pending email configuration verification |
| **Vercel (deployment)** | Zero-config Next.js deployment; preview URLs per branch; environment variable management; existing account | Railway — more flexible, $5/month base; Render — similar to Railway | **PENDING VERIFICATION** — Hobby plan reported as free with no project count limit, but bandwidth and function limits apply. Verify current account plan and project count. | Low — GitHub integration | HTTPS auto-provisioned; server-side env vars never reach browser | High — Next.js deeply optimized for Vercel; self-hosting is significantly more complex | PROPOSED — pending account verification |
| **Ziina** | UAE/AED payment processing; existing merchant setup | Stripe — global, more features (see PENDING CEO DECISION on Stripe); Telr — UAE alternative | **PENDING VERIFICATION** — verify current merchant account status and transaction fee rate | Low | Webhook HMAC verification; PCI handled by Ziina | Medium — UAE-regional | PROPOSED |
| **GitHub** | Standard version control; free for unlimited private repos; GitHub Actions CI free tier (2,000 minutes/month) | GitLab — self-hostable; Bitbucket — similar | Free for the organization's existing account | Low | Branch protection; secret scanning available | Low — industry standard | PROPOSED |

### Verification Required Before Stack is Finalized

| Item | What to verify | Status |
|---|---|---|
| Neon account plan | Current plan tier, project count, branch count, storage used | PENDING VERIFICATION |
| Vercel account plan | Current plan tier, project count, function usage | PENDING VERIFICATION |
| Resend account plan | Current plan tier, monthly send limit, sender domain verification status | PENDING VERIFICATION |
| Cloudflare account | R2 bucket count, storage used, existing Workers | PENDING VERIFICATION |
| Stripe | Does an account exist? Current status? | PENDING CEO DECISION |
| Anthropic API | Current pricing for Haiku and Sonnet | PENDING VERIFICATION |

### VI.B — Public Website Strategy (Three Options — CEO Decides)

The new DREXONYX public website (if and when rebuilt) must be a fresh design and fresh implementation, independent of V1. The CEO Command Center is a **separate private application** — not the public website.

**Option A — Keep V1 active while building the new platform**

- V1 continues serving drexonyx.com as-is
- New platform (CEO Command Center) built independently at a separate subdomain
- New public website developed as a later phase (Phase 5 or later)
- Zero DNS disruption; zero risk to current traffic
- Two codebases running in parallel until new public site is ready
- Implies: V1 Vercel project is kept active; V1 operational costs continue

**Option B — Build new public site independently, switch over when approved**

- New public website developed in parallel with the new platform (Phase 5 scope)
- Staged at a subdomain until CEO approves it
- DNS cutover when CEO confirms the new site is ready
- Brief DNS propagation period at cutover (risk: 24–48 hours of mixed traffic)
- V1 is then confirmed for retirement (Option C)

**Option C — Retire V1 after new public site is verified (hybrid outcome)**

- Follows Option B when the new site is live and confirmed
- V1 Vercel project decommissioned; V1 no longer served
- DNS pointed to new Vercel project
- Clean break — no dual-codebase period

**Practical path:** A → B → C (keep V1 while building, build new site, switch over, retire V1) is the safest sequence. The CEO decides which path to follow.

**Label:** PENDING CEO DECISION — see Decision D4 in CEO Decision Sheet

---

## PART VII — SELECTIVE RESOURCE RETENTION INVENTORY

**Classification categories:**

| Category | Meaning |
|---|---|
| **KEEP** | Retain as-is. Genuinely useful to the new company. |
| **KEEP BUT RECONFIGURE** | Retain the account; create new project/bucket/key for the new platform. |
| **REFERENCE ONLY** | Historical information useful for decisions; not imported into the new application. |
| **REBUILD** | Useful concept; rewritten fresh in new platform. |
| **RETIRE** | No longer needed; candidate for eventual deletion after CEO sign-off. |
| **PENDING CEO DECISION** | Current value or dependencies not fully established; CEO must decide. |
| **PENDING VERIFICATION** | Classification depends on data not yet confirmed. |

---

### 7.1 GitHub

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| GitHub organization: `drexonyx` | External account | KEEP | Infrastructure. All repositories and permissions live here. |
| Repository: `drexonyx-v1` | GitHub repo | PENDING CEO DECISION | Currently serves the live public website via Vercel. Cannot be deleted while V1 is live. Once V1 is retired, CEO confirms: archive or delete. |
| New repository: `drexonyx-platform` | GitHub repo | (To be created in Phase 1) | New platform home |
| V1 GitHub Actions workflows | GitHub files | REFERENCE ONLY | CI/CD patterns reference — no inheritance |
| V1 GitHub Actions secrets | GitHub secrets | KEEP — DO NOT MODIFY | V1 operational secrets; V1 continues to use these |

---

### 7.2 Vercel

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| Vercel account | External account | KEEP | Infrastructure. Existing account. |
| V1 Vercel project (drexonyx.com) | Vercel project | PENDING CEO DECISION | Required while V1 is live. Once V1 is retired and new public site is ready, this project can be decommissioned. Timing depends on public website decision (D4). |
| Five demo site Vercel projects | Vercel projects | PENDING CEO DECISION | Demo sites represent completed MDA work. No cost on Hobby plan but consume project slots. CEO to confirm: retain indefinitely, retire individual demos, or consolidate. Do not retire without CEO sign-off. |
| New Vercel project: `drexonyx-platform` | Vercel project | (To create in Phase 1) | New platform deployment |
| Old preview deployments (V1) | Vercel deployments | PENDING CEO DECISION → likely RETIRE | No ongoing value. CEO confirms before deleting. |

---

### 7.3 Neon PostgreSQL

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| Neon account | External account | KEEP | Infrastructure. |
| V1 production database | Neon database | KEEP — NEVER CONNECT | Contains live production data. Must not be connected to new platform. Must not be dropped or modified. |
| V1 dev/preview branches | Neon branches | PENDING CEO DECISION | May be useful if V1 investigations are needed. Candidates for deletion once V1 is confirmed retired. |
| New Neon project (new platform) | Neon database | PENDING VERIFICATION → create in Phase 1 | Completely fresh. Strategy depends on current account plan — see Section VI verification items. |

**Key unknown:** Neon free tier is reported to allow 1 project per account. If true, the new platform needs either a second free Neon account or a plan upgrade. This must be verified against the actual account before Phase 1.

---

### 7.4 Cloudflare

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| Cloudflare account | External account | KEEP | Infrastructure. DNS and storage managed here. |
| DNS for drexonyx.com | Cloudflare DNS | KEEP — DO NOT CHANGE | Active domain. Any DNS change requires CEO approval and a specific plan. |
| SSL/TLS on drexonyx.com | Cloudflare service | KEEP | Active certificate managed by Cloudflare. |
| V1 R2 bucket | Cloudflare R2 | KEEP — NEVER CONNECT | Contains V1 production assets. Do not use in new platform. Do not delete without V1 retirement plan. |
| New R2 bucket for new platform | Cloudflare R2 | (To create in Phase 1) | Fresh bucket; completely separate |
| Cloudflare Workers | Cloudflare service | PENDING VERIFICATION | Verify whether any Workers are deployed before making a recommendation |

---

### 7.5 Resend

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| Resend account | External account | KEEP BUT RECONFIGURE | Existing account; retaining is commercially and technically reasonable |
| V1 API key | Resend credential | KEEP — DO NOT SHARE | V1 continues using its key |
| New API key for new platform | Resend credential | (To generate in Phase 1) | New key, completely separate from V1 |
| Sender domain configuration | Resend config | PENDING VERIFICATION | Verify: (1) is the sender domain verified in the account? (2) what is current plan sending limit? (3) what is current monthly usage? Do not change email configuration during planning. |

---

### 7.6 Domain

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| drexonyx.com | Domain name | KEEP | Primary company domain. |
| Existing subdomains | DNS records | PENDING VERIFICATION | Verify which subdomains exist and what they serve before classifying |

---

### 7.7 AI Providers

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| Anthropic API account | External account | KEEP BUT RECONFIGURE | Existing account; generates new key for new platform |
| V1 ANTHROPIC_API_KEY | Credential | KEEP — DO NOT SHARE | V1 uses this key |
| Google AI Studio (Gemini) | External account | KEEP BUT RECONFIGURE | Gemini free tier is useful as AI fallback |
| V1 GEMINI_API_KEY | Credential | KEEP — DO NOT SHARE | V1 uses this key |

---

### 7.8 Payment Providers

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| Ziina account | External account | KEEP BUT RECONFIGURE | UAE/AED payment processing; existing merchant setup |
| Ziina AED 599 payment link | External URL | PENDING CEO DECISION | Used for MDA website offer. If MDA continues as a sub-brand, it may still be needed. CEO confirms. |
| Stripe account | External account | PENDING VERIFICATION → PENDING CEO DECISION | Verify: does a Stripe account exist? What was it used for in V1? Is it currently active? Then CEO decides whether Stripe is needed in new platform. |

---

### 7.9 Social and Messaging APIs

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| Facebook Graph API access | External API | PENDING CEO DECISION | V1 had Facebook organic publishing. Useful if Marketing Operations includes social publishing (Phase 5). Do not set up until needed. |
| WhatsApp Cloud API | External API | PENDING CEO DECISION | V1 had inbound WhatsApp. Not in new platform initial scope. CEO confirms whether to eventually retire or rebuild. |
| Meta Business Manager | External account | PENDING CEO DECISION | Required if Facebook publishing is included |

---

### 7.10 Fleet Tracker (Expo Mobile App)

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| Fleet Tracker source code | GitHub files | PENDING CEO DECISION | Expo/React Native mobile app. Wialon GPS integration. Expo account: `drexonyx.studio`. Bundle ID: `com.drexonyx.fleettracker`. Not part of new platform. CEO decides: continue development separately, pause, or retire. |
| Expo account | External account | PENDING CEO DECISION | Required only if Fleet Tracker continues |
| Wialon API access | External API | PENDING CEO DECISION | Required only if Fleet Tracker continues |

---

### 7.11 Android Projects

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| android-project/, android-official/, android-play/ | Local files / GitHub | PENDING CEO DECISION | Native Android projects. `android-play/` has Google Play store listing materials. CEO confirms: pause, continue separately, or retire. |
| android-apk/ debug builds | Local files | PENDING CEO DECISION | Debug APKs. Likely RETIRE once CEO confirms no active test devices depend on these builds. |
| Google Play Developer account | External account | PENDING CEO DECISION | Required only if Android apps remain active |

---

### 7.12 MDA Business Documents

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| MDA Source of Truth & Operating Rules | Document file | REFERENCE ONLY | CEO-approved business rules and pricing. Useful for new platform Knowledge Base seeding — manually reviewed, not auto-imported. |
| MDA Demo Production Standard (T1–T13) | Document file | REFERENCE ONLY | 13-step workflow. Useful reference for process playbooks. |
| CEO-approved MDA pricing (2026-10-21) | Document file | HISTORICAL REFERENCE | Requires re-approval for new platform context. Do not apply these prices in new platform without explicit CEO re-confirmation. |
| Dubai pricing research | Document file | REFERENCE ONLY — UNVERIFIED | Snippet-based research; not evidence for pricing decisions |
| MDA Client Acquisition Plan | Document file | REFERENCE ONLY | Historical sales planning |

---

### 7.13 MDA Deliverables

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| Company Profile v1–v6 (HTML + PDF) | Local files | PENDING CEO DECISION | Completed agency work. Value depends on whether MDA continues as a sub-brand. CEO decides: retain as portfolio, archive, or retire. |
| MDA Service Catalog v1–v3 | Local files | PENDING CEO DECISION | Same as above |
| build-catalog-v3.py | Local file | REFERENCE ONLY | Python build script for catalog generation |
| Five demo sites (barbershop, clinic, salon, restaurant, real estate) | Vercel projects | PENDING CEO DECISION | Deployed on Vercel. Represent completed work. CEO confirms: maintain as portfolio assets, retire individual demos, or retire all. Do not retire without CEO sign-off. |

---

### 7.14 Lead and Prospect Data

| Resource | Type | Classification | Reasoning |
|---|---|---|---|
| LEAD_TRACKER.csv | Local file | PENDING CEO DECISION | May contain active prospects. CEO decides: manual review and import to new sales system, or leave as V1 historical record. |
| FLASH_DELIVERY_DUBAI_LEADS.csv / .json | Local files | PENDING CEO DECISION | Same as above |
| OVERSEAS_RECRUITMENT_AGENCIES data | Local files | REFERENCE ONLY | Research output; likely historical with no active prospects |
| 25+ root-level research dump files | Local files | PENDING CEO DECISION | CEO reviews before classifying as RETIRE. Some may contain useful competitive or market research worth preserving in Knowledge Base. |

---

### 7.15 V1 Application Code Concepts

V1 application code is **REFERENCE ONLY** in its entirety. No file may be imported.

Concepts worth rebuilding fresh in the new platform (the concept is valuable; the implementation starts from scratch):

| Concept | Rebuild value | Reason |
|---|---|---|
| CAS (Compare-And-Swap) state transitions | HIGH | Prevents race conditions on status fields — a database concurrency pattern |
| Idempotency key pattern | HIGH | Prevents duplicate processing — a distributed systems pattern |
| Append-only audit events table | HIGH | Tamper-evident log — a security pattern |
| HMAC webhook signature verification | HIGH | Prevents webhook spoofing — a security pattern |
| Test-mode safety flags | HIGH | Prevents accidental production impact during development |
| Approval gate for outreach | HIGH | POLICY-BOUND/CEO-ONLY enforcement — a business logic pattern |

These are general engineering patterns. They are not V1 innovations.

---

### 7.16 V1 Database Schemas

V1 schemas: `core`, `identity`, `commercial`, `production`, `financial`, `system`, `sales`, `ssb`, `orchestration`.

**All classified as REFERENCE ONLY.** The new platform designs its own schema from scratch. No schema definition or migration file is copied.

---

## PART VIII — LEGACY CLEANUP STRATEGY

### Principle

No resource is deleted without an individual CEO sign-off. Candidates are identified here; execution is Phase 6.

### Cleanup Candidates (Phase 6)

**GitHub:**
- `drexonyx-v1` repository: archive or delete once V1 is confirmed retired and all historical materials are preserved elsewhere

**Vercel:**
- V1 Vercel project: decommission once new public site replaces V1 and DNS is switched
- Old preview deployments: delete via Vercel dashboard (no value retained after V1 is replaced)
- Individual demo site projects: CEO decision on each

**Neon:**
- V1 development/preview database branches: delete once V1 development is confirmed complete
- V1 production database: archive data export, then delete — only after V1 is fully retired

**Cloudflare R2:**
- V1 R2 bucket: retain until V1 is retired and all assets are accounted for; then CEO-approved deletion

**Files in V1 repo:**
- 25+ root-level research dump files
- `test-projects/` directory
- `android-apk/` debug builds
- `public/demo.html`, `public/promo.html` legacy files

**Timing:** No cleanup action is taken before Phase 6, and no Phase 6 action proceeds without CEO sign-off on that specific item.

---

## PART IX — SECURITY MODEL

Non-negotiable rules for all code in the new platform, forever:

1. `NEXT_PUBLIC_*` variables contain no secrets, credentials, or API keys — ever.
2. Server-side authorization on every API route and server action. UI hiding is not authorization.
3. HMAC-SHA256 verification on every inbound webhook before any processing.
4. Idempotency keys on all external mutations (payment processing, email sends, API calls that create records).
5. Append-only `audit_events` table — no UPDATE or DELETE operations on this table, ever.
6. Approval gates cannot be bypassed programmatically. Only a human approval record advances a CEO-ONLY action.
7. CEO-ONLY agent outputs are always staged. Auto-apply for this permission level is a code defect.
8. `SALES_OUTREACH_TEST_MODE=true` by default. Changing to `false` requires explicit CEO authorization.
9. `ZIINA_TEST_MODE=true` by default. Changing to `false` requires CEO authorization with business/legal clearance.
10. `agent_emergency_stop` checked before every task dispatch, regardless of permission level.
11. No database credentials shared between new platform and V1.
12. No API keys shared between new platform and V1 — separate keys per platform.
13. No secrets in Git history. `.env.local` gitignored.

---

## PART X — DEVELOPMENT PHASES

### Phase 0 — Blueprint and Approval ← CURRENT PHASE
Planning documents complete; CEO reviews and approves.

### Phase 1 — Fresh Project Foundation
New repository, authenticated shell, isolated database, CI/CD.

### Phase 2 — CEO Command Center MVP
Command dashboard, approval queue, audit log, emergency stop — all live before any agent runs.

### Phase 3 — AI Agent Workforce
Agent executor, three permission levels enforced, first live agent (Daily Brief Generator).

### Phase 4 — Business Operations Core
Sales pipeline (POLICY-BOUND outreach within policy), Knowledge Base, Product Portfolio (all 4 products registered).

### Phase 5 — Expansion
Finance, Marketing Operations, Task Management, DevOps Visibility. Public website (Option B) if approved by CEO.

### Phase 6 — Selective Legacy Cleanup
CEO-approved, item-by-item deletion of confirmed obsolete V1 resources.

---

## PART XI — CEO DECISION SHEET (SIMPLIFIED)

The decisions below require CEO input because they affect company direction, ownership, cost, security, or are irreversible. Technical decisions that Claude can make with clear reasoning are not on this list — those are documented in the Architecture document.

### A. Strategic Decisions (CEO Must Decide)

| # | Decision | Context | Options |
|---|---|---|---|
| **D1** | Company direction | Confirm DREXONYX is an AI-Native Technology Company (not primarily an agency) | Confirm / modify |
| **D2** | MDA sub-brand | Continue MDA as DREXONYX sub-brand? Or fully rebrand? This affects product portfolio and Knowledge Base seeding. | Continue MDA / Retire MDA brand / Transform to tech brand |
| **D3** | Initial product priorities | Which of the 4 software products is built / marketed first? In what sequence? | CEO to rank CBMS / RMS / Auto Workshop / International Trade |
| **D4** | Public website strategy | V1 stays up while new platform is built (Option A), or new public site built in parallel and switched over (B→C), or other. | Option A / B / C / Other |
| **D5** | Active lead data | LEAD_TRACKER.csv and FLASH_DELIVERY_DUBAI_LEADS contain prospect data. Migrate to new platform, or leave as V1 historical record? | Migrate / Archive / Leave in V1 |

### B. External Account Decisions (Require Verification First)

These cannot be resolved until account states are confirmed. Claude will research and return with verified options.

| # | Decision | What must be verified first |
|---|---|---|
| **D6** | Stripe account | Does a Stripe account exist? What was it used for in V1? Is it still needed? |
| **D7** | Neon account strategy | Current Neon plan — 1 project limit or not? Then: second free account vs. upgrade vs. other |
| **D8** | Resend sender domain | Is drexonyx.com verified in Resend? What is current plan limit and usage? Then: use same account, or fresh account |

### C. Product/Legacy Decisions (Can Defer to Phase 4–6)

| # | Decision | Context |
|---|---|---|
| **D9** | Fleet Tracker | Continue development separately, pause indefinitely, or retire? |
| **D10** | Android projects | Continue separately, pause, or retire? |
| **D11** | Demo sites | Retain as portfolio, retire individual demos, or retire all? |

### D. What Claude Has Already Decided (No CEO Input Needed)

| Item | Decision | Reasoning |
|---|---|---|
| Repository name | `drexonyx-platform` | Standard naming convention; can be changed at Phase 1 start |
| Platform URL | `app.drexonyx.com` | Separates private Command Center from public site |
| New R2 bucket | Separate dedicated bucket for new platform | Clean separation from V1 assets |
| Test-mode defaults | `SALES_OUTREACH_TEST_MODE=true`, `ZIINA_TEST_MODE=true` | Safety defaults; always true until CEO authorizes |
| Tech stack direction | Next.js + Auth.js + Drizzle + Neon + Vercel + Anthropic | See independent evaluation in Section VI |

---

## PART XII — APPROVAL REQUIREMENTS

Before Phase 1 begins:

**CEO must decide:**
- [ ] D1 — Confirm company direction
- [ ] D2 — MDA sub-brand direction
- [ ] D4 — Public website strategy
- [ ] D7 — Neon strategy (after verification)
- [ ] D8 — Resend strategy (after verification)

**Claude will verify and report back:**
- Neon account current plan details
- Vercel account current plan and project count
- Resend account plan, usage, and sender domain status
- Cloudflare Workers existence
- Stripe account existence and status

**Before any Phase 6 cleanup action:**
- Individual CEO sign-off on each specific deletion

---

## PART XIII — DECISION HISTORY

| Date | Decision | Decision maker | Label |
|---|---|---|---|
| 2026-11-21 | DREXONYX is an AI-Native Technology Company | CEO | CEO CONFIRMED |
| 2026-11-21 | New platform must be a genuine fresh start, independent of V1 | CEO | CEO CONFIRMED |
| 2026-11-21 | Initial software product portfolio: CBMS, RMS, Auto Workshop MS, International Trade System | CEO | CEO CONFIRMED |
| 2026-11-21 | AI-operated company model with three permission levels | CEO | CEO CONFIRMED |
| 2026-11-21 | External service accounts may be selectively retained | CEO | CEO CONFIRMED |
| 2026-11-21 | No implementation begins until CEO approves planning documents | CEO | CEO CONFIRMED |
| 2026-11-21 | POLICY-BOUND agents may execute routine outreach within approved policies (not CEO-ONLY) | CEO | CEO CONFIRMED |
| 2026-10-21 | MDA website pricing: AED 599 / 899 / 1,899 | CEO | HISTORICAL REFERENCE — requires re-approval for new platform |
| 2026-10-21 | Full MDA service price list | CEO | HISTORICAL REFERENCE — requires re-approval for new platform |

---

*Document version: 2.0 — Revised 2026-11-21 by Claude Code*  
*Supersedes: v1.0 (contained V1-dependent rationale, over-classified resources, oversimplified permission model, 14 redundant CEO decisions)*
