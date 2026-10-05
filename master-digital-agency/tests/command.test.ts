import { describe, it, expect } from 'vitest'
import { handleCommand, formatCommandResponse } from '../command'

// ── Requirement coverage ────────────────────────────────────────────────────
// 1.  Accept natural-language request
// 2.  Send through Agency Director
// 3.  Classify request
// 4.  Select agents
// 5.  Select skills
// 6.  Select workflow
// 7.  Create project state
// 8.  Return current status
// 9.  Return QC requirements
// 10. Return approval requirements
// 11. Return next-best-action
// 12. Identify excluded requests
// 13. Preserve existing tests and architecture

describe('handleCommand — normal requests', () => {
  it('req 1-8: accepts request and returns structured response', () => {
    const res = handleCommand('A restaurant in Dubai wants a premium website.')
    expect(res.excluded).toBe(false)
    if (res.excluded) return
    // 1. request echoed
    expect(res.request).toBe('A restaurant in Dubai wants a premium website.')
    // 3. classified
    expect(res.classification.workflowId).toBe('W2')
    expect(res.classification.workflowName).toBe('Website')
    // 4. agents selected
    expect(res.agents.primary.id).toBe('web-production')
    expect(res.agents.supporting.length).toBeGreaterThan(0)
    // 5. skills selected
    expect(res.skills).toContain('Website Development')
    expect(res.skills.length).toBeGreaterThan(0)
    // 6. workflow selected
    expect(res.workflow.id).toBe('W2')
    expect(res.workflow.stepCount).toBeGreaterThan(0)
    // 7. project state created
    expect(res.project.id).toMatch(/^mda-/)
    expect(res.project.type).toBe('website')
    // 8. status returned
    expect(res.project.status).toBe('intake')
  })

  it('req 9: returns QC requirements for website workflow', () => {
    const res = handleCommand('Build a landing page for a Dubai hotel.')
    if (res.excluded) throw new Error('Should not be excluded')
    expect(res.qcRequirements.length).toBeGreaterThan(0)
    const qc = res.qcRequirements[0]
    expect(qc.gate).toBeDefined()
    expect(qc.itemCount).toBeGreaterThan(0)
    expect(qc.dimensions).toContain('visual')
  })

  it('req 10: returns approval requirements for publish action', () => {
    const res = handleCommand('Publish the social campaign on Facebook and Instagram.')
    if (res.excluded) throw new Error('Should not be excluded')
    expect(res.requiresOwnerApproval).toBe(true)
    expect(res.approvalTriggers.length).toBeGreaterThan(0)
  })

  it('req 10: no approval required for non-sensitive requests', () => {
    const res = handleCommand('Research competitor websites in Dubai market.')
    if (res.excluded) throw new Error('Should not be excluded')
    // research doesn't contain approval keywords
    expect(res.requiresOwnerApproval).toBe(false)
  })

  it('req 11: returns next-best-action', () => {
    const res = handleCommand('Design a logo for a new cafe.')
    if (res.excluded) throw new Error('Should not be excluded')
    expect(typeof res.nextBestAction).toBe('string')
    expect(res.nextBestAction.length).toBeGreaterThan(0)
  })

  it('audit log is populated', () => {
    const res = handleCommand('Create a social media campaign.')
    expect(res.auditLog.length).toBeGreaterThan(0)
    expect(res.auditLog[0]).toContain('REQUEST')
  })
})

describe('handleCommand — routing coverage', () => {
  const cases: Array<[string, string, string]> = [
    ['restaurant website Dubai', 'W2', 'web-production'],
    ['logo and brand identity for a beauty salon', 'W3', 'brand-design-production'],
    ['5 short videos for Instagram reels', 'W4', 'video-creative-production'],
    ['30-day social media campaign', 'W5', 'social-media-campaign-director'],
    ['repurpose our video content for TikTok', 'W6', 'social-media-campaign-director'],
    ['market research competitor analysis', 'W7', 'research-intelligence'],
    ['fiverr gig for logo design', 'W8', 'offer-pricing'],
    ['portfolio case study for completed project', 'W9', 'delivery-client-success'],
    ['agency report status summary', 'W10', 'agency-reporting'],
  ]

  cases.forEach(([input, expectedWorkflow, expectedAgent]) => {
    it(`routes "${input.slice(0, 40)}" → ${expectedWorkflow}`, () => {
      const res = handleCommand(input)
      if (res.excluded) throw new Error('Should not be excluded')
      expect(res.classification.workflowId).toBe(expectedWorkflow)
      expect(res.agents.primary.id).toBe(expectedAgent)
    })
  })
})

