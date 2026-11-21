# DREXONYX — Legacy Preservation Plan

**Document type:** Legacy Protection & Asset Inventory — AWAITING CEO APPROVAL  
**Prepared by:** Claude Code  
**Date:** 2026-11-21  
**Status:** DRAFT — Do not execute any archival or deletion action without CEO sign-off

---

## 1. Purpose

This document defines how the existing `drexonyx-v1` repository and all its assets are preserved, what intellectual property is identified for reuse, and what protection measures are in place. No destructive action is recommended at any point.

---

## 2. What the Legacy Platform Is

`drexonyx-v1` is a fully implemented Next.js platform (Phase 21) containing:
- A UGC advertising video production system (admin + client portals)
- An AI generation pipeline (Higgsfield AI)
- An MDA (Master Digital Agency) sales engine
- An MDA demo production and delivery workflow
- 955+ automated tests
- Extensive architecture decision records (ADRs)
- Business development documentation and research
- Five production demo websites
- Three Android project variants
- A Fleet Tracker sub-application

This is a substantial body of work. It must not be deleted or archived without a deliberate, CEO-approved process.

---

## 3. Preservation Actions (Immediate)

### 3.1 Repository Protection — Action Required from CEO

The following must be confirmed with the CEO before any new work begins:

| Action | Who does it | Purpose |
|---|---|---|
| Tag the current state of `main` branch as `v1-legacy-snapshot` | CEO or developer | Permanent immutable reference point |
| Enable branch protection on `main` in GitHub Settings | CEO | Prevent accidental force-pushes |
| Confirm Vercel production deployment is NOT disturbed | CEO | drexonyx.com stays live |
| Confirm Neon database is NOT dropped or modified | CEO | All V1 data is preserved |
| Confirm Cloudflare R2 bucket is NOT touched | CEO | All V1 assets are preserved |

**None of these require code changes. All are GitHub/Vercel/Neon configuration actions.**

### 3.2 Development Isolation

The new platform will be built in a **separate GitHub repository** (`drexonyx-platform` — name subject to CEO approval). The legacy repository `drexonyx-v1` will never be modified as part of new platform development. The two repositories are independent.

---

## 4. Intellectual Property Inventory

### Category A — Preserve and Reuse Directly
*High-confidence reuse. Can be copied or adapted into the new platform without redesign.*

| Asset | Location in V1 | Why Valuable |
|---|---|---|
| MDA Source of Truth & Operating Rules | `master-digital-agency/business-development/MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md` | Complete business rules, pricing, service scope, evidence standards — CEO-approved |
| MDA Company Profile Production Standard | `master-digital-agency/business-development/MDA_COMPANY_PROFILE_PRODUCTION_STANDARD.md` | Full production, QC, and delivery workflow for company profile service |
| MDA Demo Production Standard (T1–T13) | `DREXONYX_MASTER_HANDOFF.md` §T | 13-step commercial workflow for website demo → payment → delivery. CEO-approved. |
| Approved MDA pricing table | `master-digital-agency/business-development/MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md` §5 | Full service price list, CEO-approved 2026-10-21 |
| MDA service catalog | `lib/catalog/mda-services.ts` | Canonical catalog data in code |
| Security patterns (HMAC verification, idempotency keys, audit events) | `app/api/webhooks/`, `db/schema/system.ts`, `lib/agent/` | Proven, production-tested security patterns. Reuse the pattern, not the code. |
| AI agent architecture (dispatch → stage → approve → execute) | `lib/agent/driver.ts`, `lib/agent/terminal.ts` | Proven agent execution model. Reuse the concept. |
| Sales engine skills | `lib/skills/sales/` | 5 AI skills for lead discovery, qualification, scoring, outreach |
| Sales DB schema | `db/schema/sales.ts` | Well-designed relational schema for the sales funnel |
| Outreach approval policy logic | `lib/sales/queries.ts` | Defines which outreach requires human approval |
| Ziina payment integration | `lib/ziina.ts` | UAE-specific, AED, proven |
| Environment variable security model | `ARCHITECTURE.md` §3, `DREXONYX_MASTER_HANDOFF.md` §E | Security classification of all env vars |
| NextAuth v5 dual-portal pattern | `auth.ts`, `auth.config.ts` | CAS-safe session model |

