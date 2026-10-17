import { describe, it, expect } from 'vitest'
import { classifyRequest } from '../agents/core/agency-director'

// TEST A: Pure website intent → W2
describe('TEST A — pure website intent', () => {
  it('routes "Create a website for a coffee shop." to W2', () => {
    const result = classifyRequest('Create a website for a coffee shop.')
    expect(result.workflowId).toBe('W2')
  })
})

// TEST B: Pure social/Instagram intent → W5
describe('TEST B — pure Instagram post intent', () => {
  it('routes "Create 3 Instagram posts for a coffee shop launch." to W5', () => {
    const result = classifyRequest('Create 3 Instagram posts for a coffee shop launch.')
    expect(result.workflowId).toBe('W5')
  })
})

// TEST C: Combined website + Instagram (tie case) → both W2 and W5 identified
describe('TEST C — website + Instagram posts (multi-intent)', () => {
  it('identifies both W2 and W5 when brief mentions website and Instagram posts', () => {
    const result = classifyRequest(
      'Build a website for our bakery. We also need 3 Instagram posts to promote the launch.',
    )
    const allWorkflows = [
      result.workflowId,
      ...(result.secondaryIntents ?? []).map(i => i.workflowId),
    ]
    expect(allWorkflows).toContain('W2')
    expect(allWorkflows).toContain('W5')
    expect(result.secondaryIntents?.length).toBeGreaterThan(0)
  })
})

// TEST D: Website + social campaign (explicit campaign language) → both identified
describe('TEST D — website plus social campaign (multi-intent)', () => {
  it('identifies both W2 and W5 when brief mentions website and social campaign', () => {
    const result = classifyRequest(
      'We need a new landing page and a full Instagram social campaign with content calendar.',
    )
    const allWorkflows = [
      result.workflowId,
      ...(result.secondaryIntents ?? []).map(i => i.workflowId),
    ]
    expect(allWorkflows).toContain('W2')
    expect(allWorkflows).toContain('W5')
    expect(result.secondaryIntents?.length).toBeGreaterThan(0)
  })
})

// TEST E: Full NOVA COFFEE DUBAI brief — social signal dominates website mention → W5
describe('TEST E — full NOVA COFFEE DUBAI brief routes to W5 not W2', () => {
  const novaCoffeeBrief = `
    Client: Nova Coffee Dubai
    Project: Launch campaign for new specialty coffee brand in Dubai
    Deliverables:
      - Instagram campaign: 12 posts, 4 reels, 3 stories per week for 30 days
      - Social media campaign strategy with content pillars and posting schedule
      - Campaign creative direction aligned with brand identity
      - Instagram content calendar for Q1
    Reference: website: novacoffee.ae (proposed, not yet built — landing page may be needed later)
    Platform: Instagram primary, Facebook secondary
    Budget: Campaign launch within 2 weeks
  `
  it('routes NOVA COFFEE DUBAI brief to W5 (social campaign, not W2 website)', () => {
    const result = classifyRequest(novaCoffeeBrief)
    expect(result.workflowId).toBe('W5')
  })

  it('NOVA COFFEE brief identifies website as secondary (W2 in secondaryIntents)', () => {
    const result = classifyRequest(novaCoffeeBrief)
    const secondaryWorkflows = (result.secondaryIntents ?? []).map(i => i.workflowId)
    expect(secondaryWorkflows).toContain('W2')
  })
})

// Override route preservation
describe('Override routes — first-match still wins', () => {
  it('repurpose request routes to W6 even with video/tiktok keywords', () => {
    const result = classifyRequest('repurpose our video content for TikTok')
    expect(result.workflowId).toBe('W6')
  })

  it('fiverr request routes to W8 even with design keywords', () => {
    const result = classifyRequest('research fiverr gig for logo design')
    expect(result.workflowId).toBe('W8')
  })

  it('portfolio request routes to W9 even with website keywords', () => {
    const result = classifyRequest('create portfolio case study for the website project')
    expect(result.workflowId).toBe('W9')
  })

  it('agency report routes to W10', () => {
    const result = classifyRequest('generate full agency report and status summary')
    expect(result.workflowId).toBe('W10')
  })
})

// Existing single-intent routes still work
describe('Existing single-intent routes preserved', () => {
  it('website → W2', () => {
    expect(classifyRequest('build a website for a restaurant').workflowId).toBe('W2')
  })

  it('logo + brand → W3', () => {
    expect(classifyRequest('logo and brand identity for a beauty salon').workflowId).toBe('W3')
  })

  it('short videos for Instagram reels → W4 (video dominates)', () => {
    expect(classifyRequest('5 short videos for Instagram reels').workflowId).toBe('W4')
  })

  it('30-day social media campaign → W5', () => {
    expect(classifyRequest('30-day social media campaign with content calendar').workflowId).toBe('W5')
  })

  it('market research → W7', () => {
    expect(classifyRequest('market research competitor analysis').workflowId).toBe('W7')
  })

  it('unrecognized request → W1', () => {
    expect(classifyRequest('something completely unrelated xyz123').workflowId).toBe('W1')
  })
})
