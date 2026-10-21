// Canonical MDA service catalog — single source of truth.
// Used by: /app/mda/page.tsx (website), WhatsApp classify skill, task routing.
// Source: CONFIRMED—USER (owner-approved prices, 2026-10-21)
// DO NOT invent prices, deliverables, or scopes not listed here.

export type PricingModel = 'fixed' | 'starting-from' | 'monthly' | 'quote-based';
export type ApprovalStatus = 'confirmed' | 'owner-approval-required';
export type ServiceBrand = 'MDA' | 'DREXONYX';

export interface ServiceEntry {
  id: string;
  brand: ServiceBrand;
  category: string;
  name: string;
  nameAr: string;
  price: number | null;
  currency: 'AED';
  pricingModel: PricingModel;
  priceDisplay: string;
  description: string;
  deliverables: readonly string[];
  exclusions?: readonly string[];
  scopeNotes?: string;
  /** Keywords used by the WhatsApp classifier and routing logic. */
  whatsappKeywords: readonly string[];
  approvalStatus: ApprovalStatus;
  approvalNote?: string;
}

// ─── MDA — Branding & Identity ────────────────────────────────────────────────

const BRANDING: ServiceEntry[] = [
  {
    id: 'mda-logo-basic',
    brand: 'MDA',
    category: 'Branding & Identity',
    name: 'Basic Logo Design',
    nameAr: 'تصميم شعار أساسي',
    price: 99,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 99',
    description:
      'A clean, professional logo delivered in standard formats — suitable for business cards, social media, and digital use.',
    deliverables: [
      'Custom logo design (1 concept, up to 2 revision rounds)',
      'Final files: PNG (transparent), JPG, PDF vector',
      'Black/white and colour variants',
    ],
    exclusions: [
      'Brand colours and fonts not included (see Logo + Brand Identity)',
      'Printed materials not included',
    ],
    scopeNotes: 'Client must supply any preferred colours, tagline, and reference examples.',
    whatsappKeywords: [
      'logo', 'شعار', 'لوقو', 'logo design', 'تصميم شعار', 'brand logo',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-logo-brand',
    brand: 'MDA',
    category: 'Branding & Identity',
    name: 'Logo + Brand Colours & Fonts',
    nameAr: 'شعار + ألوان وخطوط العلامة التجارية',
    price: 249,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 249',
    description:
      'A complete brand kit — logo with defined brand colours and typography to keep your business visually consistent across all touchpoints.',
    deliverables: [
      'Custom logo design (1–2 concepts, up to 3 revision rounds)',
      'Brand colour palette (primary + secondary)',
      'Typography selection (2 fonts)',
      'Brand usage guidelines (1-page PDF)',
      'Final logo files: PNG, JPG, PDF vector',
    ],
    exclusions: [
      'Full brand identity guidelines document not included (see Visual Identity)',
      'Printed materials not included',
    ],
    scopeNotes: 'Client must supply business name, tagline (if any), and any brand direction.',
    whatsappKeywords: [
      'brand', 'branding', 'brand kit', 'brand identity', 'علامة تجارية', 'هوية بصرية',
      'brand colours', 'brand fonts', 'logo brand',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-visual-identity',
    brand: 'MDA',
    category: 'Branding & Identity',
    name: 'Basic Visual Identity',
    nameAr: 'هوية بصرية أساسية',
    price: 349,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 349',
    description:
      'A foundational visual identity — everything a business needs to look consistent and professional across digital and print.',
    deliverables: [
      'Custom logo design (2 concepts, up to 3 revision rounds)',
      'Brand colour palette + typography',
      'Business card design (print-ready)',
      'Social media profile images (Facebook, Instagram, WhatsApp)',
      'Brand usage guide (PDF)',
      'All final files included',
    ],
    exclusions: [
      'Printing costs not included',
      'Extended brand collateral (letterhead, envelopes) not included',
    ],
    scopeNotes: 'Client must supply business name, tagline (if any), and any existing brand assets.',
    whatsappKeywords: [
      'visual identity', 'هوية بصرية', 'brand identity', 'complete branding', 'brand package',
      'identity design', 'identity package', 'full brand package',
    ],
    approvalStatus: 'confirmed',
  },
];

// ─── MDA — Company Profiles ───────────────────────────────────────────────────

const COMPANY_PROFILES: ServiceEntry[] = [
  {
    id: 'mda-profile-4p',
    brand: 'MDA',
    category: 'Company Profiles',
    name: 'Company Profile — 4 Pages',
    nameAr: 'بروفايل شركة — 4 صفحات',
    price: 60,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 60',
    description:
      'A concise, professional company profile — ideal for startups, freelancers, and SMEs needing a quick, polished introduction.',
    deliverables: [
      '4-page designed PDF (Cover, About Us, Services, Contact)',
      'Print-ready and digital PDF',
      '1 revision round',
    ],
    exclusions: ['Photography and copywriting not included'],
    scopeNotes:
      'Client must supply all text, company logo, and images. MDA will layout and design only.',
    whatsappKeywords: [
      'company profile', 'بروفايل شركة', 'profile', 'company brochure', 'business profile',
      'company presentation', 'كومباني بروفايل', 'بروفيل', 'بروفايل',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-profile-8p',
    brand: 'MDA',
    category: 'Company Profiles',
    name: 'Company Profile — 8 Pages',
    nameAr: 'بروفايل شركة — 8 صفحات',
    price: 160,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 160',
    description:
      'A complete company profile with space for portfolio, team highlights, and detailed service descriptions.',
    deliverables: [
      '8-page designed PDF (custom layout)',
      'Print-ready and digital PDF',
      '2 revision rounds',
    ],
    exclusions: ['Photography and copywriting not included'],
    scopeNotes:
      'Client must supply all text, company logo, and images. MDA will layout and design only.',
    whatsappKeywords: [
      'company profile', 'بروفايل', 'profile 8 pages', 'company catalogue', '8 page profile',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-profile-12p',
    brand: 'MDA',
    category: 'Company Profiles',
    name: 'Company Profile — 12 Pages',
    nameAr: 'بروفايل شركة — 12 صفحات',
    price: 249,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 249',
    description:
      'A comprehensive company profile — suitable for established businesses, investor presentations, and enterprise pitches.',
    deliverables: [
      '12-page designed PDF (custom layout)',
      'Print-ready and digital PDF',
      '3 revision rounds',
    ],
    exclusions: ['Photography and copywriting not included'],
    scopeNotes:
      'Client must supply all text, company logo, and images. MDA will layout and design only.',
    whatsappKeywords: [
      'company profile', 'profile 12', 'بروفايل كبير', 'full company profile', 'investor profile',
    ],
    approvalStatus: 'confirmed',
  },
];

// ─── MDA — Graphic Design ─────────────────────────────────────────────────────

const GRAPHIC_DESIGN: ServiceEntry[] = [
  {
    id: 'mda-poster-flyer',
    brand: 'MDA',
    category: 'Graphic Design',
    name: 'Poster or Flyer',
    nameAr: 'بوستر أو فلاير',
    price: 49,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 49',
    description:
      'A single poster or flyer design — for promotions, events, offers, or announcements.',
    deliverables: [
      '1 poster or flyer design (A4 or social-media size)',
      '1 revision round',
      'Print-ready PDF + digital JPG/PNG',
    ],
    exclusions: ['Printing costs not included', 'Photography not included'],
    scopeNotes: 'Client must supply all text and any required images/photos.',
    whatsappKeywords: [
      'poster', 'flyer', 'بوستر', 'فلاير', 'تصميم بوستر', 'design poster',
      'promotion design', 'offer design', 'تصميم عرض', 'event poster',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-brochure',
    brand: 'MDA',
    category: 'Graphic Design',
    name: 'Simple Brochure',
    nameAr: 'بروشور بسيط',
    price: 99,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 99',
    description:
      'A bi-fold or tri-fold brochure for services, products, or business introduction.',
    deliverables: [
      'Bi-fold or tri-fold brochure design',
      '2 revision rounds',
      'Print-ready PDF + digital version',
    ],
    exclusions: ['Printing costs not included', 'Photography and copywriting not included'],
    scopeNotes: 'Client must supply all text and images.',
    whatsappKeywords: [
      'brochure', 'بروشور', 'تصميم بروشور', 'pamphlet', 'tri fold', 'bifold', 'flyer brochure',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-catalogue',
    brand: 'MDA',
    category: 'Graphic Design',
    name: 'Product Catalogue — 10 Pages',
    nameAr: 'كتالوج منتجات — 10 صفحات',
    price: 249,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 249',
    description:
      'A professional product catalogue — up to 10 pages, suitable for retail, wholesale, and B2B presentations.',
    deliverables: [
      '10-page product catalogue design',
      '2 revision rounds',
      'Print-ready PDF + digital PDF',
    ],
    exclusions: ['Photography and copywriting not included'],
    scopeNotes:
      'Client must supply product images, descriptions, and prices. MDA designs the layout only.',
    whatsappKeywords: [
      'catalogue', 'catalog', 'product catalogue', 'كتالوج', 'product catalog', 'menu design',
      'كتالوج منتجات', 'تصميم كتالوج', 'product list design',
    ],
    approvalStatus: 'confirmed',
  },
];

// ─── MDA — Advertising Campaigns ─────────────────────────────────────────────

const ADVERTISING: ServiceEntry[] = [
  {
    id: 'mda-ads-setup',
    brand: 'MDA',
    category: 'Advertising Campaigns',
    name: 'Advertising Campaign Setup',
    nameAr: 'إعداد حملة إعلانية',
    price: 149,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 149 per campaign',
    description:
      'Full setup of one advertising campaign on Meta (Facebook/Instagram) or Google — ready for you to launch and manage your own spend.',
    deliverables: [
      'Campaign and ad set structure configured',
      'Audience targeting (demographics, interests, custom audiences)',
      'Ad creative uploaded and formatted for platform',
      'Pixel / conversion tracking setup (where applicable)',
      'Campaign brief and setup documentation',
    ],
    exclusions: [
      'Advertising spend is separate — paid by the client directly to the platform',
      'Ongoing campaign management not included (see Campaign Management)',
      'Ad creative design not included unless specified',
    ],
    scopeNotes:
      'Advertising spend is NOT an MDA fee. MDA charges AED 149 to set up the campaign structure only. Client pays advertising spend directly to Meta or Google.',
    whatsappKeywords: [
      'campaign setup', 'ads setup', 'إعداد حملة', 'facebook ads', 'instagram ads',
      'google ads', 'إعلانات', 'campaign', 'advertising setup', 'run ads', 'تشغيل إعلانات',
      'paid ads', 'إعلان', 'ad campaign',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-ads-management',
    brand: 'MDA',
    category: 'Advertising Campaigns',
    name: 'Advertising Campaign Management',
    nameAr: 'إدارة حملة إعلانية',
    price: 299,
    currency: 'AED',
    pricingModel: 'monthly',
    priceDisplay: 'AED 299 / month (1 campaign)',
    description:
      'Active management of one advertising campaign per month — monitoring, optimisation, and reporting, so your budget delivers results.',
    deliverables: [
      'Campaign performance monitoring (weekly)',
      'Bid and budget optimisation',
      'Audience refinement',
      'Monthly performance report',
      'Recommendations for next month',
    ],
    exclusions: [
      'Advertising spend is separate — paid by the client directly to the platform',
      'Ad creative design not included unless specified',
      'Covers one campaign only — additional campaigns are priced separately',
    ],
    scopeNotes:
      'MDA charges AED 299/month as a service fee only. Advertising spend is paid by the client directly to Meta or Google — this is completely separate from MDA fees. Recommended advertising budget is determined by the client\'s objective, audience size, campaign duration, and platform — typically starting from AED 500–1,000/month for results, but there is no mandatory minimum.',
    whatsappKeywords: [
      'campaign management', 'ads management', 'إدارة إعلانات', 'manage ads', 'monthly ads',
      'social media ads', 'advertising management', 'manage campaign', 'paid social',
    ],
    approvalStatus: 'confirmed',
  },
];

// ─── MDA — Social Media Management ───────────────────────────────────────────

const SOCIAL_MEDIA: ServiceEntry[] = [
  {
    id: 'mda-social-1p',
    brand: 'MDA',
    category: 'Social Media Management',
    name: 'One Platform Management',
    nameAr: 'إدارة منصة واحدة',
    price: 549,
    currency: 'AED',
    pricingModel: 'monthly',
    priceDisplay: 'AED 549 / month',
    description:
      'Full social media management for one platform (Facebook, Instagram, or LinkedIn) — content planning, posting, and basic engagement monitoring.',
    deliverables: [
      'Monthly content calendar',
      'Up to 12 posts per month (static or carousel)',
      'Captions in Arabic and/or English',
      'Posting and scheduling',
      'Monthly performance summary',
    ],
    exclusions: [
      'Paid advertising not included (see Advertising Campaign Management)',
      'Photography and video production not included',
      'Customer service or comment replies not included',
    ],
    scopeNotes:
      'Scope covers content design, copywriting, and scheduling only. Client must supply product images or provide access to their media library.',
    whatsappKeywords: [
      'social media management', 'manage social media', 'إدارة سوشيال ميديا', 'social media',
      'instagram management', 'facebook management', 'linkedin management',
      'social media monthly', 'إدارة انستقرام', 'إدارة فيسبوك', 'content management',
      'post schedule', 'monthly posts',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-social-2p',
    brand: 'MDA',
    category: 'Social Media Management',
    name: 'Two Platforms Management',
    nameAr: 'إدارة منصتين',
    price: 899,
    currency: 'AED',
    pricingModel: 'monthly',
    priceDisplay: 'AED 899 / month',
    description:
      'Full social media management for two platforms — coordinated content strategy, posting, and monthly reporting.',
    deliverables: [
      'Monthly content calendar (both platforms)',
      'Up to 12 posts per platform per month (static or carousel)',
      'Captions in Arabic and/or English',
      'Posting and scheduling across both platforms',
      'Monthly performance summary',
    ],
    exclusions: [
      'Paid advertising not included',
      'Photography and video production not included',
      'Customer service or comment replies not included',
    ],
    scopeNotes:
      'Covers Facebook + Instagram, or Instagram + LinkedIn, or any two agreed platforms.',
    whatsappKeywords: [
      'two platforms', 'two social media', 'منصتين', 'instagram facebook management',
      'social media package', 'manage two platforms', 'two channels',
    ],
    approvalStatus: 'confirmed',
  },
];

// ─── MDA — Research Services ─────────────────────────────────────────────────

const RESEARCH: ServiceEntry[] = [
  {
    id: 'mda-research-product',
    brand: 'MDA',
    category: 'Research Services',
    name: 'Product or Supplier Research',
    nameAr: 'بحث منتج أو مورد',
    price: 99,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 99',
    description:
      'A clearly scoped research task — product sourcing, supplier identification, or vendor comparison for a defined category or product type.',
    deliverables: [
      'Research report (PDF or document)',
      'Up to 10 suppliers or product options identified',
      'Key details: pricing, location, contact, minimums',
      'Summary and recommendation',
    ],
    exclusions: ['Ongoing supplier management not included', 'Negotiation not included'],
    scopeNotes:
      'Scope covers one product category or supplier type. Extended research tasks (multiple categories) are priced separately.',
    whatsappKeywords: [
      'supplier research', 'product research', 'بحث مورد', 'بحث منتج', 'sourcing',
      'find supplier', 'research', 'supplier list', 'vendor research', 'find products',
      'بحث عن موردين',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-research-market',
    brand: 'MDA',
    category: 'Research Services',
    name: 'Market & Competitor Research',
    nameAr: 'بحث سوق ومنافسين',
    price: 199,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 199',
    description:
      'A focused market and competitor analysis — understand your market, benchmark competitors, and identify positioning opportunities.',
    deliverables: [
      'Market overview (size, trends, key segments)',
      'Competitor profiles (up to 5 competitors)',
      'Pricing and offering comparison',
      'Positioning gaps and opportunities',
      'Summary report (PDF)',
    ],
    exclusions: ['Ongoing market monitoring not included', 'Primary research (surveys) not included'],
    scopeNotes: 'Covers one market/industry in the UAE or GCC region.',
    whatsappKeywords: [
      'market research', 'competitor research', 'بحث سوق', 'بحث منافسين', 'market analysis',
      'competitive analysis', 'competitor analysis', 'market study', 'industry research',
      'تحليل المنافسين', 'تحليل السوق',
    ],
    approvalStatus: 'confirmed',
  },
];

// ─── MDA — Digital Launch Kit ─────────────────────────────────────────────────

const LAUNCH_KIT: ServiceEntry[] = [
  {
    id: 'mda-launch-kit',
    brand: 'MDA',
    category: 'Digital Launch Kit',
    name: 'Digital Launch Kit',
    nameAr: 'حزمة الإطلاق الرقمي',
    price: 699,
    currency: 'AED',
    pricingModel: 'starting-from',
    priceDisplay: 'Starting from AED 699',
    description:
      'Everything a new business needs to launch with a professional digital presence — bundled at a reduced combined price.',
    deliverables: [
      'Basic Logo Design (AED 99 value)',
      'Company Profile — 4 pages (AED 60 value)',
      '3 × Social Media Poster or Flyer designs (AED 147 value)',
      'Social media profile images — cover + avatar (2 platforms)',
      'Launch-ready asset folder with all final files',
    ],
    exclusions: [
      'Website not included — website packages are priced separately',
      'Photography and copywriting not included',
      'Advertising spend not included',
    ],
    scopeNotes:
      'Client must supply business name, tagline, contact info, and any existing brand materials. Higher-value kit configurations (with website, branding, or management) are available — contact us for a custom quote.',
    whatsappKeywords: [
      'launch kit', 'digital launch', 'حزمة إطلاق', 'business launch', 'startup package',
      'new business package', 'launch package', 'business starter', 'start business',
      'حزمة بداية', 'launch bundle',
    ],
    approvalStatus: 'confirmed',
  },
];

// ─── MDA — Website Packages ───────────────────────────────────────────────────

const WEBSITES: ServiceEntry[] = [
  {
    id: 'mda-website-starter',
    brand: 'MDA',
    category: 'Website Packages',
    name: 'Starter Website',
    nameAr: 'موقع ويب أساسي',
    price: 599,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 599',
    description: 'Get online. Look professional.',
    deliverables: [
      'Static website, up to 5 pages',
      'Mobile-responsive design',
      'Contact form & location map',
      'Menu or services section',
      '1 maintenance round per month',
    ],
    whatsappKeywords: [
      'website', 'موقع', 'موقع ويب', 'web design', 'تصميم موقع', 'website design',
      '5 page website', 'basic website', 'simple website', 'موقع بسيط', 'starter website',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-website-professional',
    brand: 'MDA',
    category: 'Website Packages',
    name: 'Professional Website',
    nameAr: 'موقع ويب احترافي',
    price: 899,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 899',
    description: 'Ongoing support. More capability.',
    deliverables: [
      'Monthly maintenance included',
      'CMS-powered, up to 10 pages',
      'Booking or enquiry integrations',
      'SEO setup & analytics',
      'Everything in Starter',
    ],
    whatsappKeywords: [
      'professional website', 'website cms', 'website with booking', 'seo website',
      'موقع احترافي', '10 page website',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'mda-website-premium',
    brand: 'MDA',
    category: 'Website Packages',
    name: 'Premium Website',
    nameAr: 'موقع ويب بريميوم',
    price: 1899,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 1,899',
    description: 'Custom build. One year of support.',
    deliverables: [
      'Custom design & brand identity essentials',
      'Unlimited pages & advanced integrations',
      'Performance & SEO optimisation',
      '1 year maintenance — multiple rounds',
      'Launch support & full handover',
    ],
    whatsappKeywords: [
      'premium website', 'custom website', 'موقع بريميوم', 'موقع مخصص', 'advanced website',
      'full website', 'website year support',
    ],
    approvalStatus: 'confirmed',
  },
];

// ─── DREXONYX — Cinematic & Video Production ──────────────────────────────────

const DREXONYX_VIDEO: ServiceEntry[] = [
  {
    id: 'drex-micro-creative',
    brand: 'DREXONYX',
    category: 'Creative Direction',
    name: 'Micro Creative',
    nameAr: 'توجيه إبداعي مصغر',
    price: 199,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 199',
    description:
      'Professional creative direction for brands with focused budgets — one concept, one hook, one clear direction.',
    deliverables: [
      'Creative concept & hook direction',
      'CTA direction',
      'Creative recommendation & guidance',
      'Digital creative brief document',
      '1 revision / clarification round',
    ],
    exclusions: ['Video production or editing not included'],
    scopeNotes: 'Creative direction only — does not include video production.',
    whatsappKeywords: [
      'creative brief', 'creative direction', 'brief', 'concept', 'توجيه إبداعي',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'drex-spark',
    brand: 'DREXONYX',
    category: 'UGC Video Production',
    name: 'Spark — Single UGC Video',
    nameAr: 'فيديو يوجي سي — قطعة واحدة',
    price: 499,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 499',
    description:
      'One Standard UGC video — concept, production, and QC delivered in 48 hours.',
    deliverables: [
      '1 × Standard UGC video (15–30 sec)',
      'Creative concept & script',
      'Production & QC',
      '1 minor revision round',
      '48-hour turnaround',
    ],
    whatsappKeywords: [
      'ugc', 'ugc video', 'video', 'فيديو', 'product video', 'social video', 'ugc ad',
      'tiktok video', 'reel', 'فيديو إعلاني', 'ad video', 'video production',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'drex-starter',
    brand: 'DREXONYX',
    category: 'UGC Video Production',
    name: 'Starter — Full UGC Video',
    nameAr: 'فيديو يوجي سي كامل',
    price: 1500,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 1,500',
    description:
      'One full-length Standard UGC video — creative brief, script, production, and QC in 5 business days.',
    deliverables: [
      '1 × Standard UGC video (up to 60 sec)',
      'Creative brief + script',
      '1 revision round',
      '5 business days',
      'QC review included',
    ],
    whatsappKeywords: [
      'video production', 'ugc production', 'product video', 'brand video', 'ad production',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'drex-growth',
    brand: 'DREXONYX',
    category: 'UGC Video Production',
    name: 'Growth — 3 UGC Videos',
    nameAr: '3 فيديوهات يوجي سي',
    price: 3500,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 3,500',
    description:
      'Multi-video Standard UGC production with A/B creative variants — scale your content output efficiently.',
    deliverables: [
      '3 × Standard UGC videos',
      'A/B creative variants',
      'Full creative strategy brief',
      '2 revision rounds',
      '7 business days',
    ],
    whatsappKeywords: [
      '3 videos', 'multiple videos', 'video package', 'video bundle', 'content production',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'drex-scale',
    brand: 'DREXONYX',
    category: 'UGC Video Production',
    name: 'Scale — 6 UGC Videos',
    nameAr: '6 فيديوهات يوجي سي',
    price: 6500,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 6,500',
    description:
      'High-volume Standard UGC production for brands scaling creative output.',
    deliverables: [
      '6 × Standard UGC videos',
      'Multi-format creative variants',
      'Full creative strategy',
      '3 revision rounds',
      '10 business days',
      'Priority QC',
    ],
    whatsappKeywords: ['6 videos', 'video scale', 'high volume video', 'scale content'],
    approvalStatus: 'confirmed',
  },
  {
    id: 'drex-production',
    brand: 'DREXONYX',
    category: 'Cinematic Production',
    name: 'Cinematic Production',
    nameAr: 'إنتاج سينمائي',
    price: 14500,
    currency: 'AED',
    pricingModel: 'fixed',
    priceDisplay: 'AED 14,500',
    description:
      'Cinematic UGC production for hero content, product launches, and brand storytelling.',
    deliverables: [
      'Cinematic video commercial (30–60 sec) or mixed deliverable scope agreed at brief',
      'Full creative direction',
      '3 revision rounds',
      '15 business days',
      'Dedicated account coordination',
    ],
    whatsappKeywords: [
      'cinematic', 'commercial', 'brand film', 'product film', 'إنتاج سينمائي', 'إعلان تلفزيوني',
      'hero video', 'launch video', 'premium video', 'cinematic video',
    ],
    approvalStatus: 'confirmed',
  },
  {
    id: 'drex-brand-film',
    brand: 'DREXONYX',
    category: 'Cinematic Production',
    name: 'Brand Film',
    nameAr: 'فيلم العلامة التجارية',
    price: null,
    currency: 'AED',
    pricingModel: 'quote-based',
    priceDisplay: 'Custom Quote',
    description:
      'Full brand film production for campaigns demanding cinematic quality, multi-platform deliverables, and a bespoke creative approach.',
    deliverables: [
      'Custom creative brief',
      'Full brand film production',
      'Multi-platform deliverables',
      'Bespoke scope & timeline',
      'Custom revision rounds',
    ],
    whatsappKeywords: [
      'brand film', 'full production', 'film production', 'cinematic campaign', 'custom video',
      'فيلم علامة', 'إنتاج كامل',
    ],
    approvalStatus: 'confirmed',
  },
];

// ─── Master export ────────────────────────────────────────────────────────────

export const ALL_SERVICES: readonly ServiceEntry[] = [
  ...WEBSITES,
  ...BRANDING,
  ...COMPANY_PROFILES,
  ...GRAPHIC_DESIGN,
  ...ADVERTISING,
  ...SOCIAL_MEDIA,
  ...RESEARCH,
  ...LAUNCH_KIT,
  ...DREXONYX_VIDEO,
];

export const MDA_SERVICES: readonly ServiceEntry[] = ALL_SERVICES.filter(
  (s) => s.brand === 'MDA',
);

export const DREXONYX_SERVICES: readonly ServiceEntry[] = ALL_SERVICES.filter(
  (s) => s.brand === 'DREXONYX',
);

/** Flat list of all WhatsApp classification keywords with their service IDs — used by the classifier. */
export const WHATSAPP_KEYWORD_MAP: ReadonlyArray<{ keyword: string; serviceId: string; brand: ServiceBrand }> =
  ALL_SERVICES.flatMap((s) =>
    s.whatsappKeywords.map((kw) => ({ keyword: kw, serviceId: s.id, brand: s.brand })),
  );

/** Group MDA services by category for website rendering. */
export function mdaServicesByCategory(): Map<string, ServiceEntry[]> {
  const map = new Map<string, ServiceEntry[]>();
  for (const s of MDA_SERVICES) {
    const group = map.get(s.category) ?? [];
    group.push(s);
    map.set(s.category, group);
  }
  return map;
}
