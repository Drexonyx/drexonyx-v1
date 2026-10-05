// MDA Project State — in-memory schema for v1 (no paid DB dependency)

import { AgentId } from '../agents'

export type ProjectStatus =
  | 'intake'
  | 'qualification'
  | 'scoping'
  | 'approved'
  | 'in-production'
  | 'qc'
  | 'awaiting-approval'
  | 'revision'
  | 'delivered'
  | 'archived'

export type ProjectType =
  | 'website'
  | 'landing-page'
  | 'web-app'
  | 'mobile-app'
  | 'brand-design'
  | 'social-campaign'
  | 'video-creative'
  | 'market-research'
  | 'fiverr-gig'
  | 'portfolio-item'
  | 'other'

export type PortfolioLabel =
  | 'Client Work'
  | 'Agency Concept'
  | 'Speculative Concept'
  | 'Case Study'

export type PaymentStatus = 'unpaid' | 'awaiting-payment' | 'paid'

export interface QCResult {
  passedAt: string
  agentId: AgentId
  notes: string
}

export interface ProjectState {
  id: string
  name: string
  type: ProjectType
  status: ProjectStatus
  clientId?: string
  assignedAgents: AgentId[]
  workflowId: string
  createdAt: string
  updatedAt: string
  paymentStatus: PaymentStatus
  deliverables: string[]
  qcResult?: QCResult
  portfolioLabel?: PortfolioLabel
  notes: string
  requiresOwnerApproval: boolean
  approvedAt?: string
}

export function createProject(partial: Pick<ProjectState, 'name' | 'type' | 'workflowId'> & Partial<ProjectState>): ProjectState {
  const now = new Date().toISOString()
  return {
    id: `mda-${Date.now()}`,
    status: 'intake',
    assignedAgents: [],
    createdAt: now,
    updatedAt: now,
    paymentStatus: 'unpaid',
    deliverables: [],
    notes: '',
    requiresOwnerApproval: false,
    ...partial,
  }
}

export function updateProject(project: ProjectState, updates: Partial<ProjectState>): ProjectState {
  return { ...project, ...updates, updatedAt: new Date().toISOString() }
}
