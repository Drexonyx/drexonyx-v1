# DREXONYX — Legacy Preservation Plan & Resource Classification

**Document version:** 3.0 (revised 2026-11-21)  
**Previous version:** 2.0 (auto-classified V1 repo and demo sites as permanent KEEP; auto-retired research files; lacked PENDING VERIFICATION category)  
**Prepared by:** Claude Code  
**Status:** DRAFT — AWAITING CEO REVIEW AND APPROVAL  
**Authority:** Derives from DREXONYX_MASTER_BLUEPRINT.md v2.0

---

## 1. Purpose

This document classifies every identified DREXONYX asset, external service, and V1 codebase component into one of six categories. It is the operational companion to the Master Blueprint's resource inventory (Part VII).

**No action — no deletion, archival, reconfiguration, or cleanup — may be taken until the CEO reviews and approves Phase 6, with individual sign-off on each item.**

---

## 2. The Six Classification Categories

| Category | Meaning | Action timing |
|---|---|---|
| **KEEP** | Retain exactly as-is. Already suitable for the new company. | No action needed |
| **KEEP BUT RECONFIGURE** | Retain the account; create new project/bucket/key/credentials for the new platform. | Phase 1 — set up new credentials only |
| **REFERENCE ONLY** | Historical information useful for decisions. Must not be imported into or connected to the new application. | No action needed |
| **REBUILD** | The concept or capability is valuable; it must be rewritten fresh in the new platform. | Per-phase as roadmap specifies |
| **RETIRE** | No longer needed. Can eventually be removed after CEO individual sign-off. | Phase 6 only |
| **PENDING CEO DECISION** | Current value or dependencies not fully established. CEO must decide before any action — including retirement. | CEO determines timing |
| **PENDING VERIFICATION** | Classification depends on data not yet confirmed (e.g. account plan details). | Verify first, then classify |

**Important:** No resource is classified as RETIRE without understanding its dependencies. Many resources below that might appear disposable depend on active services (V1 is live; demo sites are deployed). These are PENDING CEO DECISION until the CEO confirms the dependencies are resolved.

---

## 3. External Service Account Classifications

### 3.1 Version Control

| Resource | Classification | Notes |
|---|---|---|
| GitHub organization: `drexonyx` | KEEP | Permanent infrastructure |
| Repository: `drexonyx-v1` | PENDING CEO DECISION | Currently serves the live public website via Vercel. Cannot be deleted while V1 is live. Once V1 is retired and new public site is in place, CEO confirms: archive or delete. |
| New repository: `drexonyx-platform` | (To create in Phase 1) | New platform home |
| V1 GitHub Actions workflows | REFERENCE ONLY | CI/CD patterns reference |
| V1 GitHub Actions secrets | KEEP | V1 operational secrets stay with V1 |

**Protected actions (forbidden without CEO sign-off):**
- Force-push to `drexonyx-v1/main`
- Delete or archive `drexonyx-v1`
- Rotate or delete V1 GitHub Actions secrets

---

### 3.2 Deployment

| Resource | Classification | Notes |
|---|---|---|
| Vercel account (drexonyx.studio@gmail.com) | KEEP | Account is infrastructure |
| Vercel project: V1 → drexonyx.com | PENDING CEO DECISION | Required while V1 is live. Once V1 is retired and new public site is ready, this project can be decommissioned. Timing depends on CEO's public website decision (D4). |
| New Vercel project: `drexonyx-platform` | (To create in Phase 1) | New platform deployment |
| Old Vercel preview deployments (V1) | PENDING CEO DECISION → RETIRE | CEO confirms before cleaning up |

---

### 3.3 Database

| Resource | Classification | Notes |
|---|---|---|
| Neon account (existing) | KEEP | Account is infrastructure |
| V1 Neon project — production database | KEEP — NEVER CONNECT | All V1 data preserved. New platform must never connect to it. |
| V1 Neon branches (dev/preview) | PENDING CEO DECISION | May be useful if V1 investigations are needed. Candidates for deletion once V1 is confirmed retired. |
| New Neon project (new platform) | (To create in Phase 1) | Completely fresh — isolated from V1 |

**Neon Free Tier Constraint:** 1 project per account. CEO Decision D3 required before Phase 1:
- **Option A (Recommended):** Second free Neon account for new platform
- **Option B:** Upgrade existing account to Launch ($19/month)

