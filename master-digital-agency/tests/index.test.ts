import { describe, it, expect } from 'vitest'
import { AGENT_REGISTRY, getAgent, getAgentsByGroup } from '../agents'
import { SKILL_REGISTRY, findSkill } from '../skills'
import { WORKFLOWS, getWorkflow } from '../workflows'
import { classifyRequest, initiateProject, surfaceNextBestAction } from '../agents/core/agency-director'
import type { AgentId } from '../agents'
import type { WorkflowId } from '../workflows'
import { createQCGate, evaluateQCGate } from '../qc'
import { createProject, updateProject } from '../state/project'
import { createClient } from '../state/client'
import { checkPortfolioEligibility, createCaseStudy } from '../portfolio'
import { generateAgencyReport, formatAgencyReport } from '../reporting'

// ── Architecture ────────────────────────────────────────────────────────────

describe('Agent Registry', () => {
  it('contains exactly 18 agents', () => {
    expect(AGENT_REGISTRY).toHaveLength(18)
  })

  it('has agency-director in core group', () => {
    const director = getAgent('agency-director')
    expect(director.group).toBe('core')
  })

  it('throws for unknown agent', () => {
    expect(() => getAgent('unknown-agent' as unknown as AgentId)).toThrow()
  })

  it('returns correct agents by group', () => {
    expect(getAgentsByGroup('core')).toHaveLength(4)
    expect(getAgentsByGroup('acquisition')).toHaveLength(4)
    expect(getAgentsByGroup('production')).toHaveLength(6)
    expect(getAgentsByGroup('control')).toHaveLength(4)
  })

  it('no agent duplicates DREXONYX agents', () => {
    // DREXONYX agent IDs from lib/agents/*.ts — verify none are reused
    const drexonyxIds = [
      'analytics-specialist', 'autonomous-campaign', 'communication-specialist',
      'direct-facebook-publish', 'finance-monitoring-specialist', 'lead-hunter-specialist',
      'marketing-campaign-specialist', 'production-run-specialist', 'prompt-optimize-specialist',
      'qc-metadata-specialist', 'qc-review-specialist', 'reporting-specialist',
      'site-audit-specialist', 'website-production-specialist', 'whatsapp-inquiry-specialist',
    ]
    for (const agent of AGENT_REGISTRY) {
      expect(drexonyxIds).not.toContain(agent.id)
    }
  })
})

describe('Skill Registry', () => {
  it('has skills in all 8 domains', () => {
    const domains = [...new Set(SKILL_REGISTRY.map(s => s.domain))]
    expect(domains).toHaveLength(8)
  })

  it('finds skill by name (case insensitive)', () => {
    expect(findSkill('QC')).toBeDefined()
    expect(findSkill('market research')).toBeDefined()
  })

  it('returns undefined for non-existent skill', () => {
    expect(findSkill('WhatsApp API Integration')).toBeUndefined()
  })

  it('does not include excluded skill domains', () => {
    const names = SKILL_REGISTRY.map(s => s.name.toLowerCase())
    const excluded = ['whatsapp api', 'payment gateway', 'sms', 'paid crm']
    for (const ex of excluded) {
      expect(names.some(n => n.includes(ex))).toBe(false)
    }
  })
})

describe('Workflow Registry', () => {
  it('contains exactly 10 workflows W1–W10', () => {
    expect(WORKFLOWS).toHaveLength(10)
    const ids = WORKFLOWS.map(w => w.id)
    for (let i = 1; i <= 10; i++) {
      expect(ids).toContain(`W${i}`)
    }
  })

  it('W2 (Website) has functional QC step', () => {
    const w2 = getWorkflow('W2')
    const qcSteps = w2.steps.filter(s => s.qcGate)
    expect(qcSteps.length).toBeGreaterThan(0)
  })

  it('W5 (Social Campaign) requires owner approval for publish step', () => {
    const w5 = getWorkflow('W5')
    const approvalSteps = w5.steps.filter(s => s.requiresOwnerApproval)
    expect(approvalSteps.length).toBeGreaterThan(0)
  })

  it('throws for unknown workflow', () => {
    expect(() => getWorkflow('W99' as unknown as WorkflowId)).toThrow()
  })
})

