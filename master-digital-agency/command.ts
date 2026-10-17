/**
 * MDA Command Interface
 * Accepts a natural-language request and returns a structured agency response.
 * No framework dependency — pure TypeScript, testable standalone.
 */

import { classifyRequest, initiateProject, surfaceNextBestAction } from './agents/core/agency-director'
import { getAgent, AGENT_REGISTRY } from './agents'
import { getWorkflow } from './workflows'
import { createQCGate } from './qc'
import { ProjectState, createProject } from './state/project'
import { selectSkills } from './skills/activation'

// ── Exclusion detection ────────────────────────────────────────────────────

const EXCLUDED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /whatsapp\s*api|whatsapp\s*business\s*api/i, reason: 'WhatsApp API is excluded from MDA v1 scope (SPEC §3)' },
  { pattern: /ai\s*call(ing)?|telephony|auto.?dial|robocall/i, reason: 'AI calling / telephony is excluded from MDA v1 scope (SPEC §3)' },
  { pattern: /\bsms\b|text\s+message\s+campaign|bulk\s+sms/i, reason: 'SMS is excluded from MDA v1 scope (SPEC §3)' },
  { pattern: /paid\s+crm|salesforce|hubspot|zoho|pipedrive/i, reason: 'Paid CRM platforms are excluded from MDA v1 baseline (SPEC §3). Surface to owner for decision.' },
  { pattern: /bank\s+account|bank\s+integrat|payment\s+gateway|stripe|paypal|tap\s+payments|fintech/i, reason: 'Finance and payment systems are excluded from MDA v1 (SPEC §4). Owner handles manually.' },
  { pattern: /fake\s+(followers?|likes?|views?|engagement)|spam\s+campaign|mass\s+outreach/i, reason: 'Spam, fake followers and fake engagement are permanently excluded (SPEC §3).' },
  { pattern: /paid\s+(hosting|server|infrastructure|subscription\s+platform)/i, reason: 'Paid infrastructure dependency requires owner approval before activation (SPEC §3).' },
]

export interface ExclusionResult {
  excluded: true
  reason: string
}

function detectExclusion(input: string): ExclusionResult | null {
  for (const { pattern, reason } of EXCLUDED_PATTERNS) {
    if (pattern.test(input)) {
      return { excluded: true, reason }
    }
  }
  return null
}

// ── Response types ─────────────────────────────────────────────────────────

export interface QCRequirement {
  gate: string
  step: string
  dimensions: string[]
  itemCount: number
}

export interface CommandResponse {
  request: string
  excluded: false
  classification: {
    workflowId: string
    workflowName: string
    rationale: string
  }
  agents: {
    primary: { id: string; name: string; group: string }
    supporting: Array<{ id: string; name: string }>
  }
  skills: string[]
  workflow: {
    id: string
    name: string
    stepCount: number
    steps: Array<{ name: string; agentId: string; qcGate?: string; requiresOwnerApproval?: boolean }>
  }
  project: {
    id: string
    name: string
    type: string
    status: string
  }
  qcRequirements: QCRequirement[]
  requiresOwnerApproval: boolean
  approvalTriggers: string[]
  nextBestAction: string
  auditLog: string[]
}

export interface ExcludedCommandResponse {
  request: string
  excluded: true
  reason: string
  requiresOwnerApproval: true
  nextBestAction: string
  auditLog: string[]
}

export type MDACommandResponse = CommandResponse | ExcludedCommandResponse

// ── Command handler ────────────────────────────────────────────────────────

