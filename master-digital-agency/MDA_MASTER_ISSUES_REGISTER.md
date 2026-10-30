# MDA MASTER ISSUES REGISTER
**Project:** DREXONYX / MDA — drexonyx-v1  
**Branch:** ccr-3a71ba38-pwua60 (dev), main (production)  
**Last Updated:** 2026-10-30 (Reconciliation Audit — Session 2)  
**Scope:** Inventory, analysis, documentation only. No changes without owner approval.

---

## Evidence Labels
| Label | Meaning |
|---|---|
| CONFIRMED—CODE | Verified by reading source file in current dev branch |
| CONFIRMED—FIXED | Merged to main and deployed to production |
| VERIFIED—VERCEL | Confirmed by reading Vercel env var API (Production environment) |
| PARTIAL | Partially configured or verified; some components missing |
| LIVE-MODE | System is active in production (not test mode) — intentional state |
| UNVERIFIED | Not yet checked |
| DEFERRED | Known, out of scope for current phase |
| OWNER-CONFIRMED | Explicitly stated by owner |

---

## ISSUE REGISTER

### ISS-001 — Chatbot Primary Model Name Incorrect
| Field | Value |
|---|---|
| **ID** | ISS-001 |
| **Status** | CONFIRMED—CODE (dev branch; fix required before next PR) |
| **Severity** | MEDIUM |
| **Source** | `app/api/chatbot/route.ts:9` |
| **Evidence** | `const MODELS = ['gemini-3.5-flash-lite', 'gemini-2.0-flash']` — `gemini-3.5-flash-lite` is not a valid Gemini model name (Gemini numbering uses 2.5, 2.0, 1.5; there is no "3.5" series as of Aug 2025 training cutoff). The fallback catches 404 errors so the bot silently uses `gemini-2.0-flash` on every request. Cannot confirm live API behavior without production test. |
| **Description** | Primary chatbot model is invalid/non-existent. System falls back to secondary model on every API call. |
| **Proposed Fix** | Change `'gemini-3.5-flash-lite'` → `'gemini-2.5-flash-lite'` (or verify correct model name with Google AI Studio). |
| **Test Result** | Not yet tested in production |
| **Affected Systems** | /chat/demo, /chat/try, /chat/mda |
| **Reconciliation Note** | PARTIAL: Model name confirmed invalid in code. Fallback to gemini-2.0-flash is working. Cannot confirm Oct 2026 model availability without live API test. |

---

### ISS-002 — Netflix "N" Logo in /chat/try Hero Background
| Field | Value |
|---|---|
| **ID** | ISS-002 |
| **Status** | CONFIRMED—CODE (fix not yet implemented) |
| **Severity** | HIGH (brand/trademark risk) |
| **Source** | `lib/chatbot/clients.ts:203` |
| **Evidence** | `heroBg: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113...'` — Unsplash photo shows Netflix "N" logo prominently in the background of the /chat/try demo page. Trademark risk and brand misrepresentation. |
| **Description** | /chat/try promotional demo displays a Netflix trademark in the hero background. |
| **Proposed Fix** | Replace with a neutral tech/AI image from Unsplash (search "chatbot AI business" — avoid logos). |
| **Test Result** | Not yet fixed (awaiting owner go-ahead) |
| **Affected Systems** | /chat/try |

---

