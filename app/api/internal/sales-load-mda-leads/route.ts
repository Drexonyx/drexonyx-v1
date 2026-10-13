// One-shot loader: inserts the 19 pre-researched MDA prospects into the sales DB.
// Idempotent: skips any lead whose primary_source_url already exists in the table.
// Authentication: same CRON_SECRET Bearer token as all other internal cron routes.
//
// Outreach messages created here:
//   - Email leads (3 with verified email): channel='email', approval_status='PENDING'
//     → NOT eligible for auto-send until approval_status is changed to 'NOT_REQUIRED' or 'APPROVED'.
//   - Manual/directory leads (16 without email): channel='manual', approval_status='PENDING'
//     → visible in pipeline dashboard and daily report; not auto-queued.

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { salesLeads, outreachMessages } from '@/db/schema/sales';

export const maxDuration = 60;

// ── Lead definitions ──────────────────────────────────────────────────────────

interface LeadDef {
  business_name: string;
  full_name: string | null;
  city: string;
  country: string;
  primary_source_platform: string;
  primary_source_url: string;
  source_type: 'website' | 'directory' | 'websearch' | 'manual';
  website: string | null;
  public_email: string | null;
  public_contact_method: string;
  lead_score: number;
  priority: 'HOT' | 'WARM' | 'COLD';
  opportunity: string;
  notes: string;
  outreach_channel: 'email' | 'manual';
  outreach_approval: 'NOT_REQUIRED' | 'PENDING';
  outreach_subject: string;
  outreach_body: string;
}