export function handleCommand(
  input: string,
  existingProjects: ProjectState[] = [],
  clientId?: string,
): MDACommandResponse {
  const log: string[] = []
  const trimmed = input.trim()

  log.push(`[${new Date().toISOString()}] REQUEST: ${trimmed.slice(0, 120)}`)

  // Step 1: exclusion check before routing
  const exclusion = detectExclusion(trimmed)
  if (exclusion) {
    log.push(`[EXCLUDED] ${exclusion.reason}`)
    return {
      request: trimmed,
      excluded: true,
      reason: exclusion.reason,
      requiresOwnerApproval: true,
      nextBestAction: 'Present this request to the owner. Excluded capabilities require explicit owner decision before any activation.',
      auditLog: log,
    }
  }

  // Step 2: classify via Agency Director
  const routing = classifyRequest(trimmed)
  log.push(`[CLASSIFY] workflow=${routing.workflowId}, primary=${routing.primaryAgent}, approval=${routing.requiresOwnerApproval}`)

  // Step 3: create project state
  const project = initiateProject(trimmed, routing, clientId)
  log.push(`[PROJECT] id=${project.id}, type=${project.type}, status=${project.status}`)

  // Step 4: resolve workflow definition
  const workflow = getWorkflow(routing.workflowId)

  // Step 5: resolve agents
  const primaryAgent = getAgent(routing.primaryAgent)
  const supportingAgents = routing.supportingAgents
    .map(id => {
      try { return getAgent(id) } catch { return null }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)

  // Step 6: select skills relevant to this workflow and request
  const allAgentIds = [routing.primaryAgent, ...routing.supportingAgents]
  const skills = selectSkills(trimmed, routing.workflowId, allAgentIds, AGENT_REGISTRY)
  log.push(`[SKILLS] ${skills.length} skills activated`)

  // Step 7: collect QC requirements from workflow
  const qcRequirements: QCRequirement[] = workflow.steps
    .filter(s => s.qcGate)
    .map(s => {
      const gate = createQCGate(project.id, s.qcGate!)
      const dims = [...new Set(gate.items.map(i => i.dimension))]
      return {
        gate: s.qcGate!,
        step: s.name,
        dimensions: dims,
        itemCount: gate.items.length,
      }
    })

  // Step 8: collect approval triggers
  const approvalTriggers = workflow.steps
    .filter(s => s.requiresOwnerApproval)
    .map(s => `${s.name} (step assigned to ${s.agentId})`)

  if (routing.requiresOwnerApproval && approvalTriggers.length === 0) {
    approvalTriggers.push('Request contains action requiring owner decision before execution')
  }

  // Step 9: next-best-action
  const nba = surfaceNextBestAction([project, ...existingProjects])

  log.push(`[APPROVAL] required=${routing.requiresOwnerApproval}, triggers=${approvalTriggers.length}`)
  log.push(`[QC] gates=${qcRequirements.length}`)
  log.push(`[NBA] ${nba}`)

  return {
    request: trimmed,
    excluded: false,
    classification: {
      workflowId: routing.workflowId,
      workflowName: workflow.name,
      rationale: routing.rationale,
    },
    agents: {
      primary: { id: primaryAgent.id, name: primaryAgent.name, group: primaryAgent.group },
      supporting: supportingAgents.map(a => ({ id: a.id, name: a.name })),
    },
    skills,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      stepCount: workflow.steps.length,
      steps: workflow.steps,
    },
    project: {
      id: project.id,
      name: project.name,
      type: project.type,
      status: project.status,
    },
    qcRequirements,
    requiresOwnerApproval: routing.requiresOwnerApproval,
    approvalTriggers,
    nextBestAction: nba,
    auditLog: log,
  }
}

// ── Text formatter for CLI / display use ──────────────────────────────────

export function formatCommandResponse(res: MDACommandResponse): string {
  const lines: string[] = ['']

  if (res.excluded) {
    lines.push('⚠  EXCLUDED REQUEST')
    lines.push(`   ${res.reason}`)
    lines.push('')
    lines.push(`   Requires owner approval: YES`)
    lines.push(`   Next action: ${res.nextBestAction}`)
    lines.push('')
    return lines.join('\n')
  }

  lines.push(`AGENCY DIRECTOR RESPONSE`)
  lines.push(`${'─'.repeat(50)}`)
  lines.push(`Request    : ${res.request.slice(0, 80)}`)
  lines.push(`Workflow   : ${res.classification.workflowId} — ${res.classification.workflowName}`)
  lines.push(`Rationale  : ${res.classification.rationale}`)
  lines.push('')
  lines.push(`PRIMARY AGENT`)
  lines.push(`  ${res.agents.primary.name} [${res.agents.primary.group}]`)
  lines.push('')
  lines.push(`SUPPORTING AGENTS`)
  if (res.agents.supporting.length) {
    res.agents.supporting.forEach(a => lines.push(`  • ${a.name}`))
  } else {
    lines.push('  None')
  }
  lines.push('')
  lines.push(`SKILLS ACTIVATED (${res.skills.length})`)
  lines.push(`  ${res.skills.slice(0, 8).join(', ')}${res.skills.length > 8 ? ` … +${res.skills.length - 8} more` : ''}`)
  lines.push('')
  lines.push(`WORKFLOW STEPS (${res.workflow.stepCount})`)
  res.workflow.steps.forEach((s, i) => {
    const tags = []
    if (s.qcGate) tags.push(`QC`)
    if (s.requiresOwnerApproval) tags.push(`APPROVAL`)
    lines.push(`  ${String(i + 1).padStart(2)}. ${s.name}${tags.length ? ' [' + tags.join(', ') + ']' : ''}`)
  })
  lines.push('')
  lines.push(`PROJECT STATE`)
  lines.push(`  ID      : ${res.project.id}`)
  lines.push(`  Type    : ${res.project.type}`)
  lines.push(`  Status  : ${res.project.status}`)
  lines.push('')
  lines.push(`QC REQUIREMENTS`)
  if (res.qcRequirements.length) {
    res.qcRequirements.forEach(q => {
      lines.push(`  [${q.gate}] at step "${q.step}" — ${q.itemCount} checks (${q.dimensions.join(', ')})`)
    })
  } else {
    lines.push('  None defined for this workflow')
  }
  lines.push('')
  lines.push(`OWNER APPROVAL REQUIRED: ${res.requiresOwnerApproval ? 'YES' : 'NO'}`)
  if (res.approvalTriggers.length) {
    res.approvalTriggers.forEach(t => lines.push(`  • ${t}`))
  }
  lines.push('')
  lines.push(`NEXT BEST ACTION`)
  lines.push(`  ${res.nextBestAction}`)
  lines.push('')

  return lines.join('\n')
}