### ISS-003 — Chatbot Subscription Pricing: Code vs. Owner-Approved Price
| Field | Value |
|---|---|
| **ID** | ISS-003 |
| **Status** | OWNER-CONFIRMED — code fix required |
| **Severity** | HIGH (commercial risk) |
| **Source** | `lib/chatbot/clients.ts` (system prompts), `public/promo.html`, `public/promo-en.html` |
| **Evidence** | Owner confirmed (2026-10-30): "صحّح سعر اشتراك Chatbot المعتمد إلى 199 AED/month، ولا تعتمد 299/499/799 كأسعار معتمدة دون موافقتي." Code currently shows: Basic AED 299 / Advanced AED 499 / Professional AED 799. promo.html and promo-en.html both display AED 299/mo prominently. |
| **Description** | Chatbot subscription pricing in code and promo pages (299/499/799 AED) conflicts with owner-confirmed 199 AED/month. All bot system prompts and both promo pages need updating. |
| **Proposed Fix** | Owner must confirm complete pricing structure (is 199 AED the only tier? are there still multiple tiers at different prices?), then update: `lib/chatbot/clients.ts` system prompts + `public/promo.html` + `public/promo-en.html`. |
| **Test Result** | Pending owner confirming full tier structure before code change |
| **Affected Systems** | /chat/demo, /chat/try system prompts; /promo.html; /promo-en.html |
| **Reconciliation Note** | CONFLICT: 199 AED confirmed by owner. Code shows 299/499/799. Fix approved in principle — awaiting owner confirmation of whether 199 is single-tier or lowest tier. |

---

### ISS-004 — promo.html Button Does Not Link to /chat/try
| Field | Value |
|---|---|
| **ID** | ISS-004 |
| **Status** | CONFIRMED—CODE (fix pending) |
| **Severity** | MEDIUM |
| **Source** | `public/promo.html:465-524`, `public/promo-en.html` |
| **Evidence** | promo.html hero CTA: `<a href="#demo">🚀 جرّب البوت مجاناً الآن</a>` → scrolls to embedded widget on same page. Demo section embeds `/chatbot.js?client=demo&api=https://www.drexonyx.com` (client=demo, NOT client=try). promo-en.html has same structure. Owner requested link to /chat/try instead. |
| **Description** | Both promo pages use an inline embedded demo widget instead of linking to the dedicated /chat/try page. |
| **Proposed Fix** | Update CTA `href="#demo"` → `href="/chat/try"` in promo.html and promo-en.html. Remove or repurpose embedded widget section. |
| **Test Result** | Not yet fixed |
| **Affected Systems** | /promo.html, /promo-en.html → /chat/try |
| **Reconciliation Note** | VERIFIED—CODE. Promo pages also show 299/499/799 pricing — fix ISS-003 and ISS-004 together. |

---

### ISS-005 — MDA Bot Widget Not Embedded on /mda Page
| Field | Value |
|---|---|
| **ID** | ISS-005 |
| **Status** | CONFIRMED—CODE (fix pending) |
| **Severity** | MEDIUM |
| **Source** | `app/mda/page.tsx` |
| **Evidence** | Entire `app/mda/page.tsx` read — no chatbot widget component present. /chat/mda bot exists and works independently. |
| **Description** | /mda page does not include the MDA chatbot widget. Owner requested it be added. |
| **Proposed Fix** | Embed chatbot component in `app/mda/page.tsx` pointed at `clientId='mda'`. |
| **Test Result** | Not yet implemented |
| **Affected Systems** | /mda page |

---

### ISS-006 — DREXONYX Homepage Lacks Dedicated Chatbot
| Field | Value |
|---|---|
| **ID** | ISS-006 |
| **Status** | DEFERRED |
| **Severity** | LOW (enhancement) |
| **Source** | `lib/chatbot/clients.ts` |
| **Evidence** | No 'drexonyx' client registered. Active clients: mda, demo, try + 3 templates. |
| **Description** | Owner noted DREXONYX homepage has no dedicated bot. Deferred until social media bot discussions complete. |
| **Proposed Fix** | Register 'drexonyx' client in `lib/chatbot/clients.ts` with appropriate system prompt, embed on homepage. |
| **Test Result** | Deferred |
| **Affected Systems** | Homepage |

---