---

### 3.4 Storage

| Resource | Classification | Notes |
|---|---|---|
| Cloudflare account | KEEP | Account is infrastructure |
| DNS for drexonyx.com | KEEP — DO NOT CHANGE | Primary domain; active SSL |
| R2 bucket (V1 assets — videos, images) | KEEP — NEVER CONNECT | V1 production storage |
| New R2 bucket for new platform | (To create in Phase 1) | Fresh bucket, completely separate |
| Cloudflare Workers (if any) | PENDING CEO DECISION | Verify if any Workers exist first |

---

### 3.5 Email

| Resource | Classification | Notes |
|---|---|---|
| Resend account | KEEP BUT RECONFIGURE | Same account; new API key for new platform |
| Existing Resend API key (V1) | KEEP — DO NOT SHARE | V1 continues using its own key |
| New Resend API key (new platform) | (To generate in Phase 1) | Fresh key, separate from V1 |
| Existing sender domain configuration | PENDING VERIFICATION | Verify: (1) is a sender domain (e.g. drexonyx.com) verified in the account? (2) what is current plan sending limit? (3) what is current monthly usage? Do not change email configuration during planning. |

---

### 3.6 Domain

| Resource | Classification | Notes |
|---|---|---|
| drexonyx.com | KEEP | Primary company domain |
| Any existing subdomains | PENDING CEO DECISION | CEO to confirm which subdomains exist |
| New subdomain: `app.drexonyx.com` | (To create in Phase 1) | New platform URL |

---

### 3.7 AI Providers

| Resource | Classification | Notes |
|---|---|---|
| Anthropic API account | KEEP BUT RECONFIGURE | Same account; generate new API key for new platform |
| Existing ANTHROPIC_API_KEY (V1) | KEEP — DO NOT SHARE | V1 uses its own key |
| Google AI Studio account (Gemini) | KEEP BUT RECONFIGURE | Free tier; same account usable with fresh key |
| Existing GEMINI_API_KEY (V1) | KEEP — DO NOT SHARE | V1 uses its own key |

---

### 3.8 Payment Providers

| Resource | Classification | Notes |
|---|---|---|
| Ziina account | KEEP BUT RECONFIGURE | Same account; fresh credentials for new platform |
| Existing Ziina payment link: `https://pay.ziina.com/drexonyx/Md6AyFJ0z?source=app` | PENDING CEO DECISION | AED 599 MDA website offer link. If MDA operations continue, may still be needed. CEO must confirm (Decision D6). |
| Stripe account | PENDING CEO DECISION | V1 had Stripe (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET in .env.example). Verify account exists. CEO to decide if Stripe is needed in new platform (Decision D5). |

---

### 3.9 Social and Messaging APIs

| Resource | Classification | Notes |
|---|---|---|
| Facebook Graph API access | PENDING CEO DECISION | V1 had Facebook organic publishing. New platform may need it in Marketing Operations (Phase 5). Do not set up until needed. |
| WhatsApp Cloud API | RETIRE from new platform | V1 had inbound WhatsApp. Not in new platform Phase 1–5 scope. CEO confirms retirement at Phase 6. |
| Meta Business Manager access | PENDING CEO DECISION | May be needed for Facebook publishing |

---

### 3.10 Mobile and Device

| Resource | Classification | Notes |
|---|---|---|
| Fleet Tracker source code (`apps/fleet-tracker/`) | PENDING CEO DECISION | Expo/React Native app. Wialon GPS integration. Expo account: `drexonyx.studio`. Bundle ID: `com.drexonyx.fleettracker`. Treated as a separate product. |
| Expo account (drexonyx.studio) | PENDING CEO DECISION | Required for Fleet Tracker builds |
| Wialon GPS API access | PENDING CEO DECISION | GPS tracking platform required by Fleet Tracker |
| Android project — android-project/ | PENDING CEO DECISION | Native Android project |
| Android project — android-official/ | PENDING CEO DECISION | Official release variant |
| Android project — android-play/ | PENDING CEO DECISION | Google Play store variant (includes store listing materials) |
| android-apk/ debug builds | RETIRE (eventually) | Debug APKs; not production releases |
| Google Play Developer account | PENDING CEO DECISION | Required if Android apps are published |

