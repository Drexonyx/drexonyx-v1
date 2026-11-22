# DREXONYX — Cost & Infrastructure Plan

**Document version:** 3.3 (revised 2026-11-22)  
**Previous version:** 3.2 (D-ID numbering errors: Section 3.4 cited D5 for Stripe — D5 is active lead data, D6 is Stripe; Section 3.5 cited D8 for Fleet Tracker — D8 is Resend sender domain, D9 is Fleet Tracker; Section 6 table Stripe row cited D5 and Fleet Tracker row cited D8 — same errors; Section 7 infrastructure diagram had broken ASCII art for the 10-schemas line; Section 10 "under $20/month total" statement lacked ILLUSTRATIVE caveat)  
**Prepared by:** Claude Code  
**Status:** PHASE 0 — DOCUMENTATION COMPLETE, CEO APPROVAL PENDING  
**Authority:** Derives from DREXONYX_MASTER_BLUEPRINT.md v3.3  
**Note:** All cost figures and plan limits are estimates from public documentation. UNVERIFIED figures must be confirmed against actual account dashboards before committing to any infrastructure strategy.

---

## 1. Design Principle: Minimize Operating Cost

The new platform uses existing infrastructure where the accounts are already in place. No new paid services are introduced without a clear business case and CEO approval. Free tiers are used before any paid upgrade. Existing accounts do not automatically mean the same plan limits apply — each must be verified against the actual account dashboard.

**Cost rule:** Every line item below must justify its cost with a specific business outcome. Generic "nice to have" services are excluded.

### Cost Claim Labels

Every cost figure and plan limit in this document carries one of these labels:

| Label | Meaning |
|---|---|
| **CONFIRMED — DASHBOARD** | Verified directly from the account dashboard in this session |
| **FREE TIER AVAILABLE** | Provider publicly offers a free tier; this account's actual plan and eligibility have NOT been confirmed |
| **PENDING VERIFICATION** | Must be checked against the actual account dashboard before this figure can be used in planning |
| **ILLUSTRATIVE** | A usage estimate based on stated assumptions — not a forecast or commitment |
| **UNVERIFIED** | Taken from public documentation or pricing pages; may have changed |

**No cost figure in this document is CONFIRMED — DASHBOARD.** All figures are either FREE TIER AVAILABLE, PENDING VERIFICATION, UNVERIFIED, or ILLUSTRATIVE. Do not publish a fixed monthly total or commit to any infrastructure strategy until the PENDING VERIFICATION items are confirmed.

---

## 2. Existing Infrastructure (Already Paid / Free)

### 2.1 GitHub
- **Account:** `drexonyx` organization
- **Plan:** Free (GitHub Free for organizations)
- **What's included:**
  - Unlimited public and private repositories
  - GitHub Actions: 2,000 minutes/month on hosted runners (more than sufficient)
  - Dependabot
  - Basic CI/CD
- **New platform need:** One additional private repository (`drexonyx-platform`)
- **Additional cost:** $0
- **Upgrade trigger:** If team grows to > 3 developers collaborating on private repos simultaneously

### 2.2 Vercel
- **Account:** Existing (`drexonyx.studio@gmail.com`)
- **Plan:** Hobby (free) — **PENDING VERIFICATION** — verify current project count and that Hobby plan accommodates one more project
- **What's included (UNVERIFIED — verify against current Vercel dashboard):**
  - Unlimited deployments (reported)
  - 100 GB bandwidth/month (reported)
  - Serverless functions (100 GB-hours/month reported)
  - Preview deployments
  - Custom domain
- **New platform need:** One additional Vercel project for `drexonyx-platform`
- **Limitation on free plan (UNVERIFIED):** Only 1 member (no team collaboration), no password protection for preview URLs
- **Additional cost:** $0 (pending verification)
- **Upgrade trigger (Vercel Pro at $20/month):**
  - Team members need Vercel access
  - Preview URL password protection needed
  - Bandwidth exceeds Hobby plan limits

### 2.3 Neon PostgreSQL
- **Account:** Existing
- **Plan:** Free tier — **PENDING VERIFICATION** — verify current plan tier and actual project count against Neon dashboard
- **What's included (UNVERIFIED — verify against current Neon dashboard):**
  - 10 GB storage (reported)
  - 10 GB transfer/month (reported)
  - 0.5 GB RAM (reported)
  - 1 project, 10 branches (reported)
