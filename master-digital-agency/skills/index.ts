// MDA Skill Registry — isolated from DREXONYX skills

export type SkillDomain =
  | 'research'
  | 'strategy'
  | 'web-software'
  | 'design'
  | 'video-content'
  | 'social-operations'
  | 'operations'
  | 'automation'

export interface SkillDefinition {
  name: string
  domain: SkillDomain
}

export const SKILL_REGISTRY: SkillDefinition[] = [
  // Research
  { name: 'Market Research', domain: 'research' },
  { name: 'Competitor Intelligence', domain: 'research' },
  { name: 'Trend Analysis', domain: 'research' },
  { name: 'Fiverr Market Intelligence', domain: 'research' },
  { name: 'Pricing Intelligence', domain: 'research' },
  { name: 'YouTube/Social Analysis', domain: 'research' },
  { name: 'Opportunity Scoring', domain: 'research' },
  // Strategy
  { name: 'Requirement Analysis', domain: 'strategy' },
  { name: 'Offer Design', domain: 'strategy' },
  { name: 'Service Packaging', domain: 'strategy' },
  { name: 'Content Strategy', domain: 'strategy' },
  { name: 'Social Campaign Strategy', domain: 'strategy' },
  { name: 'Conversion Strategy', domain: 'strategy' },
  { name: 'Creative Strategy', domain: 'strategy' },
  // Web / Software
  { name: 'Website Development', domain: 'web-software' },
  { name: 'Landing Page Development', domain: 'web-software' },
  { name: 'UI/UX', domain: 'web-software' },
  { name: 'Web App Development', domain: 'web-software' },
  { name: 'Basic Mobile App Development', domain: 'web-software' },
  { name: 'Frontend', domain: 'web-software' },
  { name: 'Backend', domain: 'web-software' },
  { name: 'Database', domain: 'web-software' },
  { name: 'API fundamentals without paid dependency assumptions', domain: 'web-software' },
  // Design
  { name: 'Logo Design', domain: 'design' },
  { name: 'Brand Identity', domain: 'design' },
  { name: 'Social Media Design', domain: 'design' },
  { name: 'Advertising Creative', domain: 'design' },
  { name: 'Poster Design', domain: 'design' },
  { name: 'Menu Design', domain: 'design' },
  { name: 'Presentation Design', domain: 'design' },
  { name: 'Digital Marketing Materials', domain: 'design' },
  // Video / Content
  { name: 'Short-form Video', domain: 'video-content' },
  { name: 'Reels', domain: 'video-content' },
  { name: 'TikTok Content', domain: 'video-content' },
  { name: 'Video Editing', domain: 'video-content' },
  { name: 'Scriptwriting', domain: 'video-content' },
  { name: 'Hook Writing', domain: 'video-content' },
  { name: 'Storyboarding', domain: 'video-content' },
  { name: 'UGC-style Creative', domain: 'video-content' },
  { name: 'Content Repurposing', domain: 'video-content' },
  { name: 'Caption Writing', domain: 'video-content' },
  // Social Operations
  { name: 'Content Calendar', domain: 'social-operations' },
  { name: 'Platform Adaptation', domain: 'social-operations' },
  { name: 'Publishing Workflow', domain: 'social-operations' },
  { name: 'Social Analytics', domain: 'social-operations' },
  { name: 'Campaign Reporting', domain: 'social-operations' },
  { name: 'Organic Optimization', domain: 'social-operations' },
  // Operations
  { name: 'Project Planning', domain: 'operations' },
  { name: 'Client Communication', domain: 'operations' },
  { name: 'QC', domain: 'operations' },
  { name: 'Delivery', domain: 'operations' },
  { name: 'Case Study Creation', domain: 'operations' },
  { name: 'Portfolio Curation', domain: 'operations' },
  { name: 'Reporting', domain: 'operations' },
  // Automation
  { name: 'Local/low-cost workflow automation', domain: 'automation' },
  { name: 'Task routing', domain: 'automation' },
  { name: 'Asset routing', domain: 'automation' },
  { name: 'Report automation', domain: 'automation' },
  { name: 'Content repurposing automation', domain: 'automation' },
]

export function getSkillsByDomain(domain: SkillDomain): SkillDefinition[] {
  return SKILL_REGISTRY.filter(s => s.domain === domain)
}

export function findSkill(name: string): SkillDefinition | undefined {
  return SKILL_REGISTRY.find(s => s.name.toLowerCase() === name.toLowerCase())
}