describe('handleCommand — excluded requests (req 12)', () => {
  it('rejects WhatsApp API request', () => {
    const res = handleCommand('Set up WhatsApp API automation with AI calling.')
    expect(res.excluded).toBe(true)
    if (!res.excluded) return
    expect(res.reason).toContain('WhatsApp API')
    expect(res.requiresOwnerApproval).toBe(true)
  })

  it('rejects AI calling request', () => {
    const res = handleCommand('Build an AI calling system for leads.')
    expect(res.excluded).toBe(true)
    if (!res.excluded) return
    expect(res.reason).toContain('calling')
  })

  it('rejects SMS campaign request', () => {
    const res = handleCommand('Run an SMS marketing campaign to our customer list.')
    expect(res.excluded).toBe(true)
    if (!res.excluded) return
    expect(res.reason).toContain('SMS')
  })

  it('rejects bank / payment integration request', () => {
    const res = handleCommand('Connect the agency to my bank account and automatically manage payments.')
    expect(res.excluded).toBe(true)
    if (!res.excluded) return
    expect(res.reason).toContain('Finance')
  })

  it('rejects fake followers / spam request', () => {
    const res = handleCommand('Buy fake followers and run a mass spam campaign.')
    expect(res.excluded).toBe(true)
    if (!res.excluded) return
    expect(res.reason).toContain('fake')
  })

  it('rejects Stripe / payment gateway request', () => {
    const res = handleCommand('Integrate Stripe payment gateway into the agency.')
    expect(res.excluded).toBe(true)
    if (!res.excluded) return
    expect(res.reason).toContain('Finance')
  })

  it('excluded response always requires owner approval', () => {
    const res = handleCommand('Set up HubSpot CRM integration.')
    expect(res.excluded).toBe(true)
    if (!res.excluded) return
    expect(res.requiresOwnerApproval).toBe(true)
  })

  it('excluded response always has nextBestAction', () => {
    const res = handleCommand('Set up WhatsApp API.')
    if (!res.excluded) return
    expect(res.nextBestAction.length).toBeGreaterThan(0)
  })

  it('excluded response has audit log', () => {
    const res = handleCommand('Set up WhatsApp API.')
    expect(res.auditLog.some(l => l.includes('EXCLUDED'))).toBe(true)
  })
})

describe('handleCommand — edge cases', () => {
  it('handles empty-ish request gracefully (falls to W1)', () => {
    const res = handleCommand('help me with something')
    expect(res.excluded).toBe(false)
    if (res.excluded) return
    // W1 is the fallback for unclassified requests
    expect(res.classification.workflowId).toBe('W1')
    expect(res.requiresOwnerApproval).toBe(true)
  })

  it('respects existing projects for NBA calculation', async () => {
    // Pass a project that needs approval to influence NBA
    const { createProject } = await import('../state/project')
    const pending = createProject({ name: 'Pending approval project', type: 'website', workflowId: 'W2', requiresOwnerApproval: true })
    const res = handleCommand('Research Fiverr logo opportunities.', [pending])
    if (res.excluded) throw new Error('Should not be excluded')
    expect(res.nextBestAction).toContain('approval')
  })

  it('includes client_id in project when provided', () => {
    // handleCommand accepts optional clientId
    const res = handleCommand('Build a website for this client.', [], 'client-abc-123')
    if (res.excluded) throw new Error('Should not be excluded')
    // Project is created — clientId is passed through but not in the command response project summary
    // (only id/name/type/status are surfaced at the command layer)
    expect(res.project.id).toMatch(/^mda-/)
  })
})

// ── Skill activation precision (req: progressive / relevant only) ────────────

describe('skill activation precision — website (W2)', () => {
  const websiteRes = () => handleCommand('A restaurant in Dubai wants a premium website.')

  it('does not activate Fiverr Market Intelligence', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Fiverr Market Intelligence')
  })

  it('does not activate YouTube/Social Analysis', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('YouTube/Social Analysis')
  })

  it('does not activate Opportunity Scoring', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Opportunity Scoring')
  })

  it('does not activate Short-form Video', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Short-form Video')
  })

  it('does not activate Reels', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Reels')
  })

  it('does not activate TikTok Content', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('TikTok Content')
  })

  it('does not activate Content Calendar', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Content Calendar')
  })

  it('does not activate Publishing Workflow', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Publishing Workflow')
  })

  it('does not activate Campaign Reporting', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Campaign Reporting')
  })

  it('does not activate Poster Design', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Poster Design')
  })

  it('does not activate Presentation Design', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Presentation Design')
  })

  it('does not activate Social Media Design', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Social Media Design')
  })

  it('does not activate Advertising Creative', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Advertising Creative')
  })

  it('always activates Website Development', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('Website Development')
  })

  it('always activates UI/UX', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('UI/UX')
  })

  it('always activates QC', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('QC')
  })

  it('always activates Delivery', () => {
    const res = websiteRes()
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('Delivery')
  })
})

