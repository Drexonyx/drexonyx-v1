export type Service = {
  slug: string;
  number: string;
  title: string;
  tagline: string;
  summary: string;
  problem: string;
  solution: string;
  features: string[];
  useCases: { title: string; desc: string }[];
  industries: string[];
  phases: { step: string; title: string; desc: string }[];
};

export const SERVICES: Service[] = [
  {
    slug: "custom-software",
    number: "01",
    title: "Custom Software Development",
    tagline: "Built for your business — not off the shelf.",
    summary:
      "End-to-end software engineering tailored to your operations. From internal tools to customer-facing platforms, we design and build systems that fit precisely how your business works.",
    problem:
      "Generic software rarely maps to real business logic. Teams spend time working around limitations, manual processes accumulate, and growth hits a ceiling imposed by tools that weren't built for the job.",
    solution:
      "We architect and build bespoke applications — web platforms, mobile apps, internal tools, and APIs — engineered around your specific workflows, data models, and scale requirements.",
    features: [
      "Full-stack web and mobile application development",
      "RESTful and GraphQL API design and development",
      "Database architecture and optimisation",
      "Third-party system integration and middleware",
      "Cloud infrastructure setup (AWS / GCP / Azure)",
      "DevOps pipeline and CI/CD configuration",
      "Code quality review and security hardening",
      "Ongoing maintenance and version releases",
    ],
    useCases: [
      {
        title: "Internal Operations Platform",
        desc: "Replace spreadsheets and manual workflows with a purpose-built operations system your team actually uses.",
      },
      {
        title: "Client-Facing Web Application",
        desc: "Build a branded digital experience that connects your business directly with customers or partners.",
      },
      {
        title: "API Layer & Integration Hub",
        desc: "Connect disparate systems — CRM, ERP, payment gateways, logistics — through a unified integration layer.",
      },
      {
        title: "Mobile Application",
        desc: "iOS and Android apps built with React Native or native stacks, optimised for performance and user retention.",
      },
    ],
    industries: [
      "Retail & E-commerce",
      "Logistics & Supply Chain",
      "Healthcare & MedTech",
      "Finance & FinTech",
      "Real Estate",
      "Professional Services",
    ],
    phases: [
      {
        step: "01",
        title: "Discovery & Scoping",
        desc: "Requirements workshop, technical audit, architecture proposal, and project roadmap.",
      },
      {
        step: "02",
        title: "Design & Prototyping",
        desc: "UI/UX design, interactive prototype, and stakeholder sign-off before a line of code is written.",
      },
      {
        step: "03",
        title: "Development",
        desc: "Agile sprints with weekly deliverables, staging environment, and continuous integration.",
      },
      {
        step: "04",
        title: "QA & Testing",
        desc: "Functional testing, performance benchmarking, security review, and cross-device validation.",
      },
      {
        step: "05",
        title: "Launch & Handover",
        desc: "Production deployment, team training, documentation, and a defined support window.",
      },
    ],
  },

  {
    slug: "ai-automation",
    number: "02",
    title: "AI & Automation Solutions",
    tagline: "Intelligent systems that do the work you're doing manually today.",
    summary:
      "We design and implement AI-powered workflows, intelligent agents, and automation pipelines that reduce operational overhead, improve accuracy, and unlock scale — without expanding your headcount.",
    problem:
      "Businesses repeat the same high-volume, low-complexity tasks thousands of times: data entry, document processing, lead qualification, report generation. This consumes capacity that should be directed at higher-value decisions.",
    solution:
      "We build tailored automation layers using LLMs, computer vision, and workflow orchestration. The result is systems that execute intelligently, escalate when needed, and improve over time.",
    features: [
      "LLM-powered document processing and data extraction",
      "AI sales agents and lead qualification bots",
      "Automated reporting and insight generation",
      "Computer vision for image classification and inspection",
      "Workflow orchestration with n8n, Zapier, or custom pipelines",
      "CRM and ERP automation and enrichment",
      "Natural language interfaces for internal tools",
      "Model fine-tuning and prompt engineering",
    ],
    useCases: [
      {
        title: "Sales & CRM Automation",
        desc: "Qualify leads, enrich contact records, trigger follow-up sequences, and surface priority accounts — automatically.",
      },
      {
        title: "Document Intelligence",
        desc: "Extract structured data from invoices, contracts, and reports at scale without manual review.",
      },
      {
        title: "Automated Reporting",
        desc: "Generate daily, weekly, or monthly business reports from live data with zero manual assembly.",
      },
      {
        title: "AI Customer Support Agent",
        desc: "Deploy a trained support agent that resolves common queries and escalates complex cases to your team.",
      },
    ],
    industries: [
      "Financial Services",
      "Legal & Compliance",
      "Real Estate",
      "E-commerce & Retail",
      "Healthcare Administration",
      "Logistics & Operations",
    ],
    phases: [
      {
        step: "01",
        title: "Process Audit",
        desc: "Map your current manual workflows, identify automation candidates, and prioritise by ROI.",
      },
      {
        step: "02",
        title: "Solution Design",
        desc: "Architecture, model selection, integration points, and cost modelling before build begins.",
      },
      {
        step: "03",
        title: "Build & Integration",
        desc: "Pipeline development, API connections, model configuration, and staging deployment.",
      },
      {
        step: "04",
        title: "Testing & Calibration",
        desc: "Accuracy testing, edge-case handling, human-in-the-loop review, and threshold tuning.",
      },
      {
        step: "05",
        title: "Deployment & Monitoring",
        desc: "Live deployment with dashboards, alerting, performance tracking, and continuous improvement.",
      },
    ],
  },

  {
    slug: "digital-commerce",
    number: "03",
    title: "Digital Commerce",
    tagline: "Platforms that sell — not just display.",
    summary:
      "We design and build digital commerce infrastructure: storefronts, B2B portals, subscription platforms, and multi-channel commerce architectures that convert and scale.",
    problem:
      "Most e-commerce projects start with a template and try to retrofit it to a business. The result is a storefront that looks like a thousand others, with checkout flows that leak revenue and product discovery that fails to convert.",
    solution:
      "We build commerce experiences from the inside out — starting with your product catalogue, customer journey, and revenue model, then engineering the platform that best serves them.",
    features: [
      "Custom storefront design and development",
      "Shopify, Shopify Plus, and headless commerce builds",
      "B2B portals with account-based pricing",
      "Subscription and recurring revenue infrastructure",
      "Payment gateway integration (Stripe, Tabby, Tamara, etc.)",
      "Product catalogue and inventory management",
      "Multi-currency and cross-border commerce",
      "Analytics and conversion rate optimisation",
    ],
    useCases: [
      {
        title: "D2C Storefront Launch",
        desc: "Full storefront design and development for a direct-to-consumer brand entering the digital market.",
      },
      {
        title: "B2B Wholesale Portal",
        desc: "Account-gated ordering portal with trade pricing, bulk order management, and credit terms.",
      },
      {
        title: "Subscription Commerce",
        desc: "Recurring delivery models with subscription management, pause/resume, and billing automation.",
      },
      {
        title: "Cross-Border Expansion",
        desc: "Localised storefronts with regional payment methods, currency display, and logistics integration.",
      },
    ],
    industries: [
      "FMCG & Consumer Goods",
      "Fashion & Apparel",
      "Health & Wellness",
      "Food & Beverage",
      "Electronics & Gadgets",
      "Home & Lifestyle",
    ],
    phases: [
      {
        step: "01",
        title: "Commerce Strategy",
        desc: "Customer journey mapping, platform selection, revenue model alignment, and technical specification.",
      },
      {
        step: "02",
        title: "Design System",
        desc: "Brand-aligned UI design, mobile-first layouts, and component system before development.",
      },
      {
        step: "03",
        title: "Platform Build",
        desc: "Storefront development, payment integration, logistics setup, and catalogue configuration.",
      },
      {
        step: "04",
        title: "Pre-Launch QA",
        desc: "End-to-end checkout testing, load testing, cross-device validation, and payment gateway verification.",
      },
      {
        step: "05",
        title: "Launch & Growth",
        desc: "Go-live support, analytics setup, conversion tracking, and post-launch optimisation roadmap.",
      },
    ],
  },

  {
    slug: "enterprise-systems",
    number: "04",
    title: "Enterprise Systems & Integration",
    tagline: "Connect your systems. Unify your operations.",
    summary:
      "We design and implement enterprise integration architectures that connect ERPs, CRMs, logistics platforms, and data systems — eliminating silos and creating a single source of operational truth.",
    problem:
      "Growing organisations accumulate systems: an ERP here, a CRM there, a logistics platform, a custom internal tool. These systems don't talk to each other. Data is duplicated, reconciliation is manual, and decision-making lags because no one has a unified view.",
    solution:
      "We architect integration layers that connect your business systems, synchronise data in real time, and expose unified dashboards and APIs that give your operations genuine visibility and control.",
    features: [
      "ERP implementation and customisation (SAP, Oracle, Odoo)",
      "CRM integration and configuration (Salesforce, HubSpot, Zoho)",
      "API-first integration architecture and middleware",
      "Real-time data synchronisation pipelines",
      "Business intelligence and operational dashboards",
      "Master data management and deduplication",
      "Legacy system migration and modernisation",
      "Enterprise-grade security and access control",
    ],
    useCases: [
      {
        title: "ERP + CRM Integration",
        desc: "Sync your sales, finance, and operations data so every team works from the same ground truth.",
      },
      {
        title: "Operational Dashboard",
        desc: "Unified real-time view across fulfilment, inventory, finance, and customer service in one platform.",
      },
      {
        title: "Legacy System Modernisation",
        desc: "Migrate data and processes from outdated systems to modern, maintainable infrastructure without disruption.",
      },
      {
        title: "Multi-Entity Data Architecture",
        desc: "Connect systems across subsidiaries, geographies, or business units with consistent data governance.",
      },
    ],
    industries: [
      "Manufacturing & Industrial",
      "Distribution & Wholesale",
      "Healthcare Groups",
      "Financial Services",
      "Hospitality & Facilities",
      "Government & Public Sector",
    ],
    phases: [
      {
        step: "01",
        title: "Systems Audit",
        desc: "Inventory of existing systems, data flows, integration gaps, and business process mapping.",
      },
      {
        step: "02",
        title: "Integration Architecture",
        desc: "Middleware design, API specification, data model alignment, and security framework.",
      },
      {
        step: "03",
        title: "Implementation",
        desc: "Phased integration build with staging environments, data migration, and UAT cycles.",
      },
      {
        step: "04",
        title: "Validation & Go-Live",
        desc: "Data integrity verification, performance testing, cutover plan, and rollback procedures.",
      },
      {
        step: "05",
        title: "Support & Optimisation",
        desc: "Hypercare support window, monitoring dashboards, and ongoing optimisation retainer.",
      },
    ],
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
