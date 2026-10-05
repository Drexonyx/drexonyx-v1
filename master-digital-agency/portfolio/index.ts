// MDA Portfolio Workflow — W9 implementation

import { ProjectState, PortfolioLabel } from '../state/project'

export interface CaseStudy {
  id: string
  projectId: string
  label: PortfolioLabel
  problem: string
  objective: string
  research: string
  strategy: string
  creativeProduction: string
  finalOutput: string
  measurableResult?: string   // only if real evidence exists
  agencyCapability: string
  createdAt: string
}

// Portfolio pillars from spec
export const PORTFOLIO_PILLARS = [
  'Premium Business Website',
  'Restaurant/Cafe Digital Presence',
  'Logo + Brand Identity',
  'Social Media Campaign',
  'Advertising Campaign Creative',
  'Short-form/Reel Campaign',
  'Landing Page / Conversion Concept',
  'AI/Automation Concept',
  'Mobile/Web App UI Concept',
  'Market/Competitor Intelligence Report',
] as const

export type PortfolioPillar = typeof PORTFOLIO_PILLARS[number]

export interface PortfolioItem {
  id: string
  pillar: PortfolioPillar
  label: PortfolioLabel
  caseStudyId?: string
  title: string
  summary: string
  assets: string[]
  createdAt: string
  publishedAt?: string
}

export function checkPortfolioEligibility(project: ProjectState): {
  eligible: boolean
  reason: string
  suggestedLabel: PortfolioLabel
} {
  if (project.status !== 'delivered') {
    return { eligible: false, reason: 'Project must be delivered before portfolio eligibility', suggestedLabel: 'Agency Concept' }
  }
  if (project.clientId) {
    return {
      eligible: true,
      reason: 'Client project — requires permission/usage check before publishing',
      suggestedLabel: 'Client Work',
    }
  }
  return {
    eligible: true,
    reason: 'Agency-produced concept — label accurately',
    suggestedLabel: 'Agency Concept',
  }
}

export function createCaseStudy(
  project: ProjectState,
  content: Omit<CaseStudy, 'id' | 'projectId' | 'createdAt'>,
): CaseStudy {
  return {
    id: `cs-${Date.now()}`,
    projectId: project.id,
    createdAt: new Date().toISOString(),
    ...content,
  }
}

// Portfolio first-batch target from spec
export const FIRST_PORTFOLIO_BATCH = {
  target: '6–8 polished agency concepts',
  items: [
    { pillar: 'Premium Business Website', count: 2 },
    { pillar: 'Restaurant/Cafe Digital Presence', count: 1 },
    { pillar: 'Logo + Brand Identity', count: 1 },
    { pillar: 'Social Media Campaign', count: 1 },
    { pillar: 'Advertising Campaign Creative', count: 1 },
    { pillar: 'Short-form/Reel Campaign', count: 1 },
    { pillar: 'Landing Page / Conversion Concept', count: 1 },
    { pillar: 'Market/Competitor Intelligence Report', count: 1 },
  ],
}
