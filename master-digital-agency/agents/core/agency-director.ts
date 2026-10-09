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
  secondaryIntents?: Array<{ workflowId: WorkflowId; primaryAgent: AgentId; matchedKeywords: string[] }>
}

type RouteEntry = { keywords: string[]; workflowId: WorkflowId; primaryAgent: AgentId }

// Override routes: first-match wins — high-specificity intents that must not be outscored
const OVERRIDE_ROUTES: RouteEntry[] = [
  { keywords: ['fiverr', 'gig'], workflowId: 'W8', primaryAgent: 'offer-pricing' },
  { keywords: ['portfolio', 'case study'], workflowId: 'W9', primaryAgent: 'delivery-client-success' },
  { keywords: ['agency report', 'agency status', 'status summary', 'full report', 'summary report'], workflowId: 'W10', primaryAgent: 'agency-reporting' },
  { keywords: ['repurpose', 'repurposing', 'adapt'], workflowId: 'W6', primaryAgent: 'social-media-campaign-director' },
]

// Scored routes: all matches are tallied; primary workflow is highest-scoring
// Tiebreaker: table order (earlier entry wins)
const SCORED_ROUTES: RouteEntry[] = [
  { keywords: ['website', 'site', 'landing', 'landing page', 'web page'], workflowId: 'W2', primaryAgent: 'web-production' },
  { keywords: ['web app', 'webapp', 'application'], workflowId: 'W2', primaryAgent: 'app-digital-production' },
  { keywords: ['mobile app', 'ios', 'android'], workflowId: 'W2', primaryAgent: 'app-digital-production' },
  { keywords: ['logo', 'brand', 'identity', 'poster', 'flyer', 'menu', 'presentation', 'design', 'creative'], workflowId: 'W3', primaryAgent: 'brand-design-production' },
  { keywords: ['video', 'reel', 'tiktok', 'edit', 'script', 'storyboard'], workflowId: 'W4', primaryAgent: 'video-creative-production' },
  { keywords: ['social media campaign', 'social campaign', 'content calendar', 'content pillars', 'posting schedule'], workflowId: 'W5', primaryAgent: 'social-media-campaign-director' },
  { keywords: ['social', 'campaign', 'instagram', 'facebook'], workflowId: 'W5', primaryAgent: 'social-media-campaign-director' },
  { keywords: ['research', 'market', 'competitor', 'trend', 'analysis', 'intelligence'], workflowId: 'W7', primaryAgent: 'research-intelligence' },
]

interface IntentScore {
  workflowId: WorkflowId
  primaryAgent: AgentId
  score: number
  matchedKeywords: string[]
}

function countOccurrences(text: string, keyword: string): number {
  let count = 0
  let pos = 0
  while ((pos = text.indexOf(keyword, pos)) !== -1) {
    count++
    pos += keyword.length
  }
  return count
}

function scoreAllRoutes(normalized: string): IntentScore[] {
  const accumulator = new Map<WorkflowId, IntentScore>()
  for (const route of SCORED_ROUTES) {
    for (const keyword of route.keywords) {
      const occurrences = countOccurrences(normalized, keyword)
      if (occurrences > 0) {
        const weight = keyword.split(/\s+/).length * occurrences
        const existing = accumulator.get(route.workflowId)
        if (existing) {
          existing.score += weight
          existing.matchedKeywords.push(keyword)
        } else {
          accumulator.set(route.workflowId, {
            workflowId: route.workflowId,
            primaryAgent: route.primaryAgent,
            score: weight,
            matchedKeywords: [keyword],
          })
        }
      }
    }
  }
  const scored = Array.from(accumulator.values())
  const routeOrder = (wid: WorkflowId): number =>
    SCORED_ROUTES.findIndex(r => r.workflowId === wid)
  scored.sort((a, b) => b.score !== a.score ? b.score - a.score : routeOrder(a.workflowId) - routeOrder(b.workflowId))
  return scored
}

// Human approval gates — categories that always require owner sign-off
const APPROVAL_REQUIRED_KEYWORDS = [
  'publish', 'spend', 'buy', 'purchase', 'launch', 'delete', 'remove',
  'credential', 'payment', 'paid', 'subscribe',
]

export function classifyRequest(input: string): RoutingDecision {
  const normalized = input.toLowerCase()
  const requiresOwnerApproval = APPROVAL_REQUIRED_KEYWORDS.some(k => normalized.includes(k))

  // Step 1: override routes — first match wins unconditionally
  for (const route of OVERRIDE_ROUTES) {
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
        rationale: `Override route matched for ${workflow.name}`,
        secondaryIntents: [],
      }
    }
  }

  // Step 2: score remaining routes by keyword weight × occurrences
  const scored = scoreAllRoutes(normalized)

  if (scored.length === 0) {
    // Default: route to agency director for W1 (new client project)
    return {
      workflowId: 'W1',
      primaryAgent: 'agency-director',
      supportingAgents: ['client-qualification', 'project-manager'],
      requiresOwnerApproval: true,
      rationale: 'No specific workflow matched — routing to W1 (New Client Project) for intake',
      secondaryIntents: [],
    }
  }

  const primary = scored[0]
  const workflow = getWorkflow(primary.workflowId)
  const supportingAgents = workflow.steps
    .map(s => s.agentId as AgentId)
    .filter(a => a !== primary.primaryAgent)
    .filter((a, i, arr) => arr.indexOf(a) === i)

  return {
    workflowId: primary.workflowId,
    primaryAgent: primary.primaryAgent,
    supportingAgents,
    requiresOwnerApproval,
    rationale: `Scored match for ${workflow.name} (score: ${primary.score}, keywords: ${primary.matchedKeywords.join(', ')})`,
    secondaryIntents: scored.slice(1).map(s => ({
      workflowId: s.workflowId,
      primaryAgent: s.primaryAgent,
      matchedKeywords: s.matchedKeywords,
    })),
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
