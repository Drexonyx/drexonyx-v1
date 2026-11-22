# DREXONYX — New Platform Architecture

**Document version:** 3.4 (revised 2026-11-22)  
**Previous version:** 3.3 (Section 7.2 runtime behavior stated "Running tasks complete their current step and halt before the next" — incorrect; the correct policy is that running agents must not initiate any new external side effect after the stop is observed; in-flight operations may have uncertain outcomes requiring idempotency/reconciliation)  
**Prepared by:** Claude Code  
**Status:** PHASE 0 — DOCUMENTATION COMPLETE, CEO APPROVAL PENDING  
**Authority:** Derives from DREXONYX_MASTER_BLUEPRINT.md v3.4

---

## 1. Vision and Absolute Fresh Start

**DREXONYX is an AI-Native Technology Company.** The company's business scope spans 10 domains: Software Products, Custom Software Solutions, AI Solutions, Business Automation, Enterprise Systems, CRM and Management Systems, Web Applications, E-commerce and Digital Platforms, Technology Integration, and Future Technology. MDA (Master Digital Agency) is a sub-brand, not the company's identity.

DREXONYX is building an **AI-Native Company Operating System** — a single internal platform through which the Founder/CEO commands and observes the entire company. Every business domain — sales, production, marketing, finance, knowledge, task orchestration, product portfolio — is a module within this platform. AI agents act as the company's digital workforce; humans retain authority over all consequential decisions.

**Absolute Fresh Start Requirement (CEO Decision 2026-11-21):**
The new platform is a genuinely new creation. This means:
- New GitHub repository (no code carried from `drexonyx-v1`)
- New database project (no connection to V1 Neon databases)
- New authentication system (not shared with V1)
- New environment configuration (separate API keys per platform)
- Patterns from V1 are referenced and rebuilt fresh — never copied

This is not a migration, reorganization, or refactor of V1. It is a new platform.

This platform is not a customer-facing SaaS product. It is the internal nervous system of DREXONYX itself.

**This architecture document covers System A — the CEO Command Center only.** The public DREXONYX website (System B) and DREXONYX's commercial software products (System C) are separate applications with their own repositories, deployments, and development phases. See Master Blueprint Part II.B for the three-system separation. No code, schema, or deployment from System A is shared with System B or System C.

---

## 2. Design Principles

| # | Principle | What it means in practice |
|---|---|---|
| P1 | **CEO-first** | Every screen, every report, every queue answers one question: "What does the CEO need to decide or know right now?" |
| P2 | **AI agents as workforce, humans as authority** | Agents research, draft, produce, and propose. Humans approve, reject, and override. No agent takes a consequential external action without approval. |
| P3 | **Single source of truth** | All company knowledge, decisions, and business data live in one structured system. No document scatter across chat threads, Google Docs, and spreadsheets. |
| P4 | **Audit everything** | Every action — human or agent — is logged. The platform is always explainable and reversible. |
| P5 | **Zero unnecessary subscriptions** | Prefer existing infrastructure (GitHub, Vercel, Neon, Cloudflare). Pay only for what delivers clear business value. |
| P6 | **Clean architecture from day one** | No scope creep. No technical debt inheritance from V1. Each module is independently buildable and testable. |
| P7 | **Security by default** | Server-side authorization on every request. No client-trusted data. Secrets never in source code or browser. |

---

## 3. Platform Modules

The platform is organized into 11 domains. Each domain is a fully owned module with its own database schema, API routes, UI pages, and agent integrations.

```
┌─────────────────────────────────────────────────────────┐
│                  CEO COMMAND CENTER                     │
│         (Unified view — decisions, KPIs, alerts)        │
└──────┬──────────────────────────────────────────┬───────┘
       │                                          │
       ▼                                          ▼
┌──────────────┐                        ┌──────────────────┐
│  AI AGENT    │                        │  HUMAN APPROVAL  │
│  WORKFORCE   │                        │  & SECURITY      │
│  (Dispatch,  │◄──── Approval ────────►│  CONTROLS        │
│   Monitor,   │      Gates             │  (Approval queue,│
│   Review)    │                        │   Audit log,     │
└──────┬───────┘                        │   Access ctrl)   │
       │ Tasks feed into                └──────────────────┘
       ▼
┌──────────────────────────────────────────────────────────┐
│                   BUSINESS DOMAINS                       │
├─────────────┬──────────────┬──────────────┬─────────────┤
│  COMPANY    │   KNOWLEDGE  │   PRODUCT    │   DEVOPS    │
│  MANAGEMENT │   BASE       │   PORTFOLIO  │             │
├─────────────┼──────────────┼──────────────┼─────────────┤
│    SALES &  │  MARKETING   │   FINANCE &  │    TASK     │
│  CUSTOMER   │  OPERATIONS  │  REPORTING   │  MANAGEMENT │
│ ACQUISITION │              │              │             │
└─────────────┴──────────────┴──────────────┴─────────────┘
```