const MDA_LEADS: LeadDef[] = [
  // ── GROUP A — Real Estate Agencies ──────────────────────────────────────────
  {
    business_name: 'The Property Boutique',
    full_name: null,
    city: 'Business Bay, Dubai',
    country: 'AE',
    primary_source_platform: 'propertyfinder',
    primary_source_url: 'propertyfinder.ae/en/agency/the-property-boutique-4959',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via PropertyFinder profile',
    lead_score: 65,
    priority: 'HOT',
    opportunity: 'New agency website with property showcase and lead-capture form',
    notes: 'ORN 59943 (RERA-registered). PropertyFinder profile only, no own domain.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'Your clients Googled you — and found someone else',
    outreach_body: `Hi,

I came across The Property Boutique on PropertyFinder and noticed you don't have your own website yet. That means when a prospect Googles your agency name, they either find nothing or land on the portal — not you.

Master Digital Agency builds agency websites for boutique Dubai brokerages: clean, fast, with property showcase and a lead-capture form. No portal dependency.

We're based in Dubai. I'd be happy to share a quick mockup for your agency if you're open to a brief call.

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'Agnieszka Gomoluch Real Estate',
    full_name: 'Agnieszka Gomoluch',
    city: 'Dubai',
    country: 'AE',
    primary_source_platform: 'propertyfinder',
    primary_source_url: 'propertyfinder.ae/en/agent/agnieszka-gomoluch',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via PropertyFinder profile',
    lead_score: 65,
    priority: 'HOT',
    opportunity: 'Personal brand website — bio + listings + contact form',
    notes: 'Founder-led boutique. PropertyFinder profile only.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'A website that puts you in control of your leads',
    outreach_body: `Hi Agnieszka,

I noticed you're active on PropertyFinder but don't have a personal website. For a founder-led boutique like yours, a well-designed site does two things: builds trust with high-net-worth buyers who research before contacting, and gives you a direct channel that isn't owned by a portal.

Master Digital Agency specialises in clean, conversion-focused websites for Dubai real estate professionals. Small team, fast delivery, priced for boutique agencies.

Worth a quick call this week?

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'Imza Premium Properties',
    full_name: null,
    city: 'Dubai',
    country: 'AE',
    primary_source_platform: 'propertyfinder',
    primary_source_url: 'propertyfinder.ae/en/agency/imza-premium-properties',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via PropertyFinder profile',
    lead_score: 55,
    priority: 'WARM',
    opportunity: 'Luxury agency site with investor guide and lead capture',
    notes: 'Luxury positioning. PropertyFinder profile only.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'A website that matches your premium positioning',
    outreach_body: `Hi,

I came across Imza Premium Properties on PropertyFinder. For a luxury positioning like yours, the portal page alone undersells the brand — your clients expect to find a dedicated site when they Google you.

We build premium agency websites for boutique Dubai brokerages, including property showcase, investor guides, and WhatsApp lead capture. Typically ready in 10–14 days.

Happy to share examples of our work.

Master Digital Agency
drexonyx.com/mda`,
  },

  // ── GROUP B — Home Maintenance ───────────────────────────────────────────────
  {
    business_name: 'DXB Market',
    full_name: null,
    city: 'Al Barsha, Dubai',
    country: 'AE',
    primary_source_platform: 'website',
    primary_source_url: 'dxbmarket.ae',
    source_type: 'website',
    website: 'dxbmarket.ae',
    public_email: 'info@dxbmarket.ae',
    public_contact_method: 'Email or phone',
    lead_score: 80,
    priority: 'HOT',
    opportunity: 'Website redesign with service pages per job type and WhatsApp booking',
    notes: 'Verified contact from own website. Phone: +971 585740057.',
    outreach_channel: 'email',
    outreach_approval: 'PENDING',
    outreach_subject: 'Your website could book more jobs automatically',
    outreach_body: `Hi DXB Market team,

I visited dxbmarket.ae — you're clearly established in Al Barsha. The opportunity I see: a service page per job type (AC, plumbing, painting) with a WhatsApp booking button on each one would let you capture leads at the moment someone searches "AC repair Al Barsha" without them having to call first.

Master Digital Agency builds exactly this for home services companies in Dubai. I'd be happy to put together a focused scope and quote once I understand your goals.

Are you looking to improve the site in the next month or two?

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'Mr. Fixer',
    full_name: null,
    city: 'Al Quoz, Dubai',
    country: 'AE',
    primary_source_platform: 'realestateclubdubai',
    primary_source_url: 'realestateclubdubai.com',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via directory listing',
    lead_score: 65,
    priority: 'HOT',
    opportunity: 'New website replacing directory presence with service pages and booking',
    notes: 'Founded 2023. Directory listing only.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'Turning your directory listing into real leads',
    outreach_body: `Hi Mr. Fixer team,

I found you through the Real Estate Club Dubai directory. A lot of customers in Dubai won't call a number from a directory — they want to see a website first. If someone searches "handyman Al Quoz", a proper website with your services and a WhatsApp button is the difference between getting the call and losing it.

We build professional websites for home services companies, starting from AED 2,500. Two to three week delivery.

Happy to share what one looks like in practice.

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'ProFix Technical',
    full_name: null,
    city: 'Al Quoz, Dubai',
    country: 'AE',
    primary_source_platform: 'realestateclubdubai',
    primary_source_url: 'realestateclubdubai.com/profixtech',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via directory listing',
    lead_score: 55,
    priority: 'WARM',
    opportunity: 'New website replacing directory presence',
    notes: 'Directory listing only. No own website confirmed.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'Replacing your directory listing with a website that converts',
    outreach_body: `Hi ProFix Technical team,

Found you on the Real Estate Club Dubai directory. For technical services companies in Al Quoz, the companies winning new residential clients are the ones with their own website — service pages, photos of work, and a quick WhatsApp button.

We build these for home services companies in Dubai, typically AED 2,500–4,000 and ready within two weeks.

Worth a quick conversation?

Master Digital Agency
drexonyx.com/mda`,
  },

  // ── GROUP C — Dental Clinics ─────────────────────────────────────────────────
  {
    business_name: 'The Smile Studio Dental Clinic',
    full_name: null,
    city: 'Al Barsha, Dubai',
    country: 'AE',
    primary_source_platform: 'zavis',
    primary_source_url: 'zavis.ai/smile-studio-dental-clinic-dubai',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Phone or walk-in',
    lead_score: 65,
    priority: 'HOT',
    opportunity: 'Appointment booking site with services gallery and WhatsApp CTA',
    notes: 'Phone: +971 56 488 8466. Directory listing (zavis.ai, Apr 2026).',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: "Your clinic's website could fill your appointment book",
    outreach_body: `Hi Smile Studio team,

A lot of dental patients in Dubai decide where to book before they call — they read reviews, check photos, and look at services online. A well-structured clinic website with a WhatsApp booking button and a treatments gallery makes that decision easy.

Master Digital Agency builds clinic websites for Dubai practices: services page, before/after gallery, patient FAQ, and direct booking. Typical investment AED 3,500–6,000.

Would you be open to seeing an example for a dental clinic?

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'Art of Teeth',
    full_name: null,
    city: 'Al Barsha 1, Dubai',
    country: 'AE',
    primary_source_platform: 'directory',
    primary_source_url: 'dubai-directory/art-of-teeth',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Phone or walk-in',
    lead_score: 65,
    priority: 'HOT',
    opportunity: 'Treatments page + patient testimonials + online booking',
    notes: 'Phone: +971-58-593-3422. Located Barsha Business Square.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: "Turning your clinic's name into bookings",
    outreach_body: `Hi Art of Teeth team,

Found your clinic in the Al Barsha area. If someone searches "cosmetic dentist Al Barsha" today, does your website come up? If the answer is no or "only on Google Maps," there's a clear opportunity to capture those searches directly.

We specialise in clinic websites for Dubai practices — treatment pages, patient testimonials, and a booking flow that turns website visitors into confirmed appointments.

Happy to share a quick site outline for Art of Teeth.

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'Magnum Clinic',
    full_name: null,
    city: 'JVC / JLT / DSO, Dubai',
    country: 'AE',
    primary_source_platform: 'website',
    primary_source_url: 'magnumclinic.ae',
    source_type: 'website',
    website: 'magnumclinic.ae',
    public_email: null,
    public_contact_method: 'Via website contact form',
    lead_score: 55,
    priority: 'WARM',
    opportunity: 'Per-location paediatric pages + improved booking flow',
    notes: 'Multi-location dental clinic (JVC, JLT, DSO). Own website exists.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'A quick improvement to magnumclinic.ae that could fill more slots',
    outreach_body: `Hi Magnum Clinic team,

I looked at magnumclinic.ae — you're clearly well-established across JVC, JLT and DSO. One thing I noticed: the appointment booking flow could be simplified, and a dedicated paediatric dentistry page per location would help you rank for "[area] paediatric dentist" searches.

Master Digital Agency does targeted website improvement projects — one or two specific changes that improve booking conversions. We're not pitching a full rebuild; this would be a focused scope at AED 1,500–3,000.

Open to a quick look together?

Master Digital Agency
drexonyx.com/mda`,
  },

  // ── GROUP D — Accounting & Tax ───────────────────────────────────────────────
  {
    business_name: 'Al-Falah Accounting and Bookkeeping',
    full_name: null,
    city: 'Dubai',
    country: 'AE',
    primary_source_platform: 'directory',
    primary_source_url: 'uae-directory/al-falah-group',
    source_type: 'directory',
    website: null,
    public_email: 'info@al-falah-group.com',
    public_contact_method: 'Email',
    lead_score: 80,
    priority: 'HOT',
    opportunity: 'Credibility site with corporate tax services and team credentials',
    notes: 'Phone: +971 561230464. Email confirmed in directory.',
    outreach_channel: 'email',
    outreach_approval: 'PENDING',
    outreach_subject: 'A professional website that brings in Corporate Tax enquiries',
    outreach_body: `Hi Al-Falah team,

Since UAE Corporate Tax came into effect, more businesses are actively searching for qualified accounting firms online. If a prospect searches "corporate tax consultant Dubai" and can't find a professional website for your firm, they move to the next result.

Master Digital Agency builds professional services websites for accounting firms in the UAE: services overview, regulatory credentials, team bio, and a clear enquiry form. I'd be happy to tailor a scope to your firm's priorities once we connect.

I'd be happy to share a brief outline for al-falah-group.com.

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'Dos Hermanos Accounting & Tax Consultants',
    full_name: null,
    city: 'Dubai',
    country: 'AE',
    primary_source_platform: 'website',
    primary_source_url: 'doshermanosuae.com',
    source_type: 'website',
    website: 'doshermanosuae.com',
    public_email: null,
    public_contact_method: 'Via website',
    lead_score: 55,
    priority: 'WARM',
    opportunity: '15yr IFRS expertise positioned correctly — credentials + CTA',
    notes: '15+ years IFRS experience. Own website exists.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'Does doshermanosuae.com reflect 15 years of IFRS expertise?',
    outreach_body: `Hi Dos Hermanos team,

I read about your 15+ years of IFRS experience. For a firm with that track record, the website is often the one asset that either reinforces the expertise or undercuts it before a first meeting.

Master Digital Agency works with professional services firms in Dubai to position them correctly online — credentials front and centre, clear services, and an easy first contact.

Would you be open to a quick review of what doshermanosuae.com communicates today versus what it could?

Master Digital Agency
drexonyx.com/mda`,
  },

  // ── GROUP E — Interior Design ────────────────────────────────────────────────
  {
    business_name: 'Creative Shelf LLC',
    full_name: null,
    city: 'Dubai',
    country: 'AE',
    primary_source_platform: 'website',
    primary_source_url: 'creativeshelf.ae',
    source_type: 'website',
    website: 'creativeshelf.ae',
    public_email: 'creativeshelf21@gmail.com',
    public_contact_method: 'Email or website',
    lead_score: 75,
    priority: 'HOT',
    opportunity: 'Portfolio site redesign + branded email replacing Gmail',
    notes: 'Founded 2007. Gmail business email — noted weak professional signal.',
    outreach_channel: 'email',
    outreach_approval: 'PENDING',
    outreach_subject: 'Your 2007 portfolio deserves a better showcase',
    outreach_body: `Hi Creative Shelf team,

I found creativeshelf.ae and noticed you've been in interior design since 2007 — that's a strong portfolio to build on. A redesigned showcase site with project filters, case studies, and a professional consultation booking flow would do real justice to that body of work and help you attract the commercial clients your projects are suited for.

Master Digital Agency redesigns interior design studio websites to properly showcase project portfolios and convert website visitors into enquiries. We can also help set up a branded email to complement the new site.

Happy to share a mockup concept.

Master Digital Agency
drexonyx.com/mda`,
  },

  // ── GROUP F — Event Management ───────────────────────────────────────────────
  {
    business_name: 'Magnifica Events',
    full_name: null,
    city: 'Dubai',
    country: 'AE',
    primary_source_platform: 'arabiaweddings',
    primary_source_url: 'arabiaweddings.com/dubai/vendors/planners/magnifica-events',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via Arabia Weddings profile',
    lead_score: 55,
    priority: 'WARM',
    opportunity: 'Corporate + wedding events site with gallery and enquiry flow',
    notes: 'Arabia Weddings directory. No own website confirmed.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'Moving Magnifica Events beyond the directory listing',
    outreach_body: `Hi Magnifica Events team,

I came across your listing on Arabia Weddings. For an events company targeting both weddings and corporate clients, a dedicated website does something the directory can't: it positions you for the corporate client who searches "event management company Dubai" and doesn't start on a wedding directory.

Master Digital Agency builds events company websites with portfolio galleries, service tiers, and an enquiry flow for both corporate and private clients.

Worth a conversation?

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'Sapphire Event Management',
    full_name: null,
    city: 'Dubai',
    country: 'AE',
    primary_source_platform: 'arabiaweddings',
    primary_source_url: 'arabiaweddings.com/dubai/vendors/planners/sapphire-event-management',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via Arabia Weddings profile',
    lead_score: 55,
    priority: 'WARM',
    opportunity: 'Events website with gallery + testimonials + enquiry form',
    notes: 'Arabia Weddings directory. Weddings and corporate events.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'A website that works as hard as your events do',
    outreach_body: `Hi Sapphire team,

Found you on Arabia Weddings. Event companies with a strong own website convert cold enquiries at a significantly higher rate than those with only a directory profile — because it's the first thing a corporate client checks before picking up the phone.

Master Digital Agency specialises in events company websites: event gallery, testimonials, package tiers, and a clear enquiry flow. Delivery in 10–14 days.

Happy to send a few examples.

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'Chateauevent Designs',
    full_name: null,
    city: 'Dubai',
    country: 'AE',
    primary_source_platform: 'arabiaweddings',
    primary_source_url: 'arabiaweddings.com/dubai/wedding-planners/chateauevent-designs',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via Arabia Weddings profile',
    lead_score: 55,
    priority: 'WARM',
    opportunity: 'Luxury wedding portfolio website with consultation booking',
    notes: 'Arabia Weddings directory. Wedding design, luxury segment.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'Giving Chateauevent Designs the website it deserves',
    outreach_body: `Hi Chateauevent team,

I found your work on Arabia Weddings. For a wedding design company positioning in the luxury segment, the website is the portfolio — clients will scroll it before they book a call.

Master Digital Agency builds luxury-positioned event company websites with visual galleries, designer bio, service packages, and a consultation booking flow.

I'd love to share what that could look like for Chateauevent.

Master Digital Agency
drexonyx.com/mda`,
  },

  // ── GROUP G — Pilates & Yoga Studios ────────────────────────────────────────
  {
    business_name: 'Flow O2',
    full_name: null,
    city: 'Arjan, Al Barsha South, Dubai',
    country: 'AE',
    primary_source_platform: 'magicpin',
    primary_source_url: 'magicpin.in/Dubai/flow-o2',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via Magicpin profile',
    lead_score: 65,
    priority: 'HOT',
    opportunity: 'Class schedule + membership + WhatsApp direct booking landing page',
    notes: 'Ladies-only pilates. 4.8 stars, 70 reviews on Magicpin.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'A booking page that keeps your revenue in-house',
    outreach_body: `Hi Flow O2 team,

Found you on Magicpin — 4.8 stars from 70 reviews is excellent. One thing worth considering: every booking that comes through ClassPass or a third-party app costs you a commission. A simple, well-designed landing page with your class schedule and a direct WhatsApp booking button keeps 100% of that booking with you.

Master Digital Agency builds fitness studio landing pages that work on mobile, load fast, and convert. Investment from AED 2,000 for a landing page.

Worth a quick look?

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'Terra Core Pilates',
    full_name: null,
    city: 'Dubai Design District (d3)',
    country: 'AE',
    primary_source_platform: 'magicpin',
    primary_source_url: 'magicpin.in/Dubai/terra-core-pilates',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via booking platforms',
    lead_score: 55,
    priority: 'WARM',
    opportunity: 'Boutique studio site — class types + instructor bios + booking',
    notes: 'Reformer pilates. Dubai Design District (d3) location.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'Your d3 studio deserves a d3-quality website',
    outreach_body: `Hi Terra Core team,

Dubai Design District is one of the most design-conscious addresses in the city — your clients expect a website that matches the boutique experience in-studio.

Master Digital Agency builds boutique fitness studio websites: class schedule, reformer intro, instructor bios, membership packages, and direct booking integration.

Happy to share a concept for Terra Core.

Master Digital Agency
drexonyx.com/mda`,
  },
  {
    business_name: 'Dhyana Yoga and Pilates',
    full_name: null,
    city: 'Business Bay, Dubai',
    country: 'AE',
    primary_source_platform: 'classpass',
    primary_source_url: 'classpass.com/studios/dhyana-yoga-pilates-dubai',
    source_type: 'directory',
    website: null,
    public_email: null,
    public_contact_method: 'Via ClassPass',
    lead_score: 55,
    priority: 'WARM',
    opportunity: 'Standalone studio site separate from hotel brand with direct booking',
    notes: 'Hotel-based yoga + pilates. Business Bay. ClassPass listing.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'A standalone website that builds your own audience',
    outreach_body: `Hi Dhyana team,

Found your studio on ClassPass. For a yoga and pilates practice in Business Bay, a standalone website (separate from the hotel) builds your own audience and lets you take direct bookings, grow a waitlist, and sell memberships without the platform fee.

Master Digital Agency builds yoga and wellness studio websites. Fast, mobile-first, with class schedule and direct booking.

Happy to share examples.

Master Digital Agency
drexonyx.com/mda`,
  },

  // ── GROUP H — Catering ───────────────────────────────────────────────────────
  {
    business_name: 'Khobzah w Fakhaara',
    full_name: null,
    city: 'Dubai',
    country: 'AE',
    primary_source_platform: 'website',
    primary_source_url: 'khobzahfakhaara.com',
    source_type: 'website',
    website: 'khobzahfakhaara.com',
    public_email: null,
    public_contact_method: 'Via website contact form',
    lead_score: 65,
    priority: 'HOT',
    opportunity: 'Corporate catering landing page — Golden Certificate prominent + enquiry form',
    notes: 'Dubai Municipality Golden Certificate (food safety). Corporate + Middle Eastern catering.',
    outreach_channel: 'manual',
    outreach_approval: 'PENDING',
    outreach_subject: 'Your Dubai Municipality certificate could be winning more corporate clients',
    outreach_body: `Hi Khobzah w Fakhaara team,

I visited khobzahfakhaara.com. The Dubai Municipality Golden Certificate is a strong trust signal — very few catering companies in Dubai have it, and it should be the first thing a corporate client sees when they land on your site.

Master Digital Agency does focused website improvements for catering companies: corporate enquiry form, menu showcase, certificate and credentials front and centre, and a clear CTA for corporate event enquiries. Targeted scope, AED 1,500–3,500.

Happy to show you what that looks like in practice.

Master Digital Agency
drexonyx.com/mda`,
  },
];

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let loaded = 0;
  let skipped = 0;
  const errors: string[] = [];
  const leads: Array<{ business_name: string; status: 'loaded' | 'skipped' | 'error'; id?: string }> = [];

  for (const lead of MDA_LEADS) {
    try {
      // Idempotency check: skip if this source URL already exists
      const existing = await db
        .select({ id: salesLeads.id })
        .from(salesLeads)
        .where(eq(salesLeads.primary_source_url, lead.primary_source_url))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        leads.push({ business_name: lead.business_name, status: 'skipped', id: existing[0].id });
        continue;
      }

      // Insert the lead
      const inserted = await db
        .insert(salesLeads)
        .values({
          business_name: lead.business_name,
          full_name: lead.full_name,
          city: lead.city,
          country: lead.country,
          primary_source_platform: lead.primary_source_platform,
          primary_source_url: lead.primary_source_url,
          source_type: lead.source_type,
          website: lead.website,
          public_email: lead.public_email,
          public_contact_method: lead.public_contact_method,
          lead_score: lead.lead_score,
          priority: lead.priority,
          status: 'QUALIFIED',
          opportunity: lead.opportunity,
          notes: lead.notes,
          discovered_by: 'human',
        })
        .returning({ id: salesLeads.id });

      const leadId = inserted[0].id;

      // Insert outreach message
      await db.insert(outreachMessages).values({
        lead_id: leadId,
        channel: lead.outreach_channel,
        message_type: 'cold_outreach',
        message_text: `Subject: ${lead.outreach_subject}\n\n${lead.outreach_body}`,
        status: 'DRAFT',
        approval_status: lead.outreach_approval,
      });

      loaded++;
      leads.push({ business_name: lead.business_name, status: 'loaded', id: leadId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${lead.business_name}: ${msg}`);
      leads.push({ business_name: lead.business_name, status: 'error' });
    }
  }

  return NextResponse.json({
    loaded,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    leads,
  });
}