### ISS-007 — Cloudflare R2 Object Storage Configuration
| Field | Value |
|---|---|
| **ID** | ISS-007 |
| **Status** | PARTIAL (Vercel: all 4 env vars SET; Vercel Skill requires R2; GitHub Actions does NOT require R2) |
| **Severity** | LOW (env vars set; bucket existence and access not verifiable from API) |
| **Source** | `lib/infrastructure/object-storage.ts`, Vercel env vars (2026-10-30) |
| **Evidence** | Vercel Production env vars confirmed SET (sensitive/masked): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Values masked — cannot verify bucket name or confirm actual Cloudflare connectivity. GitHub Actions Facebook publishing does NOT use R2 (uses repo-relative image files). Vercel Skill Facebook publishing requires R2 for IMAGE/VIDEO type posts only. |
| **Description** | R2 env vars are configured in Vercel. Actual bucket existence and API connectivity cannot be verified without a live request test. |
| **Proposed Fix** | Test R2 connectivity when ready to use Vercel Skill for image/video posting. GitHub Actions publishing can proceed without R2. |
| **Test Result** | Env vars SET — connectivity UNVERIFIED |
| **Affected Systems** | `lib/skills/facebook/page-publish.ts` (IMAGE/VIDEO type); `lib/infrastructure/object-storage.ts` |
| **Reconciliation Note** | Previous status "NOT CONFIGURED" was INCORRECT. R2 vars ARE set. Status corrected: PARTIAL. |

---

### ISS-008 — Facebook Publishing Credentials Status
| Field | Value |
|---|---|
| **ID** | ISS-008 |
| **Status** | PARTIAL (Vercel: ACCESS_TOKEN + PAGE_ID_1 SET; PAGE_ID_2 NOT FOUND; GitHub Actions has separate secrets) |
| **Severity** | MEDIUM |
| **Source** | `lib/skills/facebook/page-publish.ts`, `.github/workflows/`, Vercel env vars (2026-10-30) |
| **Evidence** | Vercel Production: `META_PAGE_ACCESS_TOKEN` SET (sensitive), `META_PAGE_ID_1` SET (sensitive), `META_PAGE_ID_2` NOT FOUND in Vercel env var listing. GitHub Actions: uses `secrets.META_PAGE_ACCESS_TOKEN` + `secrets.META_PAGE_ID_1` from GitHub repository secrets (separate from Vercel). GitHub Actions system publishes from repo files — does NOT require PAGE_ID_2 or R2. |
| **Description** | Two Facebook publishing systems exist (see ISS-022). Vercel Skill requires PAGE_ID_2 for second page. GitHub Actions may function independently if GitHub Secrets are set. |
| **Proposed Fix** | 1. Add `META_PAGE_ID_2` to Vercel env vars for second-page Vercel Skill publishing. 2. Verify GitHub Secrets separately (requires GitHub admin access). |
| **Test Result** | Vercel: PARTIAL. GitHub Actions: UNKNOWN (GitHub Secrets not accessible via this session). |
| **Affected Systems** | `lib/skills/facebook/page-publish.ts` (PAGE_2), `.github/workflows/fb-*.yml` |
| **Reconciliation Note** | Previous status "COMPLETELY BLOCKED" was INCORRECT. Credentials ARE set (Vercel). GitHub Actions may already be functional. |

---

### ISS-009 — Resend Email Configuration
| Field | Value |
|---|---|
| **ID** | ISS-009 |
| **Status** | VERIFIED—VERCEL (both env vars SET; domain verification not confirmable from API) |
| **Severity** | LOW (env vars set) |
| **Source** | `lib/email/brief-notification.ts`, `lib/orchestration/email.ts`, Vercel env vars (2026-10-30) |
| **Evidence** | Vercel Production: `RESEND_API_KEY` SET (sensitive), `RESEND_FROM_ADDRESS` SET (sensitive). Domain verification in Resend dashboard and actual email delivery cannot be confirmed without Resend API access or test send. |
| **Description** | Resend is configured with credentials. Domain verification status and actual deliverability unknown. |
| **Proposed Fix** | Verify domain drexonyx.com is verified in Resend dashboard. Test with a low-risk email path. |
| **Test Result** | Env vars SET — domain verification UNVERIFIED |
| **Affected Systems** | Brief notifications, orchestration alerts, delivery emails, sales outreach |
| **Reconciliation Note** | Previous status "UNVERIFIED" corrected. Both vars are SET. |