### 3.1 CEO Command Center
**Purpose:** The first screen the CEO sees. Real-time company health, pending decisions, today's priorities.

**Core views:**
- Company Health Dashboard — KPIs across all domains (revenue pipeline, active leads, tasks due, agent queue)
- Decisions Pending — approval queue surfaced from all modules
- Daily Brief — AI-generated summary of overnight activity, top priorities, alerts
- Company Alerts — anomalies, blockers, urgent items from any module

### 3.2 AI Agent Workforce
**Purpose:** Define, dispatch, monitor, and review the work of AI agents across all business domains.

**Core views:**
- Agent Registry — all defined agents, their capabilities, and current status
- Task Queue — dispatched tasks with status (queued / running / awaiting review / completed)
- Agent Outputs — results staged for review before any external action
- Performance — agent success rate, average task time, error patterns

**Key design rule:** An agent's output is never automatically published, sent, or applied to an external system. It enters a "staged" state and requires human review before proceeding — except for AUTONOMOUS-level actions that are explicitly pre-approved.

### 3.3 Company Management
**Purpose:** Official company records, settings, team, and documents.

### 3.4 Company Knowledge Base
**Purpose:** Structured, queryable repository of everything DREXONYX knows — about its market, products, customers, processes, and competitors.

### 3.5 Product Portfolio Management
**Purpose:** Manage all DREXONYX software products and services — from development status through licensing, customers, and support.

**Initial software products (CEO-confirmed 2026-11-21):**
1. **CBMS** — Commercial Brokerage Management System
2. **RMS** — Retail Management System
3. **Auto Workshop Management System**
4. **DREXONYX International Trade System**

### 3.6 Software Development Operations
**Purpose:** Track the health of all DREXONYX software projects, deployments, and technical work.

### 3.7 Sales & Customer Acquisition
**Purpose:** Manage the full sales funnel from lead discovery through conversion.

### 3.8 Marketing Operations
**Purpose:** Plan, produce, and publish marketing content. Track campaign performance.

### 3.9 Finance & Business Reporting
**Purpose:** Track company revenue, costs, and financial health. Reporting and visibility only in Phase 1 — not a bookkeeping replacement.

### 3.10 Task Management & Workflow Orchestration
**Purpose:** Assign, track, and automate tasks. Connect tasks to agents and approvals.

### 3.11 Human Approval & Security Controls
**Purpose:** Central registry of all pending approvals and security controls. The human override layer for every AI and automated action.

---

### 3.12 MVP Phase Scope

Not all modules are built in Phase 1–3. Modules are added when the CEO has a real need for them, not to populate an empty directory structure.

| Module | Phase | Rationale |
|---|---|---|
| CEO Command Center (3.1) | Phase 1–2 | P0 — first screen; home for KPIs, alerts, daily briefs |
| Human Approval & Security (3.11) | Phase 1–2 | P0 — approval queue and audit log must exist before any agent runs |
| AI Agent Workforce (3.2) | Phase 3 | Requires Phase 2 security infrastructure first |
| Company Knowledge Base (3.4) | Phase 3–4 | Required for seeding business context into agents |
| Product Portfolio (3.5) | Phase 4 | Register products; manage catalog, demos |
| Company Management (3.3) | Phase 4 | Company records, settings — needed for Business Operations phase |
| Sales & Customer Acquisition (3.7) | Phase 4 | POLICY-BOUND outreach requires Phase 3 agent infrastructure |
| Task Management (3.10) | Phase 4 | Task workflow depends on domain modules existing first |
| Finance & Business Reporting (3.9) | Phase 5 | Requires Ziina webhook; depends on Product and Sales being live |
| Marketing Operations (3.8) | Phase 5 | Requires Phase 3 agents and Phase 4 content types |
| Software Development Operations (3.6) | Phase 5 | GitHub API integration added when other modules are stable |