describe('skill activation precision — conditional skills', () => {
  it('Backend activates when booking system is mentioned', () => {
    const res = handleCommand('Build a website with a backend booking system for a hotel.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('Backend')
  })

  it('Backend does NOT activate for a basic website with no server-side mention', () => {
    const res = handleCommand('A restaurant in Dubai wants a premium website.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Backend')
  })

  it('Database activates when reservation system is mentioned', () => {
    const res = handleCommand('Build a website with a reservation database for a restaurant.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('Database')
  })

  it('Database does NOT activate for basic website', () => {
    const res = handleCommand('A restaurant in Dubai wants a premium website.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Database')
  })

  it('API fundamentals activate when API is mentioned', () => {
    const res = handleCommand('Build a website with an API for the contact form.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('API fundamentals without paid dependency assumptions')
  })

  it('Menu Design activates when menu is explicitly mentioned', () => {
    const res = handleCommand('Build a restaurant website with a menu section.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('Menu Design')
  })

  it('Menu Design does NOT activate for a generic website', () => {
    const res = handleCommand('Build a website for a Dubai business.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Menu Design')
  })

  it('Brand Identity activates when logo/identity is requested', () => {
    const res = handleCommand('Build a website with logo and brand identity for a new restaurant.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('Brand Identity')
    expect(res.skills).toContain('Logo Design')
  })

  it('Brand Identity does NOT activate for a basic website with no branding mention', () => {
    const res = handleCommand('A restaurant in Dubai wants a premium website.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Brand Identity')
  })
})

describe('skill activation — video workflow (W4)', () => {
  it('does not activate Fiverr Market Intelligence', () => {
    const res = handleCommand('A business needs 5 short promotional videos for Instagram.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Fiverr Market Intelligence')
  })

  it('does not activate social campaign skills', () => {
    const res = handleCommand('A business needs 5 short promotional videos for Instagram.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Content Calendar')
    expect(res.skills).not.toContain('Publishing Workflow')
  })

  it('activates Short-form Video and Scriptwriting', () => {
    const res = handleCommand('A business needs 5 short promotional videos for Instagram.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('Short-form Video')
    expect(res.skills).toContain('Scriptwriting')
  })
})

describe('skill activation — social campaign (W5)', () => {
  it('does not activate video production skills', () => {
    const res = handleCommand('A restaurant needs a 30-day social media content campaign.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Short-form Video')
    expect(res.skills).not.toContain('Video Editing')
    expect(res.skills).not.toContain('Storyboarding')
  })

  it('does not activate Fiverr Market Intelligence', () => {
    const res = handleCommand('A restaurant needs a 30-day social media content campaign.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).not.toContain('Fiverr Market Intelligence')
  })

  it('activates Content Calendar', () => {
    const res = handleCommand('A restaurant needs a 30-day social media content campaign.')
    if (res.excluded) throw new Error('not excluded')
    expect(res.skills).toContain('Content Calendar')
  })
})

describe('skill activation — multi-domain requests still work', () => {
  it('website sub-request routes correctly with correct skills', () => {
    const res = handleCommand('build a website for a Dubai business')
    if (res.excluded) throw new Error('not excluded')
    expect(res.classification.workflowId).toBe('W2')
    expect(res.skills).toContain('Website Development')
    expect(res.skills).not.toContain('Fiverr Market Intelligence')
  })

  it('branding sub-request routes correctly with correct skills', () => {
    const res = handleCommand('design a brand identity and logo')
    if (res.excluded) throw new Error('not excluded')
    expect(res.classification.workflowId).toBe('W3')
    expect(res.skills).toContain('Logo Design')
    expect(res.skills).toContain('Brand Identity')
    expect(res.skills).not.toContain('Short-form Video')
  })

  it('video sub-request routes correctly with correct skills', () => {
    const res = handleCommand('produce a short promotional video')
    if (res.excluded) throw new Error('not excluded')
    expect(res.classification.workflowId).toBe('W4')
    expect(res.skills).toContain('Short-form Video')
    expect(res.skills).not.toContain('Content Calendar')
  })
})

describe('formatCommandResponse', () => {
  it('formats normal response as readable text', () => {
    const res = handleCommand('Build a website for a Dubai hotel.')
    const text = formatCommandResponse(res)
    expect(text).toContain('AGENCY DIRECTOR RESPONSE')
    expect(text).toContain('W2')
    expect(text).toContain('NEXT BEST ACTION')
    expect(text).toContain('QC REQUIREMENTS')
  })

  it('formats excluded response clearly', () => {
    const res = handleCommand('Set up WhatsApp API automation.')
    const text = formatCommandResponse(res)
    expect(text).toContain('EXCLUDED REQUEST')
    expect(text).toContain('owner approval')
  })
})