- **New platform need:** Second database project for `drexonyx-platform`
- **Free tier constraint (PENDING VERIFICATION):** If the free tier allows only 1 project, the new platform needs a separate strategy. CEO must decide after account is verified:
  - Option A: Create a second Neon account (free) for the new platform — $0
  - Option B: Upgrade existing Neon account to Launch ($19/month) for unlimited projects on one account
  - Option C: Use separate PostgreSQL schemas within the existing Neon project — not recommended (risks proximity to V1 production data; schema separation is not isolation)
- **Recommendation (after verification):** Option A (second free account) — upgrade when database grows > 8 GB
- **Additional cost:** $0 (Option A) or $19/month (Option B)
- **Upgrade trigger:** Data exceeds free tier storage, or RAM constraints cause slow queries

### 2.4 Cloudflare
- **Account:** Existing
- **Services in use:** Cloudflare R2 (object storage), DNS, possibly Workers
- **R2 Free tier (UNVERIFIED — verify against current Cloudflare dashboard):**
  - 10 GB storage/month (reported)
  - 1 million Class A operations/month (writes, lists, deletes) (reported)
  - 10 million Class B operations/month (reads) (reported)
- **New platform need:** Second R2 bucket for `drexonyx-platform` assets (documents, images)
- **Additional cost:** $0 (well within free tier for internal platform)
- **Upgrade trigger:** Storage exceeds 8 GB or operations exceed free tier limits

### 2.5 Resend (Email)
- **Account:** Existing
- **Plan:** Free tier — **PENDING VERIFICATION** — verify current plan limits, monthly usage, and whether sender domain is configured
- **What's included (UNVERIFIED — verify against current Resend dashboard):**
  - 3,000 emails/month, 100/day (reported)
  - Verify: is a sender domain (e.g. drexonyx.com) already verified for DKIM/SPF? This is required before the new platform uses Resend for outreach.
  - Verify: current monthly email usage (V1 may already be consuming part of the quota)
- **Do not change email configuration during planning phase.**
- **New platform need:** Shared account; new API key
- **Additional cost:** $0 (pending verification)
- **Upgrade trigger (Resend Pro at $20/month):** Outreach volume exceeds free tier limits

### 2.6 Domain
- **Domain:** `drexonyx.com` (existing, already registered and paid)
- **New platform:** Subdomain `platform.drexonyx.com` or `app.drexonyx.com` — no additional cost
- **DNS:** Managed via Cloudflare (included)
- **Additional cost:** $0

---

## 3. Variable / Pay-Per-Use Costs

These costs scale with usage and have no fixed monthly floor.

### 3.1 Anthropic API (Claude)

The new platform's AI Agent Workforce runs on Claude. Cost depends on which model and how many tasks run per month.

| Model | Input | Output | Recommended Use | Status |
|---|---|---|---|---|
| Claude Haiku 3.5 | $0.80/MTok | $4.00/MTok | High-volume, simple tasks (lead scoring, brief summaries) | UNVERIFIED — pricing changes |
| Claude Sonnet 4.5 | $3.00/MTok | $15.00/MTok | Standard agents (lead discovery, outreach draft, daily brief) | UNVERIFIED — pricing changes |
| Claude Opus 4.5 | $15.00/MTok | $75.00/MTok | Complex reasoning — use only for critical decisions, not routine tasks | UNVERIFIED — pricing changes |

**Verify current pricing:** Anthropic changes model pricing regularly. Verify actual current prices at the Anthropic console before using these figures in any budget planning.

**Estimated monthly usage (Phase 1–4, light usage) — ILLUSTRATIVE ONLY:**
- 50 agent tasks/month × 2,000 tokens average input + 1,000 tokens output = ~150,000 tokens/month
- Rough estimate at reported Sonnet pricing: ~$2–3/month
- Rough estimate at reported Haiku pricing: ~$0.50–1/month

**Estimated monthly usage (Phase 4+, active sales + marketing) — ILLUSTRATIVE ONLY:**
- 500 agent tasks/month × 3,000 tokens average = ~1.5 MTok/month
- Rough estimate using Haiku for routine + Sonnet for complex: ~$3–10/month