**Rule:** No empty module directory is created before its phase. Build what is needed; add the next module when its phase begins.

---

## 4. Architecture Layers

The platform follows a strict layered dependency model. Inner layers never depend on outer layers.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PRESENTATION                                                        │
│  Next.js App Router — Server Components, Client Components,          │
│  Server Actions, Dynamic Routes per domain                           │
├─────────────────────────────────────────────────────────────────────┤
│  APPLICATION                                                         │
│  API Routes (/api/**), Server Actions — orchestrate use cases        │
│  No business rules here. Coordinate Domain + Services.               │
├─────────────────────────────────────────────────────────────────────┤
│  DOMAIN / BUSINESS RULES                                             │
│  One module per platform domain. Framework-agnostic TypeScript.      │
│  State machines, invariants, approval policies, agent definitions.   │
├─────────────────────────────────────────────────────────────────────┤
│  SERVICES                                                            │
│  Typed interfaces for all external capabilities:                     │
│  IEmailService, IAIProvider, IStorageService, IPaymentService, etc. │
├─────────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                                      │
│  Concrete implementations: Drizzle/Neon, Cloudflare R2,             │
│  Resend, Anthropic SDK, Ziina, GitHub API                            │
├─────────────────────────────────────────────────────────────────────┤
│  EXTERNAL PROVIDERS                                                  │
│  Neon · Cloudflare · Anthropic · Resend · Vercel · GitHub · Ziina   │
└─────────────────────────────────────────────────────────────────────┘
```

**Rules (non-negotiable):**
- Dependencies point inward only: Presentation → Application → Domain → Services → Infrastructure → External
- No browser-to-database calls. All data access is server-side.
- No business logic in API routes. Routes coordinate; domain modules decide.
- Secrets are injected by the platform (Vercel env vars). Never in source code.

---

## 5. Technology Stack (Independent Evaluation)

Each technology is chosen on its merits for this project. No choice is made because V1 used it.

| Technology | Why it fits this project | Main alternative | Cost | Complexity | Security | Vendor risk | Status |
|---|---|---|---|---|---|---|---|
| **Next.js (App Router, TypeScript)** | Strong server/client boundary prevents credential exposure; TypeScript eliminates runtime errors; App Router has clean file-based routing for a large internal application; server components fetch data server-side only | Remix — similar server-first model; slightly better streaming primitives | Free; open source | Medium — App Router has learning curve | Server components enforce server-side data access; `NEXT_PUBLIC_*` convention makes secrets visible | Medium — optimized for Vercel; self-hosting possible | PROPOSED |
| **Auth.js v5 (NextAuth)** | Maintained; Next.js-native; session management entirely server-side; supports credentials provider for email+password; no third-party session storage required | Lucia Auth — lighter, more manual; Clerk — fully managed, $25+/month, vendor lock-in | Free (self-hosted); open source | Medium — session configuration has complexity | Established security model; bcrypt hashing; no browser-accessible session storage | Low — open source, self-hosted | PROPOSED |
| **Drizzle ORM** | Type-safe SQL without abstraction magic; migration-based schema management; works with Neon's connection pooler; lightweight runtime | Prisma — popular, heavier runtime, more abstraction; Kysely — pure query builder, no schema management | Free; open source | Low — straightforward TypeScript API | No runtime injection risk via type system; explicit queries | None — open source | PROPOSED |
| **Neon PostgreSQL** | Serverless PostgreSQL; branch-based dev/preview/production workflow from one project; standard PostgreSQL compatibility means no vendor lock-in for data | Supabase — PostgreSQL plus BaaS extras (overkill for internal tool); Railway — simpler ops, $5/month base | **PENDING VERIFICATION** — free tier reported as 1 project, 10 branches, 0.5 GB RAM, 10 GB storage. Verify actual account plan before recommending strategy. | Low — standard PostgreSQL | TLS enforced; standard PostgreSQL authentication | Medium — startup; data portability via standard pg_dump | PROPOSED — pending account verification |
| **Cloudflare R2** | S3-compatible object storage; existing account; zero egress fees (unlike S3); bucket isolation is straightforward | AWS S3 — industry standard, egress costs; Vercel Blob — simpler API, $0.023/GB | **PENDING VERIFICATION** — free tier reported as 10 GB storage. Verify actual account usage. | Low — standard S3 API | Access key auth; no public access by default; bucket policy controls | Low — existing account; standard S3 API for portability | PROPOSED |
| **Anthropic API (Claude)** | Required for AI agent workforce; Claude models (Haiku/Sonnet) support tool use and structured output; reliable for complex reasoning tasks | OpenAI GPT-4o — comparable capability; Google Gemini — free tier available, useful as fallback | **PENDING VERIFICATION** — pricing changes frequently. Verify current Claude Haiku, Sonnet pricing. | Low — HTTP API | API key auth; no user data retained server-side | Medium — single provider; Gemini as fallback | PROPOSED |
| **Resend (email)** | Existing account; dedicated email delivery; simple API; supports custom domains for DKIM/SPF | Postmark — similar; SendGrid — complex, free tier available | **PENDING VERIFICATION** — free tier reported as 3,000 emails/month, 100/day. Verify account plan, usage, and sender domain status. Do not change email configuration during planning. | Low | DKIM/SPF via domain configuration | Low — existing account | PROPOSED — pending verification |
| **Vercel (deployment)** | Zero-config Next.js deployment; preview URLs per branch; env var management; existing account | Railway — more flexible, $5/month base; Render — similar | **PENDING VERIFICATION** — Hobby plan reported as free with no project count limit, but bandwidth and function limits apply. Verify current account and project count. | Low — GitHub integration | HTTPS auto-provisioned; server env vars never reach browser | High — Next.js deeply optimized for Vercel; self-hosting is significantly more complex | PROPOSED — pending account verification |
| **Ziina** | UAE/AED payment processing; existing merchant setup; AED invoicing | Stripe — global, more features; Telr — UAE alternative | **PENDING VERIFICATION** — verify current merchant account status and transaction fee rate | Low | Webhook HMAC verification; PCI handled by Ziina | Medium — UAE-regional | PROPOSED |
| **GitHub** | Standard version control; free for unlimited private repos; GitHub Actions CI free tier (2,000 minutes/month) | GitLab — self-hostable; Bitbucket — similar | Free for the organization's existing account | Low | Branch protection; secret scanning available | Low — industry standard | PROPOSED |
| **Vitest** | Fast TypeScript-native test runner; works without compilation overhead; excellent for domain logic unit tests | Jest — popular, more ecosystem; Playwright (for E2E, separate layer) | Free; open source | Low | N/A (testing tool) | Low — open source | PROPOSED |

**All technology choices are PROPOSED and require CEO approval before implementation begins.**

---

## 6. Authentication & Authorization Model

The new platform is an **internal tool**. There is no public registration.

**User types:**

| Role | Access | Description |
|---|---|---|
| `ceo` | All modules, all actions | Founder/CEO — no restrictions |
| `staff` | Assigned modules only | Future team members, limited scope |
| `agent` | Programmatic write-access to task queue and outputs only | AI agents acting on behalf of the platform |

**Rules:**
- Auth.js v5, Credentials provider (email + password, bcrypt hashed)
- Session carries `role`, `userId` — never trusted from client payload
- All routes under `/` require authentication (no public portal)
- Every consequential action checks role server-side before executing
- Agent actions use a separate API key mechanism, not user sessions

---

## 7. AI Agent Architecture

### 7.1 Three Permission Levels (CEO-Confirmed 2026-11-21)

Every agent action is classified into exactly one of three permission levels. No agent may change its own permission level.

**AUTONOMOUS** — Executes and applies without human review
- Generating draft text, reports, summaries for internal records
- Analyzing data and producing structured output
- Discovering and enriching prospect data from public sources
- Scoring and classifying leads
- Generating daily/weekly company briefs
- Running status checks and QC reports

**POLICY-BOUND** — Executes within defined policies; applies if within policy limits
- Sending standard outreach emails within approved templates, within daily volume limits, to opted-in or verified prospect lists
- Queuing content for social publishing within approved campaign parameters
- Scheduling tasks and reminders
- Updating project status records
- Triggering pre-approved workflows within defined parameters
- Routine notifications to internal stakeholders

The boundary: when a POLICY-BOUND action would exceed a policy limit or no matching policy applies, the action escalates to CEO-ONLY.

**CEO-ONLY** — Never executes without an explicit human approval record. Any agent action in this category that proceeds without an approval record in `security.approvals` is a code defect — not a configuration choice.
- Financial transactions — invoices, payments, expense commitments
- Legal commitments — contracts, terms, agreements
- Ownership and strategic decisions
- Security-critical changes — credentials, permissions, access
- Mass communications exceeding policy limits
- Irreversible actions — deletions, decommissions, DNS changes
- Any new external service account or subscription

### 7.2 Agent Startup State and Emergency Stop

**Initial state: agents disabled.** The database seed sets `system.settings.agent_emergency_stop = true`. All agent dispatch is blocked from the moment the platform starts. This is not a temporary state to be cleared during deployment — it is the deliberate safe initial state.

**Agent activation checklist (Phase 2 gate — CEO completes before enabling agents):**
1. Agent permissions configured in `/security`
2. At least one execution policy defined and reviewed
3. Audit logging verified: test actions appear correctly in `audit_events`
4. Emergency stop tested end-to-end: set true → confirm no dispatch; set false → confirm dispatch resumes
5. CEO explicitly sets `agent_emergency_stop = false` via `/security` toggle

**Programmatic enforcement requirements (planning specification):**
- Activation is server-side only. The `/security` toggle calls a server action; no client-trusted state can influence the prerequisite check.
- The activation server action checks every prerequisite before changing `agent_emergency_stop`. If any prerequisite is unmet, the action rejects and returns the specific unmet condition. The flag does not change. The rejection is written to `audit_events`.
- There is no application code path — no API route, no server action, no domain function — that sets `agent_emergency_stop = false` without the full prerequisite check running. This is a design requirement for the domain layer.
- When `agent_emergency_stop = true`, no task record is created for a dispatch attempt. The executor rejects at the first check, before any queue entry is written.

**Required tests for the activation gate (Phase 2 and Phase 3):**
- **Activation rejected**: activation server action called with one or more prerequisites unmet → action rejects; `agent_emergency_stop` remains `true`; rejection event written to `audit_events`
- **No bypass path**: all server actions and API routes touching `system.settings.agent_emergency_stop` are enumerated in test; none set it to `false` without the prerequisite check
- **Dispatch blocked**: with `agent_emergency_stop = true`, any task dispatch call returns rejection; no `agent_tasks` record is created; rejection event written to `audit_events`

**Runtime behavior when `agent_emergency_stop = true`:**
- No new tasks are dispatched regardless of permission level
- Running agents that observe the stop must not initiate any new external side effect
- External operations already in flight may have uncertain outcomes; they must be handled via idempotency keys and reconciliation — the system cannot assume a mid-flight step safely completes or that the operation can always be cancelled
- Halt events and unresolved in-flight operations are recorded in `audit_events` with timestamp and actor for CEO review
- The CEO toggles this in `/security`
- All state changes logged to `audit_events` with timestamp and actor

**Do not confuse:** An emergency stop mechanism existing in the platform is not authorization to start agents. Agents do not run until the CEO completes the activation checklist above and sets the flag to `false`.

### 7.3 Agent Contract

Agents are typed TypeScript modules following a defined contract:

```typescript
interface AgentDefinition<TInput, TOutput> {
  id: string                             // e.g. "sales.lead.discover"
  name: string
  domain: PlatformDomain
  permissionLevel: 'AUTONOMOUS' | 'POLICY_BOUND' | 'CEO_ONLY'
  inputSchema: ZodSchema<TInput>
  outputSchema: ZodSchema<TOutput>
  policyCheck?: (output: TOutput, policy: AgentPolicy) => boolean  // for POLICY_BOUND
  execute: (input: TInput, context: AgentContext) => Promise<TOutput>
}
```

**Execution model:**
1. Executor checks `agent_emergency_stop` flag — if true, task is not dispatched
2. Task is queued with input, metadata, and permission level recorded
3. Agent executes — calls AI API, processes results
4. Output is written to `agent_outputs` table with status `STAGED`
5. AUTONOMOUS: auto-applies if output passes content safety check
6. POLICY_BOUND: applies if output is within policy limits; otherwise surfaces for review
7. CEO_ONLY: always surfaces in CEO Command Center and Approval queue — never auto-applies
8. Human approves/rejects → action executes or is discarded
9. All steps written to audit log

---

## 8. Database Architecture

One PostgreSQL instance (Neon), multiple schemas:

| Schema | Tables | Owner module | Phase |
|---|---|---|---|
| `system` | idempotency_keys, audit_events, settings (`agent_emergency_stop` seeded `true`) | System-wide | Phase 1 — created first |
| `identity` | users, sessions, roles | Auth | Phase 1 |
| `command` | kpis, alerts, daily_briefs | CEO Command Center | Phase 2 |
| `agents` | agent_definitions, agent_tasks, agent_outputs | AI Agents | Phase 3 |
| `knowledge` | articles, documents, research_items, decisions | Knowledge Base | Phase 3–4 |
| `products` | service_catalog, pricing_tiers, demos, delivery_standards | Products | Phase 4 |
| `sales` | leads, lead_sources, outreach_messages, proposals, opt_outs | Sales | Phase 4 |
| `tasks` | tasks, workflows, workflow_steps, automation_rules | Tasks | Phase 4 |
| `finance` | invoices, payments, expenses, financial_snapshots | Finance | Phase 5 |
| `marketing` | campaigns, content_items, publishing_queue, analytics_snapshots | Marketing | Phase 5 |

**Rule:** A schema is created only when its phase begins. Do not create empty schemas ahead of time.

**Design patterns (implemented fresh — not copied from V1):**
- CAS (Compare-And-Swap) state transitions with `WHERE status = 'EXPECTED'` — prevents race conditions on status columns
- Idempotency keys on all external operations and webhooks — prevents duplicate processing
- Append-only audit_events table — never updated, never deleted — tamper-evident log
- All foreign keys reference `identity.users.id` or domain-local records

These are well-established engineering patterns, not V1 innovations. They are implemented fresh.

---

## 9. Security Baseline

These rules apply to all code, all modules, forever:

1. **No server-side logic in browser code.** `NEXT_PUBLIC_` variables contain no secrets.
2. **Server-side authorization on every request.** UI hiding is never authorization.
3. **Webhook handlers verify HMAC signatures before processing.**
4. **Idempotency keys guard all external mutations.**
5. **Audit log is append-only.** No delete or update operations on `audit_events`. Ever.
6. **Approval gates cannot be bypassed programmatically.** Only a human approval record in `security.approvals` advances a CEO-ONLY action.
7. **CEO-ONLY agent outputs are always staged.** Auto-apply is a code defect for this permission level.
8. **Test mode flags are `true` by default.** (`SALES_OUTREACH_TEST_MODE=true`, `ZIINA_TEST_MODE=true`). Changing either to `false` requires explicit CEO authorization.
9. **Agents are disabled by default.** `system.settings.agent_emergency_stop` is seeded as `true`. No agent task dispatches until the CEO completes the Phase 2 activation checklist and explicitly enables agents. This flag is then enforced before every task dispatch at runtime.
10. **No secrets in Git history.** `.env.local` is gitignored. Never commit credentials.
11. **Financial records are created by domain logic, never by agents directly.**
12. **No database credentials shared between the new platform and V1.**
13. **No API keys shared between the new platform and V1.** Separate keys per platform.

---

## 10. What Requires CEO Approval Before Implementation Begins

See DREXONYX_MASTER_BLUEPRINT.md, Part XI for the complete CEO Decision Sheet (D1–D11) and Part XII for the full approval requirements.

**Required before creating the `drexonyx-platform` repository (Phase 1 — System A):**

| Decision | Item | Status |
|---|---|---|
| D1 | Confirm company direction | CEO CONFIRMED (2026-11-21) — see Master Blueprint Part II and Part XIII |
| D7 | Neon account plan and strategy | PENDING VERIFICATION |
| Technology stack | Approve or redirect Section 5 recommendations | PENDING CEO DECISION |

**Does not block Phase 1 System A work:**

| Decision | Item | Note |
|---|---|---|
| D4 | Public website strategy | Blocks System B work only; CEO Command Center (System A) is a separate deployment |
| D2 | MDA sub-brand direction | No Phase 1–3 component depends on this; needed by Phase 4 (Knowledge Base seeding) |
| D8 | Resend sender domain status | Phase 4 prerequisite only; not needed until outreach begins |
| D6 | Stripe account existence | Phase 4+ prerequisite only |

**Technology stack:** The stack listed in Section 5 above is PROPOSED. Claude recommends it based on independent evaluation. CEO may approve it as proposed, modify choices, or request additional information before approving.

---

*Document version: 3.4 — Revised 2026-11-22 by Claude Code*  
*Source of authority: DREXONYX_MASTER_BLUEPRINT.md v3.4*  
*Supersedes: v3.3 (Section 7.2 runtime behavior stated "Running tasks complete their current step and halt before the next" — corrected: running agents must not initiate new external side effects after stop is observed; in-flight operations may have uncertain outcomes and must be handled via idempotency keys and reconciliation)*
