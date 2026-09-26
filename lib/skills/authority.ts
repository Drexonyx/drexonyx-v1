// DR 0075: Skill invocation authority. Enforced in the route handler before skill.execute().
// Skills MUST NOT perform RBAC checks internally (DR 0072 §2.7, DR 0075 §2.6).

import type { SkillId } from './interface';

// DR 0075 §2.3: Human role invocation authority matrix.
// Rows not listed here are implicitly denied for all roles.
// CLIENT is excluded from all rows (DR 0075 §2.1).
// AGENT access is governed exclusively by AGENT_ALLOWLIST (DR 0075 §2.2).
export const HUMAN_SKILL_AUTHORITY: Record<SkillId, ReadonlySet<string>> = {
  'brief.analyze':                    new Set(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']),
  'brief.extract_requirements':       new Set(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']),
  'script.ad.generate':               new Set(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']),
  'script.social_caption.generate':   new Set(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']),
  'script.voiceover.generate':        new Set(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']),
  'script.scene_description.generate':new Set(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']),
  'hook.video.generate':              new Set(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']),
  'hook.thumbnail_copy.generate':     new Set(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']),
  'strategy.campaign.develop':        new Set(['OWNER', 'ADMIN_OPERATIONS']),
  'strategy.brand.positioning':       new Set(['OWNER', 'ADMIN_OPERATIONS']),
  'strategy.audience.segmentation':   new Set(['OWNER', 'ADMIN_OPERATIONS']),
  'qc.script.review':                 new Set(['OWNER', 'ADMIN_OPERATIONS', 'QC']),
  'qc.brand.alignment':               new Set(['OWNER', 'ADMIN_OPERATIONS', 'QC']),
  'qc.asset.metadata':                new Set(['OWNER', 'ADMIN_OPERATIONS', 'QC']),
  'qc.creative.quality':              new Set(['OWNER', 'ADMIN_OPERATIONS', 'QC']),
  'qc.facebook_policy.check':         new Set(['OWNER', 'ADMIN_OPERATIONS', 'QC']),
  'communication.whatsapp.classify':  new Set(['OWNER', 'ADMIN_OPERATIONS']),
  'facebook.page.publish':            new Set(['OWNER', 'ADMIN_OPERATIONS']),
  'utility.prompt.optimize':          new Set(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']),
  'utility.output.format':            new Set(['OWNER', 'ADMIN_OPERATIONS', 'CREATIVE_PRODUCTION']),
  // DR 0075 §2.3: utility.batch.coordinate restricted to OWNER + ADMIN_OPERATIONS only
  'utility.batch.coordinate':         new Set(['OWNER', 'ADMIN_OPERATIONS']),
};

// DR 0075 §2.2 Option B: AGENT may invoke ONLY these skills.
// Allowlist MUST NOT be expanded without explicit Owner approval + new/amended decision record.
// DR 0115: expanded to include qc.script.review and qc.brand.alignment.
export const AGENT_ALLOWLIST: ReadonlySet<SkillId> = new Set([
  'utility.prompt.optimize',
  'qc.asset.metadata',
  'qc.script.review',      // DR 0115 — machine recommendation only, not a binding verdict
  'qc.brand.alignment',    // DR 0115 — machine recommendation only, not a binding verdict
  'qc.creative.quality',         // DR 0123 — brief fidelity check, machine recommendation only
  'qc.facebook_policy.check',          // DR 0124 — deterministic platform policy check, zero AI calls
  'communication.whatsapp.classify',   // DR 0125 — deterministic inbound classifier, zero AI calls
  'facebook.page.publish',             // DR 0126 — post-HUMAN_GATE-approval organic publish only
  'script.social_caption.generate',   // DR 0127 — agent-driven caption generation for campaign workflow
  'strategy.campaign.develop',         // DR 0127 — agent-driven campaign strategy for campaign workflow
]);

// Returns true if the given human role is authorized to invoke the skill.
// CLIENT and AGENT are never authorized via this check.
export function isHumanAuthorized(skillId: SkillId, role: string): boolean {
  const allowed = HUMAN_SKILL_AUTHORITY[skillId];
  if (!allowed) return false;
  return allowed.has(role);
}

// Returns true if the AGENT is authorized to invoke the skill (allowlist check only).
export function isAgentAuthorized(skillId: SkillId): boolean {
  return AGENT_ALLOWLIST.has(skillId);
}
