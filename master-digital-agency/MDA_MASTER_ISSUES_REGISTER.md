# MDA — Master Issues Register

**Project:** Drexonyx V1 — Master Digital Agency subsystem  
**Last updated:** 2026-10-30  
**Branch:** `feat/chatbot-rate-limit`  
**Audit session:** Post-audit remediation (October 2026)

Evidence labels: CONFIRMED—USER | CONFIRMED—PRIMARY SOURCE | SECONDARY SOURCE | UNVERIFIED | PROPOSAL—NOT APPROVED

---

## Issue Status Key

| Status | Meaning |
|--------|---------|
| OPEN | Not yet addressed |
| IN PROGRESS | Being worked on |
| RESOLVED | Fixed and verified |
| WONTFIX | Owner decision: will not fix |
| OUT OF SCOPE | Belongs to a different project |

---

## Issues

### ISS-001 — Invalid Gemini Model Name in Chatbot API

| Field | Value |
|-------|-------|
| Status | **RESOLVED** |
| Severity | Critical (API calls would fail at runtime) |
| File | `app/api/chatbot/route.ts` |
| Description | `MODELS` array used `gemini-3.5-flash-lite` (non-existent) and `gemini-2.0-flash-experimental` (deprecated) |
| Fix | Changed to `['gemini-2.0-flash-lite', 'gemini-2.0-flash']` — both are valid, production-tier models |
| Commit | `7483c2b` on `feat/chatbot-rate-limit` |
| Evidence | CONFIRMED—PRIMARY SOURCE (Gemini API model list) |

---

### ISS-002 — Netflix/Proprietary Hero Image in Demo Client

| Field | Value |
|-------|-------|
| Status | **RESOLVED** |
| Severity | High (brand / IP risk) |
| File | `lib/chatbot/clients.ts` — `try` client `heroBg` |
| Description | `heroBg` for the `try` (demo) client pointed to a Unsplash photo tagged as Netflix-related (`photo-1611162617474-5b21e879e113`) |
| Fix | Replaced with `photo-1677442135703-1787eea5ce01` (abstract AI/tech gradient — no brand associations) |
| Commit | `7483c2b` on `feat/chatbot-rate-limit` |
| Evidence | CONFIRMED—USER (owner flagged as unacceptable) |

---

### ISS-003 — Unapproved Chatbot Pricing Tiers in System Prompts

| Field | Value |
|-------|-------|
| Status | **RESOLVED** |
| Severity | High (commercial liability — AED 499 and AED 799 tiers were never owner-approved) |
| File | `lib/chatbot/clients.ts` — `demo` and `try` clients' `systemPrompt` |
| Description | System prompts presented three chatbot plans: Basic (AED 299), Advanced (AED 499), Professional (AED 799). Only AED 299 was approved. |
| Fix | Removed all references to AED 499 "Advanced" and AED 799 "Professional" plans from both `demo` and `try` client system prompts. Also removed the "Preferred plan" step that listed the three tiers. AED 299 Basic plan preserved as-is. |
| Owner decision | CONFIRMED—USER: "Remove unapproved AED 499 and AED 799 chatbot prices; preserve AED 299" |
| Evidence | CONFIRMED—USER |

---

### ISS-004 — No Rate Limiting on Chatbot API

