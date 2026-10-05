/**
 * Skill activation — determines which skills are active for a given request
 * and workflow, rather than dumping all skills from all assigned agents.
 *
 * Each workflow has:
 *   core     — always active for this workflow
 *   conditional — active only when the request matches the pattern
 *
 * Skills not listed here are not activated, even if an assigned agent owns them.
 */

import { type AgentDefinition } from '../agents'

interface WorkflowSkillProfile {
  core: string[]
  conditional: Array<{ pattern: RegExp; skills: string[] }>
}

const WORKFLOW_SKILL_PROFILES: Record<string, WorkflowSkillProfile> = {

  W1: {
    core: [
      'Requirement Analysis', 'Project Planning', 'Client Communication',
      'QC', 'Delivery',
    ],
    conditional: [
      { pattern: /report|reporting/i, skills: ['Reporting'] },
      { pattern: /portfolio|case\s+study/i, skills: ['Case Study Creation', 'Portfolio Curation'] },
    ],
  },

  W2: {
    core: [
      'Requirement Analysis', 'Project Planning',
      'Website Development', 'Landing Page Development', 'UI/UX', 'Frontend',
      'Client Communication', 'QC', 'Delivery',
    ],
    conditional: [
      // Technical requirements activated by explicit need
      {
        pattern: /back.?end|booking\s+system|reservation|contact\s+form|form\s+submit|server.side|api\b|database\b|\bdb\b/i,
        skills: ['Backend', 'Database', 'API fundamentals without paid dependency assumptions'],
      },
      // Menu / food design
      {
        pattern: /\bmenu\b|food\s+menu|digital\s+menu|dishes\b/i,
        skills: ['Menu Design'],
      },
      // Branding
      {
        pattern: /\blogo\b|brand\s+identity|visual\s+identity|rebrand/i,
        skills: ['Brand Identity', 'Logo Design'],
      },
      // Research (workflow has a Research step)
      {
        pattern: /research|competitor|market\s+research|competition|competi/i,
        skills: ['Market Research', 'Competitor Intelligence', 'Trend Analysis'],
      },
      // Copy / content writing
      {
        pattern: /content|copy\b|caption|about\s+us|blog|text\s+for|write/i,
        skills: ['Caption Writing'],
      },
      // Headline / CTA copy
      {
        pattern: /hook\b|headline|call.to.action|conversion|hero\s+copy/i,
        skills: ['Hook Writing'],
      },
      // Portfolio / case study post-delivery
      {
        pattern: /portfolio|case\s+study/i,
        skills: ['Case Study Creation'],
      },
      // Reporting
      {
        pattern: /report|reporting|analytics/i,
        skills: ['Reporting'],
      },
    ],
  },

  W3: {
    core: [
      'Requirement Analysis', 'Project Planning',
      'Logo Design', 'Brand Identity',
      'Client Communication', 'QC', 'Delivery',
    ],
    conditional: [
      { pattern: /social|instagram|facebook|twitter/i, skills: ['Social Media Design'] },
      { pattern: /poster|print|banner|flyer/i, skills: ['Poster Design'] },
      { pattern: /presentation|deck|pitch|slide/i, skills: ['Presentation Design'] },
      { pattern: /\bmenu\b/i, skills: ['Menu Design'] },
      { pattern: /digital|online|web|marketing\s+material/i, skills: ['Digital Marketing Materials'] },
      { pattern: /advert|ad\b|campaign\s+creative/i, skills: ['Advertising Creative'] },
      { pattern: /research|reference|competitor|inspect/i, skills: ['Market Research', 'Competitor Intelligence'] },
      { pattern: /portfolio|case\s+study/i, skills: ['Case Study Creation'] },
      { pattern: /report|reporting/i, skills: ['Reporting'] },
    ],
  },

  W4: {
    core: [
      'Requirement Analysis', 'Project Planning',
      'Scriptwriting', 'Hook Writing', 'Short-form Video', 'Video Editing',
      'Client Communication', 'QC', 'Delivery',
    ],
    conditional: [
      { pattern: /reels?|instagram|ig\b/i, skills: ['Reels', 'Platform Adaptation'] },
      { pattern: /tiktok|tik\s+tok/i, skills: ['TikTok Content', 'Platform Adaptation'] },
      { pattern: /ugc|user.generated/i, skills: ['UGC-style Creative'] },
      { pattern: /storyboard/i, skills: ['Storyboarding'] },
      { pattern: /repurpose|adapt|derivative/i, skills: ['Content Repurposing'] },
      { pattern: /platform|multi.channel/i, skills: ['Platform Adaptation'] },
      { pattern: /research|competitor/i, skills: ['Market Research', 'Competitor Intelligence'] },
      { pattern: /report|analytics/i, skills: ['Campaign Reporting', 'Reporting'] },
      { pattern: /portfolio|case\s+study/i, skills: ['Case Study Creation'] },
    ],
  },

  W5: {
    core: [
      'Requirement Analysis', 'Project Planning',
      'Content Calendar', 'Publishing Workflow',
      'Social Campaign Strategy', 'Content Strategy',
      'Campaign Reporting', 'Organic Optimization',
      'Client Communication', 'QC', 'Delivery',
    ],
    conditional: [
      { pattern: /instagram|reels?/i, skills: ['Reels', 'Platform Adaptation'] },
      { pattern: /tiktok/i, skills: ['TikTok Content', 'Platform Adaptation'] },
      { pattern: /research|competitor/i, skills: ['Market Research', 'Competitor Intelligence'] },
      { pattern: /analytics|performance|measure/i, skills: ['Social Analytics'] },
      { pattern: /design|visual|creative/i, skills: ['Social Media Design'] },
      { pattern: /ugc/i, skills: ['UGC-style Creative'] },
      { pattern: /repurpose/i, skills: ['Content Repurposing'] },
      { pattern: /report/i, skills: ['Reporting'] },
      { pattern: /portfolio|case\s+study/i, skills: ['Case Study Creation'] },
    ],
  },

  W6: {
    core: [
      'Requirement Analysis', 'Content Repurposing', 'Platform Adaptation',
      'Publishing Workflow', 'Caption Writing', 'QC', 'Delivery',
    ],
    conditional: [
      { pattern: /reels?|instagram/i, skills: ['Reels'] },
      { pattern: /tiktok/i, skills: ['TikTok Content'] },
      { pattern: /report|analytics/i, skills: ['Campaign Reporting'] },
    ],
  },

  W7: {
    core: [
      'Requirement Analysis', 'Market Research', 'Competitor Intelligence',
      'Trend Analysis', 'Opportunity Scoring', 'Reporting',
    ],
    conditional: [
      { pattern: /fiverr/i, skills: ['Fiverr Market Intelligence', 'Pricing Intelligence'] },
      { pattern: /social|youtube|instagram|channel/i, skills: ['YouTube/Social Analysis'] },
      { pattern: /pric|cost|rate|fee/i, skills: ['Pricing Intelligence'] },
    ],
  },

  W8: {
    core: [
      'Requirement Analysis',
      'Fiverr Market Intelligence', 'Opportunity Scoring',
      'Market Research', 'Competitor Intelligence',
      'Pricing Intelligence', 'Offer Design', 'Service Packaging',
    ],
    conditional: [
      { pattern: /website|web\s+design|landing/i, skills: ['Website Development', 'Landing Page Development'] },
      { pattern: /\blogo\b|brand/i, skills: ['Logo Design', 'Brand Identity'] },
      { pattern: /video|reel/i, skills: ['Short-form Video'] },
      { pattern: /social|campaign/i, skills: ['Social Campaign Strategy'] },
      { pattern: /report/i, skills: ['Reporting'] },
    ],
  },

  W9: {
    core: [
      'Requirement Analysis',
      'Case Study Creation', 'Portfolio Curation',
      'Client Communication', 'QC', 'Delivery',
    ],
    conditional: [
      { pattern: /design|visual|brand/i, skills: ['Brand Identity', 'Social Media Design'] },
      { pattern: /website|web/i, skills: ['Website Development'] },
      { pattern: /report|analytics/i, skills: ['Reporting', 'Campaign Reporting'] },
    ],
  },

  W10: {
    core: [
      'Requirement Analysis', 'Project Planning',
      'Reporting', 'Portfolio Curation',
    ],
    conditional: [
      { pattern: /campaign|social/i, skills: ['Campaign Reporting'] },
      { pattern: /analytics|performance/i, skills: ['Social Analytics'] },
    ],
  },
}