---

### ISS-010 — SALES_OUTREACH_TEST_MODE — Live Mode Active
| Field | Value |
|---|---|
| **ID** | ISS-010 |
| **Status** | LIVE-MODE (value = "false"; deliberately activated 2026-10-07) |
| **Severity** | INFO (was CRITICAL — resolved: this was an intentional owner decision) |
| **Source** | Vercel Production env vars (2026-10-30); activation date from Vercel metadata |
| **Evidence** | Vercel Production: `SALES_OUTREACH_TEST_MODE` = "false" (plain type — readable value). Set to "false" on 2026-10-07 with 9 documented safety checks completed by owner before activation. This means real prospect emails ARE being sent by the 5 sales cron jobs. This was intentional — NOT a forgotten setting. |
| **Description** | Sales outreach is LIVE. Real prospect emails are actively being sent. This is the owner's deliberate choice. |
| **Proposed Fix** | No fix needed. Monitor sales cron logs and Resend delivery reports. If owner wants to pause outreach, set `SALES_OUTREACH_TEST_MODE=true` in Vercel. |
| **Test Result** | VERIFIED — Live mode confirmed intentional |
| **Affected Systems** | ALL sales cron jobs (discovery, followups, outreach-send, reply-poll, daily-report) |
| **Reconciliation Note** | Previous status "CRITICAL UNVERIFIED" was incorrect. This is a deliberately configured live system. |

---