**Cost rule:** Always use the cheapest model that produces acceptable quality for the task type. Use Haiku for structured data extraction and scoring; Sonnet for drafting and analysis; Opus only when explicitly required.

**Prompt caching:** Enable Anthropic prompt caching for repeated system prompts. Saves up to 90% on cached tokens. Implement from day one.

### 3.2 Google Gemini API (Fallback)
- **Role:** Secondary AI provider. Used if Anthropic is unavailable or for specific tasks.
- **Cost:** Gemini 2.0 Flash — $0.10/MTok input, $0.40/MTok output (much cheaper than Claude)
- **Estimated use:** Minimal in Phase 1–4. Increases if cost optimization is needed later.
- **Account:** Existing (Google AI Studio)

### 3.3 Ziina (Payments)
- **Role:** UAE payment processing (AED invoices)
- **Fees:** Ziina charges transaction fees (rate from Ziina account — verify exact rate)
- **Estimated:** 2–3% per transaction (verify with Ziina)
- **Cost:** Only incurred on successful payments — directly tied to revenue
- **Additional cost:** $0 fixed; variable per transaction

### 3.4 Stripe (Payment Processing)
- **Role:** V1 had Stripe configured (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in V1 `.env.example`)
- **New platform status:** **PENDING CEO DECISION (D6)** — CEO must confirm:
  - Does a Stripe account exist under DREXONYX?
  - Is Stripe needed in the new platform, or is Ziina sufficient?
  - If Stripe is retained: create new Stripe project credentials for new platform
- **Phase 1–5 cost:** $0 (Stripe charges per-transaction only; no monthly fee)

### 3.5 Expo / EAS (Fleet Tracker Mobile App)
- **Role:** Fleet Tracker is an Expo/React Native app using `drexonyx.studio` Expo account
- **New platform status:** **PENDING CEO DECISION (D9)** — Fleet Tracker is a separate product, not part of new platform
- **EAS Free tier:** 30 builds/month per platform
- **EAS Production ($99/month):** Needed only if publishing to App Store/Play Store with high volume
- **Phase 1–5 cost:** $0 (Fleet Tracker paused during platform build, per recommendation)

### 3.6 Higgsfield AI (AI Video Generation)
- **Role:** Video/image generation (V1 had full integration)
- **New platform status:** **PENDING CEO DECISION** — Only integrated if video production module is rebuilt
- **Phase 1–5 cost:** $0
- **Phase 6+ cost:** Pay-per-generation (varies by model and duration) — only if CEO approves

---

## 4. Monthly Cost Summary

**IMPORTANT — ILLUSTRATIVE FIGURES ONLY.** The totals below assume:
- Neon Option A (second free account) is used — **PENDING VERIFICATION** that a second free Neon account is available and eligible
- Vercel Hobby plan accommodates one additional project — **PENDING VERIFICATION** against Vercel dashboard
- All service tiers remain as described — each must be confirmed against actual account dashboards before committing to any infrastructure strategy

These are usage-based estimates for planning purposes only. Do not treat them as a fixed budget or a commitment.

### Phase 1–2 (Foundation + CEO Command Center) — ILLUSTRATIVE
| Service | Plan | Monthly Cost |
|---|---|---|
| GitHub | Free | $0 |
| Vercel | Hobby | $0 |
| Neon | Free (second account — PENDING VERIFICATION) | $0 |
| Cloudflare R2 | Free tier | $0 |
| Resend | Free tier | $0 |
| Anthropic API | ~50 tasks | ~$2–3 (ILLUSTRATIVE) |
| **Total** | | **~$2–3/month (ILLUSTRATIVE)** |

### Phase 3–4 (AI Workforce + Business Operations) — ILLUSTRATIVE
| Service | Plan | Monthly Cost |
|---|---|---|
| GitHub | Free | $0 |
| Vercel | Hobby | $0 |
| Neon | Free | $0 |
| Cloudflare R2 | Free tier | $0 |
| Resend | Free tier | $0 |
| Anthropic API | ~200 tasks | ~$5–10 (ILLUSTRATIVE) |
| **Total** | | **~$5–10/month (ILLUSTRATIVE)** |