/**
 * Select the skills to activate for a request.
 *
 * Only skills that are:
 * (a) in the workflow's core set, or
 * (b) matched by a conditional pattern against the request,
 * ...AND owned by at least one assigned agent
 * are returned.
 *
 * Skills the agent registry doesn't hold are silently excluded.
 */
export function selectSkills(
  request: string,
  workflowId: string,
  assignedAgentIds: string[],
  agentRegistry: AgentDefinition[],
): string[] {
  // Build the full skill pool available from assigned agents
  const agentSkillPool = new Set<string>(
    assignedAgentIds.flatMap(id => {
      const agent = agentRegistry.find(a => a.id === id)
      return agent?.skills ?? []
    }),
  )

  const profile = WORKFLOW_SKILL_PROFILES[workflowId]
  if (!profile) {
    // Unknown workflow — fall back to all agent skills
    return [...agentSkillPool]
  }

  const activated = new Set<string>()

  // Always-active core skills (restricted to what assigned agents actually own)
  for (const skill of profile.core) {
    if (agentSkillPool.has(skill)) {
      activated.add(skill)
    }
  }

  // Conditional skills activated by request keywords
  for (const { pattern, skills } of profile.conditional) {
    if (pattern.test(request)) {
      for (const skill of skills) {
        if (agentSkillPool.has(skill)) {
          activated.add(skill)
        }
      }
    }
  }

  return [...activated]
}
