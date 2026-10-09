# MDA — 16-AGENT SYSTEM AUDIT
**Test Project | Dubai Residential Development | 2026-10-09**
**Status: INTERNAL TEST — ISOLATED FROM LIVE CLIENT PROJECTS**

---

## TWO SEPARATE AGENT SYSTEMS FOUND

The repository contains TWO distinct agent systems that must not be confused:

| System | Path | Type | Executable? |
|--------|------|------|-------------|
| DREXONYX Production Agents | `lib/agents/` | TypeScript delegate functions connected to DB + orchestration | Only when server is running with valid DB |
| MDA Conceptual Agents | `master-digital-agency/agents/` | Agent registry + routing logic (definitions, no live tools) | No live tool integrations |

---

## SYSTEM A — DREXONYX V1 PRODUCTION AGENTS (`lib/agents/`)

These are 16 TypeScript `delegate*` functions. They call `delegateSubTask()` which requires a live DB + orchestration runtime. They CANNOT be invoked in isolation during a code session — they produce `{ ok: true; subTaskId }` only when the server is running and the DB is connected.

| # | Agent ID | Primary Responsibility | Initiator Roles | Key Constraints |
|---|----------|----------------------|-----------------|-----------------|
| 1 | `qc-metadata` | Metadata QC for production assets | OWNER, ADMIN_OPERATIONS | Read-only, no financial writes |
| 2 | `prompt-optimize` | Optimize AI prompts for quality | OWNER, ADMIN_OPERATIONS | No external API calls |
| 3 | `production-run` | Execute production job runs | OWNER, ADMIN_OPERATIONS | Approved assets only |
| 4 | `qc-review` | Visual/textual QC review gate | OWNER, ADMIN_OPERATIONS | Blocks delivery on fail |
| 5 | `finance-monitoring` | Monitor financial transactions (read-only) | OWNER, ADMIN_OPERATIONS | NEVER exposes amounts in output |
| 6 | `reporting` | Operational reports (read-only) | OWNER, ADMIN_OPERATIONS | No financial data exposed |
| 7 | `analytics` | Intelligence reports (read-only, deterministic) | OWNER, ADMIN_OPERATIONS | No LLM predictions, no benchmarks |
| 8 | `communication` | Draft/coordinate client communications | OWNER, ADMIN_OPERATIONS | No autonomous sending |
| 9 | `lead-hunter` | Read lead pipeline, classify, alert | OWNER, ADMIN_OPERATIONS | READ ONLY; no outreach; no contact_email in output |
| 10 | `website-production` | Plan/produce websites, landing pages | OWNER, ADMIN_OPERATIONS | No financial mutations |
| 11 | `site-audit` | DREXONYX website audits | OWNER, ADMIN_OPERATIONS | Read-only |
| 12 | `marketing-campaign` | Facebook campaign workflow (QC → publish) | OWNER, ADMIN_OPERATIONS | Organic only; no paid ads; mediaUrl must be R2 |
| 13 | `direct-facebook-publish` | Direct Facebook publish (zero-AI path) | OWNER, ADMIN_OPERATIONS | Skips AI QC; HUMAN_GATE on EXTERNAL content |
| 14 | `sales-discovery` | Lead discovery → qualify → outreach draft → follow-up schedule | OWNER, ADMIN_OPERATIONS | No external API calls; PII boundary; standard cold email auto-approved |
| 15 | `whatsapp-inquiry` | WhatsApp inquiry routing | OWNER, ADMIN_OPERATIONS | No autonomous messaging |
| 16 | `autonomous-campaign` | Autonomous campaign coordination | OWNER, ADMIN_OPERATIONS | Constrained by DR records |

**Coordination mechanism:** Agents do NOT call each other directly. Each calls `delegateSubTask()` which creates a sub-task in the orchestration DB. The parent orchestrator polls sub-task state. There is NO peer-to-peer delegation — coordination must be sequenced by the caller.

**Scope of these agents:** These agents operate exclusively on DREXONYX's own business (its FB pages, its leads pipeline, its production jobs). They are NOT general-purpose research or client-project agents.

---

## SYSTEM B — MDA CONCEPTUAL AGENTS (`master-digital-agency/agents/`)

18 agent IDs defined in `AGENT_REGISTRY`. The Agency Director (`agency-director.ts`) implements a keyword-scoring router. These define WHAT should happen, not HOW — no live tool integrations exist.

| # | Agent ID | Group | Primary Responsibilities |
|---|----------|-------|--------------------------|
| 1 | `agency-director` | core | Route requests, coordinate, approve, surface next action |
| 2 | `research-intelligence` | core | Market research, competitor analysis, opportunity scoring |
| 3 | `market-opportunity` | core | Convert research to commercial recommendations |
| 4 | `offer-pricing` | core | Service packaging, pricing, Fiverr gig concepts |
| 5 | `lead-opportunity` | acquisition | Find and track client opportunities |
| 6 | `client-qualification` | acquisition | Evaluate client fit, recommend accept/decline |
| 7 | `client-communication` | acquisition | Draft client messages, proposals, follow-ups |
| 8 | `project-manager` | acquisition | Tasks, milestones, dependencies, blockers |
| 9 | `web-production` | production | Websites, landing pages (W2 workflow) |
| 10 | `app-digital-production` | production | Web apps, mobile apps, UI/UX prototypes |
| 11 | `brand-design-production` | production | Logos, branding, creatives, presentations (W3 workflow) |
| 12 | `video-creative-production` | production | Scripts, storyboards, short-form video (W4 workflow) |
| 13 | `content-copy` | production | Captions, copy, content calendars |
| 14 | `social-media-campaign-director` | production | Social strategy, content pillars, W5/W6 workflows |
| 15 | `qc-director` | control | Visual, textual, functional QC gates |
| 16 | `delivery-client-success` | control | Client handoff, revisions, feedback |
| 17 | `analytics-performance` | control | Campaign and content performance measurement |
| 18 | `agency-reporting` | control | Executive agency reports, W10 workflow |

**Agency Director routing for this test project:**
- Input keywords: "market research competitor analysis digital marketing plan instagram facebook youtube residential building dubai"
- Matched routes: W7 (research, market, competitor, analysis, intelligence) + W5 (social, campaign, instagram, facebook)
- Primary: `research-intelligence` (W7) — highest score
- Secondary: `social-media-campaign-director` (W5)
- Supporting: `market-opportunity`, `content-copy`
- `requiresOwnerApproval: false` (no publish/spend keywords)

**Strongest orchestrator:** `agency-director` — it is the only agent with routing + project state logic. It does not execute tasks itself; it assigns agents and enforces approval gates.

**Inter-agent delegation:** MDA agents are definitions only. In this session, Claude Code acts as the orchestrator and executes each agent's documented responsibilities using available tools (WebSearch, file writes).

---

*Phase 1 complete. See PHASE2_DELIVERABLES/ for test project execution.*
