// Agency Director — central coordinator, router, and approvals gate

import { ProjectState, createProject, updateProject } from '../../state/project'
import { ClientState } from '../../state/client'
import { WorkflowId, getWorkflow } from '../../workflows'
import { AgentId } from '../index'

export type ProjectTypeKeyword =
  | 'website' | 'landing' | 'webapp' | 'app'
  | 'logo' | 'brand' | 'design' | 'poster' | 'flyer' | 'menu' | 'presentation'
  | 'video' | 'reel' | 'tiktok' | 'script'
  | 'social' | 'campaign' | 'calendar' | 'caption'
  | 'research' | 'market' | 'competitor' | 'fiverr'
  | 'report' | 'portfolio'

export interface RoutingDecision {
  workflowId: WorkflowId
  primaryAgent: AgentId
  supportingAgents: AgentId[]
  requiresOwnerApproval: boolean
  rationale: string
}

// Keyword → workflow mapping
const ROUTING_TABLE: Array<{ keywords: string[]; workflowId: WorkflowId; primaryAgent: AgentId }> = [
  // More specific matches first to avoid early keyword collisions
  { keywords: ['fiverr', 'gig'], workflowId: 'W8', primaryAgent: 'offer-pricing' },
  { keywords: ['portfolio', 'case study'], workflowId: 'W9', primaryAgent: 'delivery-client-success' },
  { keywords: ['agency report', 'agency status', 'status summary', 'full report', 'summary report'], workflowId: 'W10', primaryAgent: 'agency-reporting' },
  { keywords: ['repurpose', 'repurposing', 'adapt'], workflowId: 'W6', primaryAgent: 'social-media-campaign-director' },
  { keywords: ['website', 'site', 'landing', 'landing page', 'web page'], workflowId: 'W2', primaryAgent: 'web-production' },
  { keywords: ['web app', 'webapp', 'application'], workflowId: 'W2', primaryAgent: 'app-digital-production' },
  { keywords: ['mobile app', 'ios', 'android'], workflowId: 'W2', primaryAgent: 'app-digital-production' },
  { keywords: ['logo', 'brand', 'identity', 'poster', 'flyer', 'menu', 'presentation', 'design', 'creative'], workflowId: 'W3', primaryAgent: 'brand-design-production' },
  { keywords: ['social media campaign', 'social campaign', 'content calendar', 'content pillars', 'posting schedule'], workflowId: 'W5', primaryAgent: 'social-media-campaign-director' },
  { keywords: ['video', 'reel', 'tiktok', 'edit', 'script', 'storyboard'], workflowId: 'W4', primaryAgent: 'video-creative-production' },
  { keywords: ['social', 'campaign', 'instagram', 'facebook'], workflowId: 'W5', primaryAgent: 'social-media-campaign-director' },
  { keywords: ['research', 'market', 'competitor', 'trend', 'analysis', 'intelligence'], workflowId: 'W7', primaryAgent: 'research-intelligence' },
]

// Human approval gates — categories that always require owner sign-off
const APPROVAL_REQUIRED_KEYWORDS = [
  'publish', 'spend', 'buy', 'purchase', 'launch', 'delete', 'remove',
  'credential', 'payment', 'paid', 'subscribe',
]

export function classifyRequest(input: string): RoutingDecision {
  const normalized = input.toLowerCase()

  const requiresOwnerApproval = APPROVAL_REQUIRED_KEYWORDS.some(k => normalized.includes(k))

  for (const route of ROUTING_TABLE) {
    if (route.keywords.some(k => normalized.includes(k))) {
      const workflow = getWorkflow(route.workflowId)
      const supportingAgents = workflow.steps
        .map(s => s.agentId as AgentId)
        .filter(a => a !== route.primaryAgent)
        .filter((a, i, arr) => arr.indexOf(a) === i)

      return {
        workflowId: route.workflowId,
        primaryAgent: route.primaryAgent,
        supportingAgents,
        requiresOwnerApproval,
        rationale: `Matched keywords for ${workflow.name}`,
      }
    }
  }

  // Default: route to agency director for W1 (new client project)
  return {
    workflowId: 'W1',
    primaryAgent: 'agency-director',
    supportingAgents: ['client-qualification', 'project-manager'],
    requiresOwnerApproval: true,
    rationale: 'No specific workflow matched — routing to W1 (New Client Project) for intake',
  }
}

export function initiateProject(
  request: string,
  routing: RoutingDecision,
  clientId?: string,
): ProjectState {
  const typeMap: Record<WorkflowId, string> = {
    W1: 'other', W2: 'website', W3: 'brand-design', W4: 'video-creative',
    W5: 'social-campaign', W6: 'social-campaign', W7: 'market-research',
    W8: 'fiverr-gig', W9: 'portfolio-item', W10: 'other',
  }

  return createProject({
    name: request.slice(0, 80),
    type: typeMap[routing.workflowId] as any,
    workflowId: routing.workflowId,
    assignedAgents: [routing.primaryAgent, ...routing.supportingAgents],
    clientId,
    requiresOwnerApproval: routing.requiresOwnerApproval,
  })
}

export function surfaceNextBestAction(projects: ProjectState[]): string {
  const blocked = projects.filter(p => p.requiresOwnerApproval && !p.approvedAt && p.status !== 'delivered')
  const inQC = projects.filter(p => p.status === 'qc')
  const inProduction = projects.filter(p => p.status === 'in-production')
  const intake = projects.filter(p => p.status === 'intake')

  if (blocked.length > 0) {
    return `Owner approval needed for ${blocked.length} project(s): ${blocked.map(p => p.name).join(', ')}`
  }
  if (inQC.length > 0) {
    return `${inQC.length} project(s) are in QC — review and approve or request revisions`
  }
  if (inProduction.length > 0) {
    return `${inProduction.length} project(s) in production — check for blockers`
  }
  if (intake.length > 0) {
    return `${intake.length} new project(s) in intake — qualify and scope`
  }
  return 'No active projects. Run W8 (Fiverr Opportunity) or W7 (Market Research) to find next revenue opportunity.'
}
