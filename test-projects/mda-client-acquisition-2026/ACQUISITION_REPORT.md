# MDA CLIENT ACQUISITION REPORT
## Dubai Website Design & Landing Pages — First Batch
**To:** irenfold@gmail.com
**Date:** 2026-10-09
**Status: RESEARCH COMPLETE | Outreach: DRAFT READY — PENDING SEND**

---

## EXECUTIVE SUMMARY

MDA executed a first-batch client acquisition research operation targeting
Dubai small businesses and professional services firms needing website design,
landing pages, and website improvement.

| Metric | Count |
|--------|-------|
| Sectors researched | 8 |
| Companies identified | 25+ |
| Companies qualified | 19 |
| Companies excluded (competitors / enterprise) | 7 |
| Outreach drafts prepared | 19 |
| Emails sent | **0 — INFRASTRUCTURE BLOCKER (see Section 4)** |

---

## 1. RESEARCH METHODOLOGY

### Sources used
- PropertyFinder.ae (RERA-registered agency and agent profiles)
- Real Estate Club Dubai directory
- Arabia Weddings vendor directory
- Magicpin Dubai business listings
- Zavis.ai UAE business directory
- ClassPass Dubai studio listings
- Individual company websites where found
- UAE Yellow Pages / general business directories

### Sectors searched
1. Boutique real estate agencies (PropertyFinder-only presence)
2. Home maintenance companies (directory-only presence)
3. Dental and medical clinics (DHA-licensed, minimal web)
4. Accounting and tax consultants (post-Corporate Tax era demand)
5. Interior design studios (portfolio-dependent, dated sites)
6. Event management companies (wedding directory reliance)
7. Pilates and yoga studios (ClassPass/Fresha dependent)
8. Catering companies (offline-first, B2B opportunity)

### Exclusion criteria applied
- Enterprise-scale developers or agencies with confirmed in-house marketing
- Direct competitors to MDA
- Companies where no public contact method was findable

---

## 2. QUALIFIED PROSPECTS — FULL LIST

### Tier 1 — HIGH PRIORITY (act first)

| # | Company | Sector | Opportunity | Contact available |
|---|---------|--------|-------------|-------------------|
| 1 | **DXB Market** | Home maintenance | Website redesign with per-service booking flow | VERIFIED: info@dxbmarket.ae / +971 585740057 |
| 2 | **The Property Boutique** | Real estate | New agency website + lead capture | Via PropertyFinder |
| 3 | **Agnieszka Gomoluch Real Estate** | Real estate | Personal brand website + direct lead gen | Via PropertyFinder |
| 4 | **The Smile Studio Dental Clinic** | Dental | Booking-optimised clinic website | +971 56 488 8466 |
| 5 | **Art of Teeth** | Dental | Treatments page + online booking | +971-58-593-3422 |
| 6 | **Al-Falah Accounting** | Accounting/tax | Professional credibility site | info@al-falah-group.com |
| 7 | **Creative Shelf LLC** | Interior design | Portfolio redesign + branded email | creativeshelf21@gmail.com (current Gmail) |
| 8 | **Flow O2** | Pilates / fitness | Direct booking landing page | Via Magicpin |
| 9 | **Khobzah w Fakhaara** | Catering | Corporate catering landing page improvement | Via khobzahfakhaara.com |

### Tier 2 — MEDIUM PRIORITY (follow after Tier 1 responses)

| # | Company | Sector | Opportunity | Contact |
|---|---------|--------|-------------|---------|
| 10 | **Imza Premium Properties** | Real estate | Luxury agency website | Via PropertyFinder |
| 11 | **Mr. Fixer** | Home maintenance | New website from scratch | Via Real Estate Club Dubai |
| 12 | **ProFix Technical** | Home maintenance | New website from scratch | Via Real Estate Club Dubai |
| 13 | **Magnum Clinic** | Dental | Website improvement + per-location SEO | Via magnumclinic.ae |
| 14 | **Dos Hermanos Accounting** | Accounting/tax | Website redesign positioning 15yr IFRS expertise | Via doshermanosuae.com |
| 15 | **Magnifica Events** | Events | Corporate + wedding website | Via Arabia Weddings |
| 16 | **Sapphire Event Management** | Events | Events website with gallery | Via Arabia Weddings |
| 17 | **Chateauevent Designs** | Events / weddings | Luxury wedding portfolio site | Via Arabia Weddings |
| 18 | **Terra Core Pilates** | Pilates | Boutique studio website | Via Magicpin / ClassPass |
| 19 | **Dhyana Yoga and Pilates** | Yoga | Standalone studio site | Via ClassPass |

---

## 3. OPPORTUNITY SIZING

### Service type breakdown

| Service type | Companies | Estimated fee range (AED) |
|-------------|-----------|---------------------------|
| New website (full) | 11 | 2,500–6,000 |
| Website redesign | 4 | 3,500–6,000 |
| Landing page | 2 | 2,000–3,500 |
| Website improvement (targeted scope) | 2 | 1,500–3,000 |

**Conservative batch revenue if 3 convert at mid-range:** ~AED 15,000–18,000
**Optimistic batch revenue if 6 convert at mid-range:** ~AED 30,000–36,000

*Figures are illustrative. MDA pricing is set per project on first-revenue principles.*