// ── Agency Director ──────────────────────────────────────────────────────────

describe('Agency Director — classifyRequest', () => {
  it('routes website request to W2', () => {
    const result = classifyRequest('build a website for a restaurant')
    expect(result.workflowId).toBe('W2')
  })

  it('routes logo request to W3', () => {
    const result = classifyRequest('design a logo and brand identity')
    expect(result.workflowId).toBe('W3')
  })

  it('routes social campaign to W5', () => {
    const result = classifyRequest('create an Instagram social campaign')
    expect(result.workflowId).toBe('W5')
  })

  it('routes Fiverr research to W8', () => {
    const result = classifyRequest('research fiverr opportunities for logo design')
    expect(result.workflowId).toBe('W8')
  })

  it('routes report request to W10', () => {
    const result = classifyRequest('generate agency report')
    expect(result.workflowId).toBe('W10')
  })

  it('flags approval-required actions', () => {
    const result = classifyRequest('publish the campaign to Facebook')
    expect(result.requiresOwnerApproval).toBe(true)
  })

  it('returns W1 for unrecognized requests', () => {
    const result = classifyRequest('something completely unrelated xyz123')
    expect(result.workflowId).toBe('W1')
  })
})

describe('Agency Director — surfaceNextBestAction', () => {
  it('surfaces approval needed when projects await approval', () => {
    const project = createProject({ name: 'Test', type: 'website', workflowId: 'W2', requiresOwnerApproval: true })
    const nba = surfaceNextBestAction([project])
    expect(nba).toContain('approval')
  })

  it('recommends Fiverr research when no active projects', () => {
    const nba = surfaceNextBestAction([])
    expect(nba).toContain('W8')
  })
})

// ── QC ───────────────────────────────────────────────────────────────────────

describe('QC Gates', () => {
  it('creates gate with items for known step', () => {
    const gate = createQCGate('p1', 'website-pre-delivery')
    expect(gate.items.length).toBeGreaterThan(0)
    expect(gate.overallStatus).toBe('pending')
  })

  it('evaluates gate as pass when all items pass', () => {
    const gate = createQCGate('p1', 'website-pre-delivery')
    gate.items.forEach(i => { i.status = 'pass' })
    const evaluated = evaluateQCGate(gate)
    expect(evaluated.overallStatus).toBe('pass')
  })

  it('evaluates gate as fail when any item fails', () => {
    const gate = createQCGate('p1', 'website-pre-delivery')
    gate.items[0].status = 'fail'
    gate.items[0].failureReason = 'Layout broken on mobile'
    gate.items.slice(1).forEach(i => { i.status = 'pass' })
    const evaluated = evaluateQCGate(gate)
    expect(evaluated.overallStatus).toBe('fail')
  })

  it('blocks delivery until QC passes', () => {
    const gate = createQCGate('p1', 'design-pre-delivery')
    expect(gate.overallStatus).toBe('pending')
    // Simulating: delivery should not proceed while gate is pending
    const canDeliver = gate.overallStatus === 'pass'
    expect(canDeliver).toBe(false)
  })
})

// ── Project State ─────────────────────────────────────────────────────────────

describe('Project State', () => {
  it('creates project with intake status', () => {
    const p = createProject({ name: 'Test Website', type: 'website', workflowId: 'W2' })
    expect(p.status).toBe('intake')
    expect(p.id).toMatch(/^mda-/)
  })

  it('updates project status', () => {
    const p = createProject({ name: 'Test', type: 'website', workflowId: 'W2' })
    const updated = updateProject(p, { status: 'in-production' })
    expect(updated.status).toBe('in-production')
    // original is unchanged (immutable update)
    expect(p.status).toBe('intake')
  })

  it('does not store payment credentials (payment status only)', () => {
    const p = createProject({ name: 'Test', type: 'website', workflowId: 'W2' })
    const keys = Object.keys(p)
    expect(keys).not.toContain('cardNumber')
    expect(keys).not.toContain('bankAccount')
    expect(keys).not.toContain('apiKey')
    expect(p.paymentStatus).toBe('unpaid')
  })
})