### Category B — Preserve for Reference, Rebuild Cleanly
*Valuable knowledge, but the code or structure should be redesigned for the new platform.*

| Asset | Location in V1 | Note |
|---|---|---|
| Generation pipeline concept | `lib/agent/driver.ts`, `lib/admin/automated-pipeline.ts` | The pattern (fire → webhook → materialize → QC → approve) is sound. The specific Higgsfield implementation can be rebuilt cleaner. |
| Admin portal UI structure | `app/admin/` | 30+ admin sub-routes. UI patterns are good reference but new platform has different modules. |
| Drizzle ORM schema patterns | `db/schema/` | CAS state machines, schema separation, RLS SQL — rebuild using same patterns. |
| Email templates and opt-out system | `lib/email/`, `lib/sales/outreach-sender.ts` | Email structure is good. Rebuild for new platform's email module. |
| Facebook publish skill | `lib/skills/facebook-publish.ts` | Reference for the HUMAN_GATE pattern in Marketing Operations module. |
| WhatsApp webhook handler | `app/api/webhooks/whatsapp/` | Reference for inbound message routing architecture. |
| Skills framework | `lib/skills/` | The skill module pattern (input → AI call → structured output) is clean. Apply to new agent architecture. |

### Category C — Five Production Demo Websites
*Fully built, CEO-approved, live on Vercel. Must be preserved as deployed assets.*

| Demo | Industry | Location |
|---|---|---|
| Blades & Co | Barbershop | `demo-sites/barbershop/` |
| Vitalis Clinic | Medical / Clinic | `demo-sites/clinic/` |
| Lumière Studio | Salon | `demo-sites/salon/` |
| Zafran & Oud | Restaurant | `demo-sites/restaurant/` |
| Pinnacle Properties | Real Estate | `demo-sites/realestate/` |

These five demo sites are MDA's primary sales asset. They demonstrate the AED 599 website offer to prospects. They must remain deployed and accessible indefinitely. No action required — they are already live.

**In the new platform:** The Product Portfolio module will reference and manage these demos. No rebuild is needed.

### Category D — Architecture Decision Records
*103+ ADR documents recording every significant technical decision in V1.*

| Asset | Location | Recommendation |
|---|---|---|
| Full ADR library | `docs/decisions/` (103+ files) | Archive with the legacy repo. The new platform starts its own ADR sequence. The V1 decisions are historical context, not binding constraints. |

### Category E — Business Development Research
*Market research, outreach, pricing analysis conducted during V1 build.*

| Asset | Location | Status |
|---|---|---|
| Dubai company profile pricing research | `master-digital-agency/business-development/DUBAI_COMPANY_PROFILE_PRICING_RESEARCH.md` | UNVERIFIED — keep as reference only |
| Facebook lead generation research | `master-digital-agency/business-development/FACEBOOK_LEAD_GENERATION_RESEARCH.md` | Reference |
| Lead tracker CSV | `master-digital-agency/business-development/LEAD_TRACKER.csv` | ACTIVE — migrate to new platform's Sales module |
| MDA client acquisition plan | `master-digital-agency/business-development/MDA_CLIENT_ACQUISITION_PLAN.md` | Reference |
| Manpower research files (25 root-level files) | Repo root | Business development research — archive in V1, do not carry to new platform |
| Flash delivery Dubai leads | `FLASH_DELIVERY_DUBAI_LEADS.csv`, `.json` | Active prospect data — migrate to new Sales module |
| Overseas recruitment agencies research | `OVERSEAS_RECRUITMENT_AGENCIES_*.{csv,json,html,xlsx}` | Research output — archive in V1 |

### Category F — MDA Deliverables
*Completed client/agency work products.*

| Asset | Location | Recommendation |
|---|---|---|
| Company Profile v4 | `master-digital-agency/deliverables/company-profile-v4/` | Preserve as portfolio reference in new platform |
| NEXORA portfolio sample | `master-digital-agency/deliverables/NEXORA-portfolio-sample/` | Preserve as portfolio reference |
| MDA service catalog | `master-digital-agency/deliverables/mda-service-catalog/` | Migrate to new platform Product Portfolio module |

