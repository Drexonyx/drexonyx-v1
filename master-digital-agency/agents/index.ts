// MDA Agent Registry — isolated from DREXONYX agents

export type AgentGroup = 'core' | 'acquisition' | 'production' | 'control'

export type AgentId =
  | 'agency-director'
  | 'research-intelligence'
  | 'market-opportunity'
  | 'offer-pricing'
  | 'lead-opportunity'
  | 'client-qualification'
  | 'client-communication'
  | 'project-manager'
  | 'web-production'
  | 'app-digital-production'
  | 'brand-design-production'
  | 'video-creative-production'
  | 'content-copy'
  | 'social-media-campaign-director'
  | 'qc-director'
  | 'delivery-client-success'
  | 'analytics-performance'
  | 'agency-reporting'

export interface AgentDefinition {
  id: AgentId
  name: string
  group: AgentGroup
  responsibilities: string[]
  skills: string[]
}

export const AGENT_REGISTRY: AgentDefinition[] = [
  // CORE
  {
    id: 'agency-director',
    name: 'Agency Director',
    group: 'core',
    responsibilities: [
      'Central coordinator and request router',
      'Classify incoming requests by service domain',
      'Assign and sequence agents for each project',
      'Manage project state and priority',
      'Enforce human approval gates',
      'Produce agency status overview',
      'Surface next best action recommendation',
    ],
    skills: ['Requirement Analysis', 'Project Planning', 'Client Communication', 'Reporting'],
  },
  {
    id: 'research-intelligence',
    name: 'Research Intelligence',
    group: 'core',
    responsibilities: [
      'Research markets, competitors, trends and channels',
      'Capture evidence from public sources',
      'Synthesize findings into structured reports',
      'Score opportunities',
    ],
    skills: ['Market Research', 'Competitor Intelligence', 'Trend Analysis', 'Fiverr Market Intelligence', 'YouTube/Social Analysis', 'Opportunity Scoring'],
  },
  {
    id: 'market-opportunity',
    name: 'Market & Opportunity',
    group: 'core',
    responsibilities: [
      'Convert research into commercial recommendations',
      'Identify viable service opportunities',
      'Map client demand to agency capabilities',
      'Score and prioritize opportunities by revenue potential',
    ],
    skills: ['Opportunity Scoring', 'Pricing Intelligence', 'Fiverr Market Intelligence'],
  },
  {
    id: 'offer-pricing',
    name: 'Offer & Pricing',
    group: 'core',
    responsibilities: [
      'Package services into clear deliverable offers',
      'Compare market pricing for each service category',
      'Propose competitive pricing for the owner',
      'Draft Fiverr gig concepts',
    ],
    skills: ['Offer Design', 'Service Packaging', 'Pricing Intelligence'],
  },
  // ACQUISITION / CLIENT
  {
    id: 'lead-opportunity',
    name: 'Lead & Opportunity',
    group: 'acquisition',
    responsibilities: [
      'Find and organize legitimate client opportunities',
      'Track inbound and outbound leads',
      'Surface high-priority follow-ups',
    ],
    skills: ['Fiverr Market Intelligence', 'Opportunity Scoring'],
  },
  {
    id: 'client-qualification',
    name: 'Client Qualification',
    group: 'acquisition',
    responsibilities: [
      'Evaluate client fit, scope, urgency and feasibility',
      'Recommend accept / decline / escalate',
    ],
    skills: ['Requirement Analysis'],
  },
  {
    id: 'client-communication',
    name: 'Client Communication',
    group: 'acquisition',
    responsibilities: [
      'Draft professional client communication',
      'Write follow-up messages and proposals',
      'Maintain communication log',
    ],
    skills: ['Client Communication', 'Delivery'],
  },
  {
    id: 'project-manager',
    name: 'Project Manager',
    group: 'acquisition',
    responsibilities: [
      'Convert approved work into tasks, milestones and dependencies',
      'Track project status across production agents',
      'Identify blockers and escalate',
    ],
    skills: ['Project Planning', 'Client Communication', 'QC', 'Delivery'],
  },
  // PRODUCTION
  {
    id: 'web-production',
    name: 'Web Production',
    group: 'production',
    responsibilities: [
      'Plan and produce websites and landing pages',
      'Execute W2 Website workflow',
      'Perform responsive and functional QC checks',
    ],
    skills: ['Website Development', 'Landing Page Development', 'UI/UX', 'Frontend', 'Backend', 'Database', 'API fundamentals without paid dependency assumptions'],
  },
  {
    id: 'app-digital-production',
    name: 'App / Digital Product Production',
    group: 'production',
    responsibilities: [
      'Scope and produce web apps and basic mobile-app work',
      'Produce UI/UX concepts and functional prototypes',
    ],
    skills: ['Web App Development', 'Basic Mobile App Development', 'UI/UX', 'Frontend', 'Backend'],
  },
  {
    id: 'brand-design-production',
    name: 'Brand & Design Production',
    group: 'production',
    responsibilities: [
      'Produce logos, branding, posters, social creatives, presentations and menus',
      'Execute W3 Design workflow',
    ],
    skills: ['Logo Design', 'Brand Identity', 'Social Media Design', 'Advertising Creative', 'Poster Design', 'Menu Design', 'Presentation Design', 'Digital Marketing Materials'],
  },
  {
    id: 'video-creative-production',
    name: 'Video & Creative Production',
    group: 'production',
    responsibilities: [
      'Write scripts, storyboards and creative direction',
      'Plan and edit short-form video content',
      'Execute W4 Video workflow',
    ],
    skills: ['Short-form Video', 'Reels', 'TikTok Content', 'Video Editing', 'Scriptwriting', 'Hook Writing', 'Storyboarding', 'UGC-style Creative'],
  },
  {
    id: 'content-copy',
    name: 'Content & Copy',
    group: 'production',
    responsibilities: [
      'Write captions, scripts, copy and content calendars',
      'Adapt content across platforms',
    ],
    skills: ['Caption Writing', 'Scriptwriting', 'Content Repurposing', 'Hook Writing'],
  },
  {
    id: 'social-media-campaign-director',
    name: 'Social Media Campaign Director',
    group: 'production',
    responsibilities: [
      'Develop social strategy and content pillars',
      'Build content calendars',
      'Execute W5 Social Campaign and W6 Repurposing workflows',
      'Coordinate platform adaptation and publishing workflow',
      'Deliver analytics and optimization reports',
    ],
    skills: ['Content Strategy', 'Social Campaign Strategy', 'Content Calendar', 'Platform Adaptation', 'Publishing Workflow', 'Social Analytics', 'Campaign Reporting', 'Organic Optimization'],
  },
  // CONTROL / DELIVERY
  {
    id: 'qc-director',
    name: 'QC Director',
    group: 'control',
    responsibilities: [
      'Run visual, textual, technical, requirement and functional QC gates',
      'Block delivery of failing work',
      'Generate QC reports',
    ],
    skills: ['QC'],
  },
  {
    id: 'delivery-client-success',
    name: 'Delivery & Client Success',
    group: 'control',
    responsibilities: [
      'Manage final handoff to client',
      'Track revision rounds',
      'Confirm completion and follow up for feedback',
    ],
    skills: ['Delivery', 'Client Communication', 'Case Study Creation'],
  },
  {
    id: 'analytics-performance',
    name: 'Analytics & Performance',
    group: 'control',
    responsibilities: [
      'Measure campaign, content and project performance',
      'Surface actionable insights from available data',
    ],
    skills: ['Social Analytics', 'Campaign Reporting'],
  },
  {
    id: 'agency-reporting',
    name: 'Agency Reporting',
    group: 'control',
    responsibilities: [
      'Produce executive and operational agency reports',
      'Execute W10 Agency Report workflow',
      'Surface next best action recommendation',
    ],
    skills: ['Reporting', 'Campaign Reporting', 'Portfolio Curation'],
  },
]

export function getAgent(id: AgentId): AgentDefinition {
  const agent = AGENT_REGISTRY.find(a => a.id === id)
  if (!agent) throw new Error(`MDA agent not found: ${id}`)
  return agent
}

export function getAgentsByGroup(group: AgentGroup): AgentDefinition[] {
  return AGENT_REGISTRY.filter(a => a.group === group)
}