### Phase 5–6 (Expansion + Cleanup) — ILLUSTRATIVE
| Service | Plan | Monthly Cost |
|---|---|---|
| GitHub | Free | $0 |
| Vercel | Hobby | $0 |
| Neon | Free | $0 |
| Cloudflare R2 | Free tier | $0 |
| Resend | Free tier | $0 |
| Anthropic API | ~500 tasks | ~$10–20 (ILLUSTRATIVE) |
| **Total** | | **~$10–20/month (ILLUSTRATIVE)** |

**Note:** These are conservative estimates for internal platform use. All costs scale linearly with agent task volume and email volume. The platform is not a customer-facing SaaS generating high traffic. Actual costs depend on account verification results and CEO decisions on infrastructure strategy.

---

## 5. Upgrade Triggers & Decisions

| Trigger | Current Cost | Upgrade To | New Cost | Decision Needed By |
|---|---|---|---|---|
| Neon hits 8 GB storage OR 2+ devs need same Neon account | $0 | Neon Launch | +$19/month | CEO |
| Vercel team access needed OR preview security required | $0 | Vercel Pro | +$20/month | CEO |
| Resend exceeds 3,000 emails/month | $0 | Resend Pro | +$20/month | CEO (when outreach scales) |
| GitHub Actions CI minutes consistently exceeded | $0 | GitHub Team | +$4/user/month | CEO (when team grows) |
| AI costs exceed $50/month | Variable | Optimize model selection | No upgrade needed | Claude Code to flag |

---

## 6. What Is Not Paid For

The following services are explicitly excluded unless the CEO approves them:

| Excluded Service | Category | Why Excluded |
|---|---|---|
| Notion / Confluence | Knowledge | Built in-platform |
| Jira / Linear / Asana | Tasks | Built in-platform |
| Slack / Teams | Communication | Out of scope |
| HubSpot / Salesforce | CRM | Built in-platform (Sales module) |
| Mailchimp / ActiveCampaign | Email marketing | Resend handles outreach |
| Cloudflare Workers (paid) | Edge compute | Free tier sufficient |
| AWS / GCP / Azure | Cloud infra | Vercel serverless handles all |
| OpenAI API | AI | Anthropic is primary; Gemini is free fallback |
| Stripe | Payments | PENDING CEO DECISION D6 — Ziina primary for UAE; CEO confirms if Stripe needed |
| Figma (paid) | Design | Not needed for internal platform |
| Any analytics SaaS | Analytics | Vercel Analytics (free tier) is sufficient |
| Expo EAS Production ($99/month) | Mobile builds | PENDING CEO DECISION D9 — only if Fleet Tracker resumes |

---

## 7. Infrastructure Diagram

```
                       DREXONYX PLATFORM
                            │
              ┌─────────────┴───────────────┐
              │        Vercel (Free)         │
              │  Next.js App Router          │
              │  Serverless Functions        │
              │  CDN + Preview URLs          │
              └──────┬──────────────┬────────┘
                     │              │
        ┌────────────┘              └──────────────┐
        ▼                                          ▼
┌──────────────────┐                    ┌──────────────────┐
│  Neon PostgreSQL │                    │ Cloudflare R2    │
│  (Free tier)     │                    │ (Object Storage) │
│  All DB schemas  │                    │  Documents       │
│  10 schemas      │                    │  Images          │
└──────────────────┘                    │  Demo assets     │
                                        └──────────────────┘
        
        AI Layer:                       Email:
        ┌──────────────────┐           ┌──────────────────┐
        │ Anthropic API    │           │  Resend          │
        │ (Primary - paid  │           │  (Free tier)     │
        │  per use)        │           │  Outreach +      │
        │                  │           │  Notifications   │
        │ Google Gemini    │           └──────────────────┘
        │ (Fallback - free │
        │  tier)           │           Payments:
        └──────────────────┘           ┌──────────────────┐
                                        │  Ziina           │
        Version Control:               │  (Per-transaction│
        ┌──────────────────┐           │   UAE / AED)     │
        │  GitHub          │           └──────────────────┘
        │  (Free tier)     │
        │  CI/CD Actions   │           DNS / CDN:
        └──────────────────┘           ┌──────────────────┐
                                        │  Cloudflare      │
                                        │  (Free tier)     │
                                        │  drexonyx.com    │
                                        └──────────────────┘
```