### Category G — Android Projects
*Three Android project variants.*

| Asset | Location | Recommendation |
|---|---|---|
| android-project | `android-project/` | Pause development during new platform build |
| android-official | `android-official/` | Preserve in legacy repo |
| android-play | `android-play/` | Preserve in legacy repo |
| APKs | `android-apk/` | Preserve as release artifacts |

**Recommendation:** Android development is paused during the new platform build phase. No action required. These remain safely in the V1 repo.

### Category H — Fleet Tracker
*A standalone sub-application.*

| Asset | Location | Recommendation |
|---|---|---|
| Fleet Tracker app | `apps/fleet-tracker/` | Treat as an independent product. Not part of the new platform. Remains in V1 repo until it has its own. |

### Category I — Pricing & Commercial Data
*All CEO-approved pricing and commercial decisions.*

| Item | Value | Source |
|---|---|---|
| MDA website packages | AED 599 / 899 / 1,899 | CONFIRMED—USER 2026-10-21 |
| MDA branding | AED 99 / 249 / 349 | CONFIRMED—USER 2026-10-21 |
| MDA company profiles | AED 60 / 160 / 249 | CONFIRMED—USER 2026-10-21 |
| Graphic design | AED 49 / 99 / 249 | CONFIRMED—USER 2026-10-21 |
| Social media management | AED 549 / 899 per month | CONFIRMED—USER 2026-10-21 |
| Ziina payment URL | `https://pay.ziina.com/drexonyx/Md6AyFJ0z?source=app` | CONFIRMED—must not change without CEO approval |

All pricing migrates to the new platform's Product Portfolio module as the canonical service catalog.

---

## 5. What to Leave Behind

The following assets have no reuse value in the new platform and should remain in the V1 repo without being carried over:

| Asset | Why Not Carried |
|---|---|
| 25+ root-level research dump files (`MANPOWER_*`, `OVERSEAS_*`, `FLASH_DELIVERY_*`, `FINAL_*`) | Loose research artifacts that belong in the Knowledge Base module as structured entries, not raw files at repo root |
| Client portal code (`app/portal/`) | New platform is internal-only. No client portal in Phase 1. |
| Video production pipeline (`lib/agent/`, `app/admin/production/`) | Will be rebuilt cleanly as a module when needed |
| Legacy public demo HTML files (`public/demo.html`, `public/promo.html`, etc.) | Replaced by the new demo sites |
| Old DB schema design artifacts from early phases | Superseded by current V1 schema |

---

## 6. Strictly Prohibited Actions

The following actions are forbidden without explicit CEO approval and a written recovery plan:

| Action | Why Forbidden |
|---|---|
| Delete or archive the `drexonyx-v1` GitHub repository | Destroys all V1 history, ADRs, and in-progress work |
| Drop or modify the Neon production database | Destroys live customer and business data |
| Delete the Cloudflare R2 bucket | Destroys all stored video and image assets |
| Unpublish or delete Vercel production deployment | Takes drexonyx.com offline |
| Force-push to `main` on `drexonyx-v1` | Destroys commit history |
| Revoke or rotate production API keys | Breaks live production services |
| Delete GitHub Actions secrets | Breaks the generation polling pipeline |

---

## 7. Recommended Preservation Checklist

Before starting new platform development, the CEO confirms:

- [ ] `git tag v1-legacy-snapshot` created on `drexonyx-v1/main`
- [ ] GitHub branch protection enabled on `drexonyx-v1/main`
- [ ] Vercel production deployment confirmed live at drexonyx.com
- [ ] Neon production database confirmed accessible (no schema changes)
- [ ] Cloudflare R2 bucket confirmed intact
- [ ] Five demo sites confirmed accessible (barbershop, clinic, salon, restaurant, realestate)
- [ ] `LEAD_TRACKER.csv` and `FLASH_DELIVERY_DUBAI_LEADS` data reviewed — confirm whether active prospects need manual follow-up before new platform is ready
- [ ] Android APKs confirmed stored (can be downloaded from repo if needed)
- [ ] CEO has reviewed this document and approved it

---

*End of Document 2 — DREXONYX_LEGACY_PRESERVATION_PLAN.md*