**Recommendation:** Pause Fleet Tracker and all Android native development during Phases 1–5. CEO to restart as separate product workstreams when ready.

---

## 4. V1 Codebase Asset Classifications

### 4.1 Application Code (REFERENCE ONLY — no imports)

All V1 application code is classified as **REFERENCE ONLY**. No file, function, or module from V1 may be copied into the new platform. The patterns and concepts are valuable; they are rewritten fresh.

| V1 concept | New platform equivalent | Rebuild value |
|---|---|---|
| CAS state transitions | `domain/*/state-machine.ts` | HIGH — rebuild exact pattern |
| Idempotency key pattern | `db/schema/system.ts` | HIGH — rebuild exact pattern |
| Append-only audit events | `db/schema/system.ts` | HIGH — rebuild exact pattern |
| HMAC webhook verification | `app/api/webhooks/**` | HIGH — rebuild exact pattern |
| Test-mode safety flags | `.env.example`, agent executor | HIGH — rebuild exact pattern |
| AI skill contract (input → AI → structured output) | `domain/agents/definitions/` | MEDIUM — apply to new agent definitions |
| Lead funnel state machine | `domain/sales/pipeline.ts` | MEDIUM — fresh schema, same state concept |
| Approval gate for outreach | `domain/security/approval-gate.ts` | HIGH — critical pattern, rebuild |
| Agent dispatch → stage → approve | `domain/agents/executor.ts` | MEDIUM — reference for new executor |

### 4.2 V1 Database Schemas (REFERENCE ONLY)

V1 uses schemas: `core`, `identity`, `commercial`, `production`, `financial`, `system`, `sales`, `ssb`, `orchestration`. These remain in the V1 Neon project. The new platform starts its own schema set with no overlap.

| V1 Schema | Classification | Notes |
|---|---|---|
| `core` | REFERENCE ONLY | V1 core business data |
| `identity` | REFERENCE ONLY | V1 auth data |
| `commercial` | REFERENCE ONLY | V1 commercial records |
| `production` | REFERENCE ONLY | V1 video generation pipeline |
| `financial` | REFERENCE ONLY | V1 financial records |
| `system` | REFERENCE ONLY | V1 audit events, idempotency keys |
| `sales` | REFERENCE ONLY | V1 lead and outreach data |
| `ssb` | REFERENCE ONLY | V1 Social Seller Bot subscription system (not documented in earlier planning) |
| `orchestration` | REFERENCE ONLY | V1 agent orchestration tables |

### 4.3 Five Production Demo Sites (PENDING CEO DECISION)

The five demo sites are currently deployed on Vercel. They represent completed MDA work and may serve as a sales portfolio.

| Demo | Industry | Current status |
|---|---|---|
| Blades & Co | Barbershop | Live on Vercel |
| Vitalis Clinic | Medical / Clinic | Live on Vercel |
| Lumière Studio | Salon | Live on Vercel |
| Zafran & Oud | Restaurant | Live on Vercel |
| Pinnacle Properties | Real Estate | Live on Vercel |

**CEO must decide:** Retain all indefinitely as portfolio assets? Retire specific demos? Retire all? The decision depends on whether MDA continues as a sub-brand (CEO Decision D2) and whether these sites are still presented to prospects.

**Do not retire any demo site without explicit CEO sign-off on that specific site.**

### 4.4 MDA Business Documents (REFERENCE ONLY)

| Asset | Classification | Location in V1 |
|---|---|---|
| MDA Source of Truth & Operating Rules | REFERENCE ONLY | `master-digital-agency/business-development/MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md` |
| MDA Demo Production Standard (T1–T13) | REFERENCE ONLY | `DREXONYX_MASTER_HANDOFF.md` §T |
| MDA Company Profile Production Standard | REFERENCE ONLY | `master-digital-agency/business-development/MDA_COMPANY_PROFILE_PRODUCTION_STANDARD.md` |
| CEO-approved MDA pricing (2026-10-21) | REFERENCE ONLY — HISTORICAL | Requires re-approval for new platform context |
| Dubai company profile pricing research | REFERENCE ONLY — UNVERIFIED | Snippet-based; cannot be used as market evidence |
| Facebook lead generation research | REFERENCE ONLY | Historical outreach research |
| MDA Client Acquisition Plan | REFERENCE ONLY | Historical sales planning |