| Field | Value |
|-------|-------|
| Status | **RESOLVED (via PR #52)** |
| Severity | High (abuse / cost exposure) |
| File | `app/api/chatbot/route.ts` |
| Description | The chatbot endpoint had no rate limiting — any IP could send unlimited requests |
| Fix | PR #52 adds in-memory sliding-window rate limiter: 20 requests per 60 seconds per IP×clientId combination. Returns HTTP 429 with `Retry-After` header on excess. |
| Note | PR #52 is a Draft — requires owner review and merge |
| Evidence | CONFIRMED—PRIMARY SOURCE (code review) |

---

### ISS-005 — Chatbot Widget Not Embedded on /mda Page

| Field | Value |
|-------|-------|
| Status | **RESOLVED** |
| Severity | Medium (MDA page has no chatbot — key conversion tool missing) |
| File | `app/mda/page.tsx` |
| Description | `chatbot.js` exists at `/public/chatbot.js` and works for `mda` client, but the `/mda` marketing page did not load it |
| Fix | Added `import Script from 'next/script'` and `<Script src="/chatbot.js?client=mda" strategy="afterInteractive" />` before the closing fragment tag |
| Evidence | CONFIRMED—PRIMARY SOURCE (code review) |

---

### ISS-006 — No Subscription Expiry Enforcement in Chatbot API

| Field | Value |
|-------|-------|
| Status | **RESOLVED (via PR #52)** |
| Severity | High (paying subscribers could have expired access silently continue) |
| File | `app/api/chatbot/route.ts` |
| Description | No check for `client.active` flag or `client.expiresAt` date before serving chat |
| Fix | PR #52 adds subscription guard: if `client.active === false` or `client.expiresAt < now`, API returns HTTP 403 |
| Note | PR #52 is a Draft — requires owner review and merge |
| Evidence | CONFIRMED—PRIMARY SOURCE (code review) |

---

### ISS-019 — ENABLE_ADMIN_ROUTES Env Var Exposed on Vercel

| Field | Value |
|-------|-------|
| Status | **OUT OF SCOPE** |
| Severity | N/A for MDA |
| Description | `ENABLE_ADMIN_ROUTES=true` is set on Vercel. Audit flagged it as a potential security concern. |
| Owner decision | CONFIRMED—USER: "This belongs to the DirectX 12 project, not MDA. Exclude entirely." |
| Action | No change made. DirectX 12 configuration is out of MDA remediation scope. |

---

## PR Status (as of 2026-10-30)

| PR | Branch | Status | Content | Recommendation |
|----|--------|--------|---------|----------------|
| #50 | `ccr-3a71ba38-pwua60` → main | Open, Ready for Review | Wave 1 chatbot fixes (correct Gemini model, clean security) | Safe to merge |
| #51 | `docs/mda-session-audit` → main | Open | **WARNING: Mislabeled as docs-only — contains 18 changed files including production code in `app/`, `lib/`, `middleware.ts`, `package.json`.** Owner must review full diff before merging. | Requires owner review |
| #52 | `feat/chatbot-rate-limit` → main | Draft | Rate limiting + subscription guard (ISS-004, ISS-006) | Ready for owner review; promote from Draft when approved |

---

## ESLint Remediation (2026-10-30)

28 warnings in `app/` and `lib/` were fixed across 14 files. All fixes were real removals (unused imports, renamed unused vars, proper `<Image>` usage, `next/font/google` adoption). Zero `eslint-disable` suppressions added.

**Files changed:**
- `app/admin/sales/actions.ts` — removed unused `isNull` import
- `app/admin/sales/page.tsx` — removed unused `followUps` schema import
- `app/api/internal/sales-reply-poll/route.ts` — removed unused `inArray` import
- `app/api/mda/command/route.ts` — removed unused `formatCommandResponse` import
- `app/chat/[slug]/ChatPage.tsx` — `<img>` → `<Image>` (2×), font vars
- `app/chat/layout.tsx` — moved fonts from inline `<link>` to `next/font/google`
- `app/portal/credits/buy/PayConfirmForm.tsx` — `window.location.href` → `useRouter().push()`
- `lib/admin/queries.ts` — renamed unused `warningRows` → `_warningRows`
- `lib/agents/registry.ts` — removed 3 unused imports from sales-discovery-specialist
- `lib/credits/__tests__/cost-guard.test.ts` — removed unused `beforeEach`, `afterEach` imports
- `lib/credits/ledger.ts` — removed unused `and` import, renamed `SYSTEM_ACTOR_ID` → `_SYSTEM_ACTOR_ID`
- `lib/sales/outreach-sender.ts` — removed unused `isNull`, `inArray` imports
- `lib/sales/queries.ts` — removed unused `gt`, `lt`, `ne` imports; renamed `repliesReceived` → `_repliesReceived`
- `lib/__tests__/autonomous-campaign.test.ts` — renamed `aiOkFenced`, `aiOkProse` → `_aiOk*`
- `lib/__tests__/orchestration-sales-writer.test.ts` — renamed `mockPriorSteps` → `_mockPriorSteps`
- `lib/sales/__tests__/queries.test.ts` — renamed `makeChain`, `makeTerminal`, `makeOutreach` → `_make*`

**Final suite results:** TypeScript: 0 errors | ESLint: 0 warnings | Tests: 2633/2633 passed