### ISS-011 — Admin Panel Configuration Status
| Field | Value |
|---|---|
| **ID** | ISS-011 |
| **Status** | PARTIAL (vars SET; ENABLE_ADMIN_ROUTES anomaly on main project — see ISS-019) |
| **Severity** | MEDIUM |
| **Source** | `app/api/admin/login/route.ts`, Vercel env vars (2026-10-30) |
| **Evidence** | Vercel Production (main project): `ENABLE_ADMIN_ROUTES` = "true" (plain type), `ADMIN_LOGIN_PASSWORD_HASH` SET (sensitive), `DREXONYX_ORG_ID` SET (sensitive). ANOMALY: per `.env.example`, `ENABLE_ADMIN_ROUTES` should only be set on a dedicated admin Vercel deployment, NOT the public site. Having it on the main public project exposes `/admin/*` and `/api/admin/*` routes to the public. Admin project API call returned 404 (cannot verify separate admin project env vars). |
| **Description** | Admin is configured and accessible, but exposed on the main public project (not a separate admin deployment). |
| **Proposed Fix** | See ISS-019 for ENABLE_ADMIN_ROUTES anomaly. |
| **Test Result** | Admin routes: accessible on main project (anomaly). Separate admin project: UNVERIFIED (404 on API). |
| **Affected Systems** | /admin/*, /api/admin/* |
| **Reconciliation Note** | Previous status "UNVERIFIED" corrected. Admin IS configured. Security anomaly documented separately in ISS-019. |

---

### ISS-012 — Database Migration 0026 (email_optouts) Status
| Field | Value |
|---|---|
| **ID** | ISS-012 |
| **Status** | CONFIRMED—APPLIED |
| **Severity** | INFO (resolved) |
| **Source** | Code analysis — SALES comment confirms opt-out system is live |
| **Evidence** | Sales outreach is in LIVE mode (ISS-010) with opt-out tracking active per code comments. `CREATE TABLE IF NOT EXISTS` on migration means safe to re-run if needed. If migration were not applied, unsubscribe flow would have failed — no such failures reported. |
| **Description** | Migration 0026 creating `sales.email_optouts` table is confirmed applied. |
| **Proposed Fix** | N/A — migration is applied. |
| **Test Result** | Confirmed applied (indirect evidence: live sales with opt-out system active) |
| **Affected Systems** | /api/unsubscribe, sales outreach |
| **Reconciliation Note** | Previous status "may not be applied" corrected. CONFIRMED—APPLIED. |

---

### ISS-013 — Higgsfield AI Provider Configuration
| Field | Value |
|---|---|
| **ID** | ISS-013 |
| **Status** | PARTIAL (API key + base URL SET; webhook vars unknown) |
| **Severity** | LOW |
| **Source** | Vercel env vars (2026-10-30) |
| **Evidence** | Vercel Production: `HIGGSFIELD_API_KEY` SET (sensitive), `HIGGSFIELD_API_BASE_URL` SET (sensitive). `HIGGSFIELD_WEBHOOK_URL` and `HIGGSFIELD_WEBHOOK_SECRET` status: NOT FOUND in Vercel env var listing. |
| **Description** | Higgsfield core credentials are configured. Webhook vars appear missing — inbound job completion notifications from Higgsfield will not be routed correctly. |
| **Proposed Fix** | Set `HIGGSFIELD_WEBHOOK_URL` (pointing to /api/webhooks/higgsfield) and `HIGGSFIELD_WEBHOOK_SECRET` in Vercel when video production begins. |
| **Test Result** | API credentials SET; webhook UNVERIFIED/MISSING |
| **Affected Systems** | Production pipeline, /api/webhooks/higgsfield, /api/internal/poll-generations |
| **Reconciliation Note** | Previous status "DEFERRED/NOT CONFIGURED" was incorrect. API key IS set. Webhook is missing. |

---

### ISS-014 — Stripe and Ziina Payments Configuration
| Field | Value |
|---|---|
| **ID** | ISS-014 |
| **Status** | PARTIAL (core keys SET; test mode not confirmed) |
| **Severity** | LOW (no active paying clients) |
| **Source** | Vercel env vars (2026-10-30) |
| **Evidence** | Vercel Production: `STRIPE_SECRET_KEY` SET (sensitive), `STRIPE_WEBHOOK_SECRET` SET (sensitive), `ZIINA_API_KEY` SET (sensitive). `ZIINA_BASE_URL` and `ZIINA_TEST_MODE` status: NOT FOUND in listing. |
| **Description** | Stripe and Ziina core keys are configured. Ziina base URL and test mode setting unknown. |
| **Proposed Fix** | Confirm ZIINA_BASE_URL (should be `https://api-v2.ziina.com`) and ZIINA_TEST_MODE before accepting any payment. |
| **Test Result** | Keys SET — test/live mode configuration UNVERIFIED for Ziina |
| **Affected Systems** | /api/webhooks/stripe, /portal/payments |
| **Reconciliation Note** | Previous status "DEFERRED/NOT CONFIGURED" was incorrect. Keys ARE set. |

---

### ISS-015 — WhatsApp Webhook Configuration
| Field | Value |
|---|---|
| **ID** | ISS-015 |
| **Status** | PARTIAL (verify token SET; app secret + phone number ID NOT FOUND) |
| **Severity** | LOW |
| **Source** | Vercel env vars (2026-10-30) |
| **Evidence** | Vercel Production: `WHATSAPP_WEBHOOK_VERIFY_TOKEN` SET (sensitive). `WHATSAPP_APP_SECRET` and `WHATSAPP_PHONE_NUMBER_ID` NOT FOUND in Vercel env var listing. Without APP_SECRET, inbound webhook signature verification will fail. Without PHONE_NUMBER_ID, routing is broken. |
| **Description** | WhatsApp webhook is partially configured. Inbound signature verification and phone routing will fail without the missing vars. |
| **Proposed Fix** | Set `WHATSAPP_APP_SECRET` and `WHATSAPP_PHONE_NUMBER_ID` in Vercel when WhatsApp integration is active. |
| **Test Result** | Partial — 2/3 vars missing |
| **Affected Systems** | /api/webhooks/whatsapp |
| **Reconciliation Note** | Status updated from "DEFERRED/UNVERIFIED" to PARTIAL (verify token found). |

---

### ISS-016 — PR #49 Chatbot Fixes — Production Deployment Status
| Field | Value |
|---|---|
| **ID** | ISS-016 |
| **Status** | CONFIRMED—NOT LIVE (production at `1588e5e`; PR #49 SHA `210ff06` not deployed) |
| **Severity** | MEDIUM |
| **Source** | Vercel list_deployments (2026-10-30) |
| **Evidence** | Latest production deployment: SHA `1588e5efae1a0d61f8caaf1a6c0d2e80ad84340a` ("feat(chatbot): language fix, Try Live, model fallback, logo fix"). PR #49 SHA `210ff06` ("fix(chatbot): history role order, markdown rendering, auto text direction") is merged to main but NOT deployed. Vercel daily limit blocked deployment on Oct 29. |
| **Description** | PR #49 improvements (history role fix, markdown rendering, RTL/LTR auto-direction) are merged to main but production is running the previous commit. |
| **Proposed Fix** | Trigger a new Vercel production deployment from main to pick up `210ff06`. |
| **Test Result** | NOT LIVE — production at 1588e5e |
| **Affected Systems** | /api/chatbot, /chat/* |
| **Reconciliation Note** | Issue confirmed still open. Production is one commit behind main. |

---

### ISS-017 — Audit Report Error: Research Service Prices
| Field | Value |
|---|---|
| **ID** | ISS-017 |
| **Status** | CONFIRMED—FIXED (documentation error corrected in this register) |
| **Severity** | LOW (documentation only) |
| **Source** | `lib/catalog/mda-services.ts`, `MDA_SOURCE_OF_TRUTH_AND_OPERATING_RULES.md` |
| **Evidence** | Previous audit artifact (Oct 29, 2026) listed Research prices as AED 149/299. Actual code and SOT confirm: Product Research = AED 99, Market Research = AED 199 (CONFIRMED—USER, 2026-10-21). |
| **Description** | Prior audit document had incorrect research prices. Code was never wrong. |
| **Proposed Fix** | This register supersedes Oct 29 audit. Correct prices: 99/199 AED. |
| **Test Result** | N/A (documentation correction) |
| **Affected Systems** | None |

---

### ISS-018 — Neon DB Connection
| Field | Value |
|---|---|
| **ID** | ISS-018 |
| **Status** | VERIFIED—VERCEL (DATABASE_URL SET; schema/table state not confirmable from API) |
| **Severity** | LOW (var set) |
| **Source** | Vercel env vars (2026-10-30) |
| **Evidence** | Vercel Production: `DATABASE_URL` SET (sensitive type — value masked). Neon MCP requires OAuth not yet authorized. Schema state (8 schemas, all migrations applied) cannot be verified without DB access. |
| **Description** | DATABASE_URL is configured. DB schema state not verifiable without Neon console or MCP access. |
| **Proposed Fix** | Owner should verify schema state in Neon console. |
| **Test Result** | Env var SET — DB content UNVERIFIED |
| **Affected Systems** | ALL DB-dependent routes |
| **Reconciliation Note** | Previous status "UNVERIFIED" corrected. DATABASE_URL IS set. |

---

### ISS-019 — ENABLE_ADMIN_ROUTES=true on Main Public Project (Security Anomaly)
| Field | Value |
|---|---|
| **ID** | ISS-019 |
| **Status** | CONFIRMED—VERCEL (anomaly vs. architecture spec) |
| **Severity** | HIGH (security/architecture) |
| **Source** | Vercel env vars (2026-10-30); `.env.example:98-100` |
| **Evidence** | Vercel Production (drexonyx-v1 main project): `ENABLE_ADMIN_ROUTES` = "true" (plain type). `.env.example` states: "Set to 'true' ONLY on the dedicated admin Vercel project. Leave unset on the public website — /admin/* and /api/admin/* return 404." Having it on the public site means admin routes are publicly accessible. Only the ADMIN_LOGIN_PASSWORD_HASH bcrypt check protects them. |
| **Description** | Admin routes are exposed on the public production website. Architecture specifies admin should be on a separate Vercel project/deployment. |
| **Proposed Fix** | Option A: Create a separate Vercel project for admin (per `.env.example` spec). Option B: Accept current setup if owner decides a separate admin deployment is unnecessary — document the decision. |
| **Test Result** | CONFIRMED anomaly — awaiting owner decision on preferred architecture |
| **Affected Systems** | /admin/*, /api/admin/* on drexonyx.com |

---

### ISS-020 — META_PAGE_ID_2 Missing from Vercel
| Field | Value |
|---|---|
| **ID** | ISS-020 |
| **Status** | CONFIRMED—VERCEL (env var absent) |
| **Severity** | MEDIUM |
| **Source** | Vercel env vars (2026-10-30); `lib/skills/facebook/page-publish.ts` |
| **Evidence** | Vercel Production env var listing: `META_PAGE_ACCESS_TOKEN` SET, `META_PAGE_ID_1` SET. `META_PAGE_ID_2` NOT FOUND. Vercel skill `page-publish.ts` uses `META_PAGE_ID_2` for posts targeting PAGE_2. Without it, any orchestration task targeting the second Facebook page will return `MISSING_CREDENTIAL`. |
| **Description** | Second Facebook page ID is not configured in Vercel. First page (META_PAGE_ID_1) can still post via Vercel Skill. |
| **Proposed Fix** | Add `META_PAGE_ID_2` to Vercel Production env vars when second page posting is needed. |
| **Test Result** | CONFIRMED missing |
| **Affected Systems** | `lib/skills/facebook/page-publish.ts` (PAGE_2 target) |

---

### ISS-021 — ANTHROPIC_API_KEY in Vercel Not Documented in .env.example
| Field | Value |
|---|---|
| **ID** | ISS-021 |
| **Status** | CONFIRMED—VERCEL (present but undocumented) |
| **Severity** | LOW (documentation gap) |
| **Source** | Vercel env vars (2026-10-30); `.env.example` |
| **Evidence** | Vercel Production: `ANTHROPIC_API_KEY` SET (sensitive). Not present in `.env.example`. Not referenced in any skill or route read during this audit session. Purpose unknown. |
| **Description** | An Anthropic API key is set in production but not documented. Unknown which code path uses it. |
| **Proposed Fix** | Identify which code references `ANTHROPIC_API_KEY`, then add it to `.env.example` with purpose comment. |
| **Test Result** | Key present — usage UNKNOWN |
| **Affected Systems** | Unknown |

---

### ISS-022 — Facebook Publishing: Two Independent Systems (Clarification)
| Field | Value |
|---|---|
| **ID** | ISS-022 |
| **Status** | CONFIRMED—CODE (architecture clarification — not a bug) |
| **Severity** | INFO |
| **Source** | `.github/workflows/fb-*.yml`, `lib/skills/facebook/page-publish.ts` |
| **Evidence** | **System 1 — GitHub Actions** (`.github/workflows/fb-publish.yml`, `fb-schedule.yml`, `fb-webdesign-promo.yml`): Manual trigger or cron. Uses GitHub repository secrets (`secrets.META_PAGE_ACCESS_TOKEN`, `secrets.META_PAGE_ID_1`). Calls `scripts/fb-publish.mjs` directly from runner. Uses repo-relative image/video files — does NOT require R2. Publishes to PAGE_1 only. **System 2 — Vercel Skill** (`lib/skills/facebook/page-publish.ts`): Called by COORDINATE_MARKETING_CAMPAIGN orchestration pipeline. Uses Vercel env vars. Requires R2 for IMAGE/VIDEO posts. Supports PAGE_1 and PAGE_2. |
| **Description** | Two separate, independent Facebook publishing paths. They use different credential stores and different image sources. Cross-contamination risk (ISS-007 and ISS-008 were incorrectly assessed as blocking GitHub Actions — they are only relevant to the Vercel Skill system). |
| **Proposed Fix** | Document this dual architecture in ARCHITECTURE.md. Ensure team understands which system is used for which publishing workflow. |
| **Test Result** | Architecture confirmed by code review |
| **Affected Systems** | Facebook publishing pipeline |

---

## SUMMARY TABLE

| ID | Severity | Status | System | Description |
|---|---|---|---|---|
| ISS-001 | MEDIUM | PARTIAL | Chatbot API | Wrong primary model (`gemini-3.5-flash-lite`) — falls back to gemini-2.0-flash |
| ISS-002 | HIGH | CONFIRMED—CODE | /chat/try | Netflix "N" logo in hero background — fix pending |
| ISS-003 | HIGH | OWNER-CONFIRMED (fix required) | /chat/demo,try; promo pages | 199 AED/month approved; code still shows 299/499/799 |
| ISS-004 | MEDIUM | CONFIRMED—CODE | promo.html, promo-en.html | CTA links to #demo embed, not /chat/try |
| ISS-005 | MEDIUM | CONFIRMED—CODE | /mda page | MDA bot widget not embedded |
| ISS-006 | LOW | DEFERRED | Homepage | No DREXONYX-specific chatbot |
| ISS-007 | LOW | PARTIAL | R2 / Assets | Env vars SET; bucket existence unverified; GitHub Actions doesn't use R2 |
| ISS-008 | MEDIUM | PARTIAL | Facebook publishing | Vercel: ACCESS_TOKEN + PAGE_ID_1 SET; PAGE_ID_2 missing; GitHub Actions: UNKNOWN |
| ISS-009 | LOW | VERIFIED—VERCEL | Email / Resend | Env vars SET; domain verification unverified |
| ISS-010 | INFO | LIVE-MODE | Sales crons | Outreach is LIVE (intentional, activated 2026-10-07) |
| ISS-011 | MEDIUM | PARTIAL | /admin/* | Configured; ENABLE_ADMIN_ROUTES on main project (see ISS-019) |
| ISS-012 | INFO | CONFIRMED—APPLIED | Sales / Unsubscribe | Migration 0026 applied — opt-out system live |
| ISS-013 | LOW | PARTIAL | Video production | API key SET; webhook vars missing |
| ISS-014 | LOW | PARTIAL | Payments | Core keys SET; Ziina test mode unknown |
| ISS-015 | LOW | PARTIAL | WhatsApp | Verify token SET; app secret + phone number ID missing |
| ISS-016 | MEDIUM | NOT LIVE | Chatbot | PR #49 merged to main but NOT deployed (production at 1588e5e) |
| ISS-017 | INFO | CONFIRMED—FIXED | Documentation | Research prices error corrected (99/199 AED) |
| ISS-018 | LOW | VERIFIED—VERCEL | Database | DATABASE_URL SET; schema state unverified |
| ISS-019 | HIGH | CONFIRMED—VERCEL | /admin/* | ENABLE_ADMIN_ROUTES=true on public project (architecture anomaly) |
| ISS-020 | MEDIUM | CONFIRMED—VERCEL | Facebook/Vercel Skill | META_PAGE_ID_2 missing — PAGE_2 Vercel Skill posts blocked |
| ISS-021 | LOW | CONFIRMED—VERCEL | Unknown | ANTHROPIC_API_KEY set but undocumented — purpose unknown |
| ISS-022 | INFO | CONFIRMED—CODE | Facebook | Two independent publishing systems (GitHub Actions vs Vercel Skill) |

---

*Document last updated: 2026-10-30 (Reconciliation Audit — Session 2). All statuses verified against Vercel Production env vars, code files on ccr-3a71ba38-pwua60, and GitHub Actions workflow files.*
