// MDA Workflow Registry — W1 through W10

export type WorkflowId =
  | 'W1' | 'W2' | 'W3' | 'W4' | 'W5'
  | 'W6' | 'W7' | 'W8' | 'W9' | 'W10'

export interface WorkflowStep {
  name: string
  agentId: string
  requiresOwnerApproval?: boolean
  qcGate?: string
}

export interface WorkflowDefinition {
  id: WorkflowId
  name: string
  steps: WorkflowStep[]
}

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'W1',
    name: 'New Client Project',
    steps: [
      { name: 'Intake', agentId: 'agency-director' },
      { name: 'Requirements', agentId: 'client-qualification' },
      { name: 'Feasibility', agentId: 'client-qualification' },
      { name: 'Scope', agentId: 'project-manager' },
      { name: 'Estimate / Offer', agentId: 'offer-pricing', requiresOwnerApproval: true },
      { name: 'Approval', agentId: 'agency-director', requiresOwnerApproval: true },
      { name: 'Project Creation', agentId: 'project-manager' },
      { name: 'Production', agentId: 'agency-director' },
      { name: 'QC', agentId: 'qc-director', qcGate: 'website-pre-delivery' },
      { name: 'Delivery', agentId: 'delivery-client-success' },
      { name: 'Case Study Eligibility', agentId: 'delivery-client-success' },
    ],
  },
  {
    id: 'W2',
    name: 'Website',
    steps: [
      { name: 'Research', agentId: 'research-intelligence' },
      { name: 'Sitemap', agentId: 'web-production' },
      { name: 'UX', agentId: 'web-production' },
      { name: 'Copy / Content', agentId: 'content-copy' },
      { name: 'Design', agentId: 'brand-design-production' },
      { name: 'Build', agentId: 'web-production' },
      { name: 'Functional QC', agentId: 'qc-director', qcGate: 'website-pre-delivery' },
      { name: 'Responsive QC', agentId: 'qc-director' },
      { name: 'Owner / Client Approval', agentId: 'agency-director', requiresOwnerApproval: true },
      { name: 'Delivery', agentId: 'delivery-client-success' },
    ],
  },
  {
    id: 'W3',
    name: 'Design',
    steps: [
      { name: 'Brief', agentId: 'brand-design-production' },
      { name: 'References', agentId: 'research-intelligence' },
      { name: 'Concept', agentId: 'brand-design-production' },
      { name: 'Production', agentId: 'brand-design-production' },
      { name: 'Visual / Text QC', agentId: 'qc-director', qcGate: 'design-pre-delivery' },
      { name: 'Revisions', agentId: 'brand-design-production' },
      { name: 'Final Delivery', agentId: 'delivery-client-success' },
    ],
  },
  {
    id: 'W4',
    name: 'Video',
    steps: [
      { name: 'Brief', agentId: 'video-creative-production' },
      { name: 'Objective', agentId: 'video-creative-production' },
      { name: 'Research', agentId: 'research-intelligence' },
      { name: 'Hook', agentId: 'video-creative-production' },
      { name: 'Script', agentId: 'video-creative-production' },
      { name: 'Storyboard', agentId: 'video-creative-production' },
      { name: 'Production / Edit', agentId: 'video-creative-production' },
      { name: 'Audio / Text QC', agentId: 'qc-director', qcGate: 'video-pre-delivery' },
      { name: 'Platform Adaptation', agentId: 'social-media-campaign-director' },
      { name: 'Delivery', agentId: 'delivery-client-success' },
    ],
  },
  {
    id: 'W5',
    name: 'Social Campaign',
    steps: [
      { name: 'Account / Brand Brief', agentId: 'social-media-campaign-director' },
      { name: 'Research', agentId: 'research-intelligence' },
      { name: 'Audience', agentId: 'market-opportunity' },
      { name: 'Goal', agentId: 'social-media-campaign-director' },
      { name: 'Content Pillars', agentId: 'social-media-campaign-director' },
      { name: 'Calendar', agentId: 'social-media-campaign-director' },
      { name: 'Production', agentId: 'brand-design-production' },
      { name: 'QC', agentId: 'qc-director', qcGate: 'social-pre-publish' },
      { name: 'Approval', agentId: 'agency-director', requiresOwnerApproval: true },
      { name: 'Publishing', agentId: 'social-media-campaign-director' },
      { name: 'Analytics', agentId: 'analytics-performance' },
      { name: 'Optimization', agentId: 'social-media-campaign-director' },
      { name: 'Report', agentId: 'agency-reporting' },
    ],
  },
  {
    id: 'W6',
    name: 'Social Repurposing',
    steps: [
      { name: 'Source Asset', agentId: 'social-media-campaign-director' },
      { name: 'Identify Derivatives', agentId: 'content-copy' },
      { name: 'Platform-specific Edits', agentId: 'social-media-campaign-director' },
      { name: 'Captions', agentId: 'content-copy' },
      { name: 'QC', agentId: 'qc-director', qcGate: 'social-pre-publish' },
      { name: 'Publishing Queue', agentId: 'social-media-campaign-director' },
      { name: 'Archive', agentId: 'delivery-client-success' },
    ],
  },
  {
    id: 'W7',
    name: 'Market Research',
    steps: [
      { name: 'Question', agentId: 'research-intelligence' },
      { name: 'Source Plan', agentId: 'research-intelligence' },
      { name: 'Research', agentId: 'research-intelligence' },
      { name: 'Evidence Capture', agentId: 'research-intelligence' },
      { name: 'Synthesis', agentId: 'market-opportunity' },
      { name: 'Opportunity Scoring', agentId: 'market-opportunity' },
      { name: 'Report', agentId: 'agency-reporting' },
      { name: 'Recommendation', agentId: 'market-opportunity' },
    ],
  },
  {
    id: 'W8',
    name: 'Fiverr Opportunity',
    steps: [
      { name: 'Research Niche', agentId: 'research-intelligence' },
      { name: 'Competitor Analysis', agentId: 'research-intelligence' },
      { name: 'Demand Signals', agentId: 'market-opportunity' },
      { name: 'Pricing', agentId: 'offer-pricing' },
      { name: 'Deliverables', agentId: 'offer-pricing' },
      { name: 'Feasibility', agentId: 'client-qualification' },
      { name: 'Gig Concept', agentId: 'offer-pricing' },
      { name: 'Sample / Portfolio', agentId: 'brand-design-production' },
      { name: 'Launch', agentId: 'agency-director', requiresOwnerApproval: true },
      { name: 'Measure', agentId: 'analytics-performance' },
      { name: 'Optimize', agentId: 'offer-pricing' },
    ],
  },
  {
    id: 'W9',
    name: 'Portfolio',
    steps: [
      { name: 'Completed / Approved Work', agentId: 'delivery-client-success' },
      { name: 'Permission / Usage Check', agentId: 'agency-director', requiresOwnerApproval: true },
      { name: 'Case Study Format', agentId: 'delivery-client-success' },
      { name: 'Visuals', agentId: 'brand-design-production' },
      { name: 'Process', agentId: 'delivery-client-success' },
      { name: 'Outcome (evidenced only)', agentId: 'analytics-performance' },
      { name: 'Portfolio Entry QC', agentId: 'qc-director', qcGate: 'portfolio-entry' },
      { name: 'Portfolio Entry', agentId: 'delivery-client-success' },
      { name: 'Social Derivatives', agentId: 'social-media-campaign-director' },
    ],
  },
  {
    id: 'W10',
    name: 'Agency Report',
    steps: [
      { name: 'Collect Operational State', agentId: 'agency-reporting' },
      { name: 'Summarize', agentId: 'agency-reporting' },
      { name: 'Identify Blockers', agentId: 'agency-reporting' },
      { name: 'Identify Opportunities', agentId: 'agency-reporting' },
      { name: 'Recommend Next Actions', agentId: 'agency-reporting' },
    ],
  },
]

export function getWorkflow(id: WorkflowId): WorkflowDefinition {
  const wf = WORKFLOWS.find(w => w.id === id)
  if (!wf) throw new Error(`MDA workflow not found: ${id}`)
  return wf
}