---

## 8. Environment Variables per Provider

| Provider | Variables Needed | Security Classification |
|---|---|---|
| Neon | `DATABASE_URL` | Server-only |
| Anthropic | `ANTHROPIC_API_KEY` | Server-only |
| Google Gemini | `GOOGLE_GEMINI_API_KEY` | Server-only |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Server-only |
| Cloudflare R2 | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_PUBLIC_URL` | Server-only (except PUBLIC_URL) |
| Ziina | `ZIINA_API_KEY`, `ZIINA_WEBHOOK_SECRET`, `ZIINA_TEST_MODE` | Server-only |
| GitHub | `GITHUB_TOKEN` | Server-only |
| NextAuth | `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Server-only |
| Public | `NEXT_PUBLIC_APP_URL` | Public (safe) |

**Variables are added in phases, not all at initialization.** Phase 1 starts with 7 variables (identity, database, safety flags, public URL). Phase 2 adds `CRON_SECRET`. Phase 3 adds AI provider keys. Phase 4–5 add provider credentials for Resend, Cloudflare R2, Ziina, GitHub, and others as each service is integrated. The full per-phase breakdown is in `DREXONYX_NEW_PROJECT_STRUCTURE.md`, Section 7 and Section 2.A. All variables are set in Vercel project settings — never in source code.

---

## 9. CEO Decisions Required on Infrastructure

For the complete, authoritative CEO Decision Register, see **DREXONYX_MASTER_BLUEPRINT.md, Part XI (D1–D11)**. That register is the single source of truth. Decision IDs used in this document refer to those same IDs.

Infrastructure-specific decisions referenced from the Master Blueprint register:

| Master Blueprint ID | Infrastructure relevance |
|---|---|
| D7 (Neon strategy) | Determines whether a second free Neon account or a paid upgrade is needed for Phase 1 |
| D6 (Stripe) | Determines whether Stripe credentials are needed in the new platform's `.env.example` |
| D8 (Resend sender domain) | Determines whether Resend is usable for outreach in Phase 4 or requires domain setup first |
| D4 (Public website strategy) | Determines whether V1 Vercel project remains active and whether a new public site Vercel project is eventually added |

**Decisions Claude has already made (no CEO input needed — see Master Blueprint Part XI Section D):**
- Repository name: `drexonyx-platform`
- Platform subdomain: `app.drexonyx.com`
- R2 bucket: new dedicated bucket for new platform
- Test-mode defaults: `SALES_OUTREACH_TEST_MODE=true`, `ZIINA_TEST_MODE=true`

---

## 10. Cost at Scale (Illustrative)

If DREXONYX grows and the platform serves a team of 5 people with heavy AI agent usage:

| Scenario | Monthly AI Cost | Other Costs | Total |
|---|---|---|---|
| Lightweight (5 people, 100 agent tasks/day) | ~$30 | $0–40 (Neon + Vercel Pro if needed) | ~$30–70/month |
| Active (5 people, 500 tasks/day) | ~$150 | $40 | ~$190/month |
| Heavy (10 people, 2,000 tasks/day) | ~$600 | $60 | ~$660/month |

For current Phase 1–4 (1 CEO, 50–200 agent tasks/month): estimated **under $20/month total** (ILLUSTRATIVE — based on stated Anthropic pricing and assumes second free Neon account; actual cost depends on verified provider plans — see PENDING VERIFICATION items above).

---

*Document version: 3.3 — Revised 2026-11-22 by Claude Code*  
*Source of authority: DREXONYX_MASTER_BLUEPRINT.md v3.3*  
*Supersedes: v3.2 (D-ID numbering errors: Section 3.4 cited D5 for Stripe — D6 is correct; Section 3.5 cited D8 for Fleet Tracker — D9 is correct; Section 6 table Stripe row cited D5 — D6 is correct; Section 6 table Expo EAS row cited D8 — D9 is correct; Section 7 diagram had broken ASCII art for schemas box; Section 10 cost total lacked ILLUSTRATIVE caveat)*