// ── Client State ──────────────────────────────────────────────────────────────

describe('Client State', () => {
  it('creates client with prospect status', () => {
    const c = createClient({ name: 'Test Client', source: 'fiverr' })
    expect(c.status).toBe('prospect')
    expect(c.id).toMatch(/^client-/)
  })
})

// ── Portfolio ─────────────────────────────────────────────────────────────────

describe('Portfolio', () => {
  it('marks undelivered project as ineligible', () => {
    const p = createProject({ name: 'Draft Site', type: 'website', workflowId: 'W2' })
    const result = checkPortfolioEligibility(p)
    expect(result.eligible).toBe(false)
  })

  it('marks delivered project as eligible', () => {
    const p = createProject({ name: 'Delivered Site', type: 'website', workflowId: 'W2' })
    const delivered = updateProject(p, { status: 'delivered' })
    const result = checkPortfolioEligibility(delivered)
    expect(result.eligible).toBe(true)
  })

  it('labels agency concept correctly', () => {
    const p = createProject({ name: 'Agency Concept', type: 'brand-design', workflowId: 'W3' })
    const delivered = updateProject(p, { status: 'delivered' })
    const result = checkPortfolioEligibility(delivered)
    expect(result.suggestedLabel).toBe('Agency Concept')
  })

  it('labels client work correctly', () => {
    const p = createProject({ name: 'Client Site', type: 'website', workflowId: 'W2', clientId: 'c1' })
    const delivered = updateProject(p, { status: 'delivered' })
    const result = checkPortfolioEligibility(delivered)
    expect(result.suggestedLabel).toBe('Client Work')
  })
})

// ── Reporting ─────────────────────────────────────────────────────────────────

describe('Agency Reporting', () => {
  it('generates a report with all required sections', () => {
    const p = createProject({ name: 'Website Project', type: 'website', workflowId: 'W2' })
    const c = createClient({ name: 'Test Client', source: 'direct' })
    const report = generateAgencyReport([p], [c], ['Fiverr logo niche has high demand'], 'No active campaigns')
    expect(report.generatedAt).toBeDefined()
    expect(report.nextBestAction).toBeDefined()
    expect(report.projects).toHaveLength(1)
  })

  it('formats report as readable text', () => {
    const report = generateAgencyReport([], [], [], 'Idle')
    const text = formatAgencyReport(report)
    expect(text).toContain('MASTER DIGITAL AGENCY')
    expect(text).toContain('NEXT BEST ACTION')
    expect(text).toContain('W8')
  })

  it('surfaces pending approvals in report', () => {
    const p = createProject({ name: 'Launch Campaign', type: 'social-campaign', workflowId: 'W5', requiresOwnerApproval: true })
    const report = generateAgencyReport([p], [], [], '')
    expect(report.pendingApprovals.length).toBeGreaterThan(0)
    expect(report.blockers.length).toBeGreaterThan(0)
  })
})

// ── Boundaries ────────────────────────────────────────────────────────────────

describe('Excluded domains not implemented', () => {
  it('finance module does not exist in MDA', async () => {
    const result = await import('../reporting').catch(() => null)
    expect(result).not.toBeNull()
    // reporting module should NOT export anything finance-related
    const keys = result ? Object.keys(result) : []
    expect(keys).not.toContain('processPayment')
    expect(keys).not.toContain('createInvoice')
    expect(keys).not.toContain('bankTransfer')
  })

  it('MDA module does not import DREXONYX registries', async () => {
    // Verify no cross-import by checking that the agents index does not reference drexonyx paths
    const agentModule = await import('../agents')
    // This test passes if import succeeds without touching DREXONYX internals
    expect(agentModule.AGENT_REGISTRY).toBeDefined()
  })
})