### 4.5 MDA Completed Deliverables

| Asset | Classification | Notes |
|---|---|---|
| Company Profile v1–v6 (HTML + PDF) | PENDING CEO DECISION | Completed agency work. Value depends on whether MDA continues as a sub-brand. CEO decides: retain as portfolio, archive, or retire. |
| MDA Service Catalog v1–v3 | PENDING CEO DECISION | Same as above. |
| build-catalog-v3.py | REFERENCE ONLY | Python build script; keep for reference if catalog is rebuilt. |

### 4.6 Lead and Prospect Data

| Asset | Classification | Notes |
|---|---|---|
| LEAD_TRACKER.csv | PENDING CEO DECISION | Active leads. Manual review and import to new sales system, or leave as V1 historical record. |
| FLASH_DELIVERY_DUBAI_LEADS.csv / .json | PENDING CEO DECISION | Prospect data. Same decision as above. |
| OVERSEAS_RECRUITMENT_AGENCIES data | REFERENCE ONLY | Research output |
| 25+ root-level research dump files | PENDING CEO DECISION | CEO reviews before classifying as RETIRE. Some may contain useful competitive or market research worth preserving in Knowledge Base. Do not delete without CEO sign-off. |
| FINAL_REJECTION_LOG, FINAL_RFQ, etc. | RETIRE (Phase 6) | Historical outreach artifacts |

### 4.7 V1 Architecture Decision Records (REFERENCE ONLY)

The 103+ ADR documents in `docs/decisions/` record every significant technical decision in V1. They are classified as **REFERENCE ONLY**. The new platform starts its own ADR sequence (Decision #0001 onwards). V1 decisions are historical context, not binding constraints.

---

## 5. Protected Actions — Forbidden Without CEO Sign-Off

The following actions are forbidden at any time, in any phase, without an explicit CEO instruction for that specific action:

| Action | Why Forbidden |
|---|---|
| Delete or archive the `drexonyx-v1` GitHub repository | Destroys all V1 history, 103+ ADRs, and all in-progress sub-projects |
| Drop, modify, or connect to the V1 Neon production database | Destroys live production data; risks data contamination |
| Delete the V1 Cloudflare R2 bucket | Destroys all V1 video and image assets |
| Unpublish or delete the Vercel production deployment for drexonyx.com | Takes the public website offline |
| Force-push to `main` on `drexonyx-v1` | Destroys V1 commit history |
| Revoke or rotate production API keys for V1 | Breaks live production services |
| Delete GitHub Actions secrets in V1 | Breaks the V1 generation polling pipeline |
| Modify DNS for drexonyx.com | Risks taking the public website offline |
| Delete the Cloudflare account or change DNS nameservers | Breaks DNS and SSL for drexonyx.com |
| Delete any demo site from Vercel | Removes MDA portfolio asset without CEO sign-off |

---

## 6. Phase 0 Preservation Checklist

Before Phase 1 begins, the CEO confirms:

- [ ] `git tag v1-legacy-snapshot` created on `drexonyx-v1/main`
- [ ] GitHub branch protection enabled on `drexonyx-v1/main`
- [ ] Vercel production deployment confirmed live at drexonyx.com
- [ ] Neon V1 production database confirmed accessible (no schema changes made)
- [ ] Cloudflare R2 V1 bucket confirmed intact
- [ ] Five demo sites confirmed accessible (barbershop, clinic, salon, restaurant, realestate)
- [ ] `LEAD_TRACKER.csv` and `FLASH_DELIVERY_DUBAI_LEADS` data reviewed — confirm whether active prospects need manual follow-up before new platform is ready (Decision D7)
- [ ] Stripe account status confirmed (Decision D5)
- [ ] CEO has reviewed this document and approved it

---

*Document version: 3.0 — Revised 2026-11-21 by Claude Code*  
*Source of authority: DREXONYX_MASTER_BLUEPRINT.md v2.0*  
*Supersedes: v2.0 (auto-classified V1 repo and demo sites as permanent KEEP; auto-retired research files; lacked PENDING VERIFICATION category; lacked resource type column)*