### Verified contacts available for direct outreach now
- **Email verified:** DXB Market (info@dxbmarket.ae), Al-Falah Accounting (info@al-falah-group.com), Creative Shelf (creativeshelf21@gmail.com — Gmail, lower confidence)
- **Phone verified:** The Smile Studio (+971 56 488 8466), Art of Teeth (+971-58-593-3422), DXB Market (+971 585740057)
- **Website contact form:** Magnum Clinic, Dos Hermanos, Khobzah w Fakhaara
- **Directory profile form:** The Property Boutique, Agnieszka Gomoluch, Imza Premium Properties, Mr. Fixer, ProFix Technical, Magnifica Events, Sapphire Event Management, Chateauevent Designs, Flow O2, Terra Core Pilates, Dhyana Yoga

---

## 4. OUTREACH STATUS — INFRASTRUCTURE BLOCKER

**Current status: ALL 19 OUTREACH DRAFTS PREPARED — NONE SENT**

### Why email was not sent from this session

The DREXONYX sales infrastructure requires:

1. **Live DB + orchestration runtime** — `delegateOutreachDrafting()` in
   `lib/agents/sales-discovery-specialist.ts` calls `delegateSubTask()`,
   which requires the DREXONYX server running with the orchestration
   database connected.

2. **Environment variables** — `lib/sales/outreach-sender.ts` reads
   `process.env.RESEND_API_KEY` and `process.env.RESEND_FROM_ADDRESS`.
   These are configured in the server environment, not in this session.

3. **CLAUDE.md constraint** — "Do NOT touch: Sales, Outreach, Resend,
   Database" is a hard constraint in the project operating rules.
   Writing new code to call Resend directly would violate this constraint.

### What is ready for sending

All 19 outreach drafts are written in `LEAD_LIST.md`.
Each draft includes:
- Subject line
- Personalized body referencing the company's specific situation
- Specific MDA service with indicative pricing
- Clear CTA

### How to send

**Option A (recommended) — Use the running server:**
Start the DREXONYX server and invoke `delegateOutreachDrafting()` for each
lead with `channel: 'email'`, `messageType: 'cold_outreach'`.
Standard cold email is auto-approved (NOT_REQUIRED policy) per DR 0128.

**Option B — Manual send from Gmail:**
Copy each draft from `LEAD_LIST.md` and send manually from
drexonyx.studio@gmail.com using the verified contact details in
`PROSPECTS.csv` (sorted by Verification Status to prioritise direct contacts).
Send Tier 1 companies first (rows where Priority = HIGH).

---

## 5. QC NOTES

### What was verified
- All 19 companies confirmed to exist via at least one public source
- Verification tier assigned to each contact (VERIFIED / DIRECTORY / PRESS)
- No contacts marked VERIFIED unless confirmed on the company's own website
- No phone numbers or email addresses were fabricated
- Pricing ranges given in outreach drafts are consistent with MDA's
  first-revenue pricing principles from `AGENCY.md`

### What was NOT verified (do before sending)
- Direct confirmation that companies have no existing website where
  not checked (for Group A–B companies listed as "none found")
- Whether any company is already a known MDA contact or lead
  (check FLASH_DELIVERY_DUBAI_LEADS.csv — confirmed separate sector,
  no overlap — but a live CRM check should be run before sending)
- Arabic-language translation of any outreach content (if sending to
  Arabic-first companies)

### Fabrication check
- **No outreach message contains client-specific facts that were invented.**
  Every detail referenced in each draft (the company name, location,
  directory they appear in, credential they hold, service they offer)
  was sourced from a confirmed public record cited in `LEAD_LIST.md`.
- **No sent results, message IDs, or delivery receipts are reported**
  because no messages were sent. The outreach status is DRAFT only.
- **No replies are reported** for the same reason.

---

## 6. NEXT STEPS

### Immediate (this week)
1. **Choose a send method** (Option A or B above) and send Tier 1 HIGH
   priority companies first — 9 companies
2. **Manually check websites** for three companies before outreach:
   - Mr. Fixer — confirm no own website exists beyond the directory listing
   - ProFix Technical — same
   - Flow O2 — confirm no own website beyond Magicpin
3. **Check for duplicates against existing leads** — run a name check
   against any existing CRM records before sending

### Short-term (next 2 weeks)
4. Send Tier 2 MEDIUM priority companies once Tier 1 is done
5. Follow up with any Tier 1 non-responders at the 7-day mark
6. Track responses and update `PROSPECTS.csv` with send date, reply date,
   sales stage (CONTACTED / REPLIED / MEETING / PROPOSAL / CLOSED)

### Medium-term (month 1–2)
7. Convert any enquiries into project briefs using MDA client intake workflow
8. Update portfolio with completed projects for future outreach credibility
9. Run second research batch across additional sectors:
   - Nurseries and private schools
   - Beauty salons and spas
   - Physiotherapy clinics

---

## 7. FILES IN THIS PROJECT

| File | Contents |
|------|----------|
| `LEAD_LIST.md` | Full lead list — 19 companies with details, source verification, opportunity analysis, and outreach drafts |
| `PROSPECTS.csv` | Spreadsheet-ready export of all 19 prospects with all fields |
| `ACQUISITION_REPORT.md` | This report |

---

*Generated: 2026-10-09 | MDA Client Acquisition Project*
*Research and drafts: Claude Code (acting orchestrator)*
*Sending status: DRAFT READY — SERVER-SIDE EXECUTION REQUIRED*
*Classification: INTERNAL — NOT FOR CLIENT DISTRIBUTION*
