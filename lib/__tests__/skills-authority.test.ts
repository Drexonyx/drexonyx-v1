import { describe, it, expect } from 'vitest';
import { isHumanAuthorized, isAgentAuthorized, AGENT_ALLOWLIST } from '../skills/authority';
import type { SkillId } from '../skills/interface';

const ALL_SKILL_IDS: SkillId[] = [
  'brief.analyze',
  'brief.extract_requirements',
  'script.ad.generate',
  'script.social_caption.generate',
  'script.voiceover.generate',
  'script.scene_description.generate',
  'hook.video.generate',
  'hook.thumbnail_copy.generate',
  'strategy.campaign.develop',
  'strategy.brand.positioning',
  'strategy.audience.segmentation',
  'qc.script.review',
  'qc.brand.alignment',
  'qc.asset.metadata',
  'qc.creative.quality',
  'communication.whatsapp.classify',
  'utility.prompt.optimize',
  'utility.output.format',
  'utility.batch.coordinate',
];

describe('AGENT_ALLOWLIST', () => {
  // DR 0115: expanded from 2 to 4 — qc.script.review and qc.brand.alignment added.
  // DR 0123: expanded from 4 to 5 — qc.creative.quality added (brief fidelity check).
  // DR 0124: expanded from 5 to 6 — qc.facebook_policy.check added (deterministic, zero AI).
  // DR 0125: expanded from 6 to 7 — communication.whatsapp.classify added (deterministic, zero AI).
  // DR 0126: expanded from 7 to 8 — facebook.page.publish added (post-HUMAN_GATE organic publish).
  // DR 0127: expanded from 8 to 10 — script.social_caption.generate and strategy.campaign.develop added.
  // DR 0128: expanded from 10 to 15 — 5 sales skills added (discover, verify, score, qualify, outreach.draft).
  it('contains exactly the fifteen DR-approved skills', () => {
    expect(AGENT_ALLOWLIST.size).toBe(15);
    expect(AGENT_ALLOWLIST.has('utility.prompt.optimize')).toBe(true);
    expect(AGENT_ALLOWLIST.has('qc.asset.metadata')).toBe(true);
    expect(AGENT_ALLOWLIST.has('qc.script.review')).toBe(true);
    expect(AGENT_ALLOWLIST.has('qc.brand.alignment')).toBe(true);
    expect(AGENT_ALLOWLIST.has('qc.creative.quality')).toBe(true);
    expect(AGENT_ALLOWLIST.has('qc.facebook_policy.check')).toBe(true);
    expect(AGENT_ALLOWLIST.has('communication.whatsapp.classify')).toBe(true);
    expect(AGENT_ALLOWLIST.has('facebook.page.publish')).toBe(true);
    expect(AGENT_ALLOWLIST.has('script.social_caption.generate')).toBe(true);
    expect(AGENT_ALLOWLIST.has('strategy.campaign.develop')).toBe(true);
  });
});

describe('isAgentAuthorized', () => {
  it('returns true for utility.prompt.optimize', () => {
    expect(isAgentAuthorized('utility.prompt.optimize')).toBe(true);
  });

  it('returns true for qc.asset.metadata', () => {
    expect(isAgentAuthorized('qc.asset.metadata')).toBe(true);
  });

  // DR 0115: these two skills are now on the AGENT_ALLOWLIST.
  it('returns true for qc.script.review (DR 0115)', () => {
    expect(isAgentAuthorized('qc.script.review')).toBe(true);
  });

  it('returns true for qc.brand.alignment (DR 0115)', () => {
    expect(isAgentAuthorized('qc.brand.alignment')).toBe(true);
  });

  it('returns true for qc.creative.quality (DR 0123)', () => {
    expect(isAgentAuthorized('qc.creative.quality')).toBe(true);
  });

  it('returns true for communication.whatsapp.classify (DR 0125)', () => {
    expect(isAgentAuthorized('communication.whatsapp.classify')).toBe(true);
  });

  it('returns false for all non-allowlisted skills', () => {
    const allowlisted = new Set([
      'utility.prompt.optimize',
      'qc.asset.metadata',
      'qc.script.review',
      'qc.brand.alignment',
      'qc.creative.quality',
      'qc.facebook_policy.check',
      'communication.whatsapp.classify',
      'facebook.page.publish',
      'script.social_caption.generate',  // DR 0127
      'strategy.campaign.develop',        // DR 0127
    ]);
    const others = ALL_SKILL_IDS.filter((id) => !allowlisted.has(id));
    for (const skillId of others) {
      expect(isAgentAuthorized(skillId)).toBe(false);
    }
  });
});

describe('isHumanAuthorized — CLIENT denied all skills (DR 0075)', () => {
  it.each(ALL_SKILL_IDS)('CLIENT is denied skill: %s', (skillId) => {
    expect(isHumanAuthorized(skillId, 'CLIENT')).toBe(false);
  });
});

describe('isHumanAuthorized — OWNER has all skills', () => {
  it.each(ALL_SKILL_IDS)('OWNER can invoke: %s', (skillId) => {
    expect(isHumanAuthorized(skillId, 'OWNER')).toBe(true);
  });
});

describe('isHumanAuthorized — ADMIN_OPERATIONS has all skills', () => {
  it.each(ALL_SKILL_IDS)('ADMIN_OPERATIONS can invoke: %s', (skillId) => {
    expect(isHumanAuthorized(skillId, 'ADMIN_OPERATIONS')).toBe(true);
  });
});

describe('isHumanAuthorized — restricted to OWNER + ADMIN_OPERATIONS only', () => {
  const restrictedSkills: SkillId[] = [
    'strategy.campaign.develop',
    'strategy.brand.positioning',
    'strategy.audience.segmentation',
    'utility.batch.coordinate',
  ];

  it.each(restrictedSkills)('%s: OWNER authorized', (skillId) => {
    expect(isHumanAuthorized(skillId, 'OWNER')).toBe(true);
  });

  it.each(restrictedSkills)('%s: ADMIN_OPERATIONS authorized', (skillId) => {
    expect(isHumanAuthorized(skillId, 'ADMIN_OPERATIONS')).toBe(true);
  });

  it.each(restrictedSkills)('%s: CREATIVE_PRODUCTION denied', (skillId) => {
    expect(isHumanAuthorized(skillId, 'CREATIVE_PRODUCTION')).toBe(false);
  });

  it.each(restrictedSkills)('%s: QC denied', (skillId) => {
    expect(isHumanAuthorized(skillId, 'QC')).toBe(false);
  });
});

describe('isHumanAuthorized — CREATIVE_PRODUCTION access', () => {
  const creativeProdSkills: SkillId[] = [
    'brief.analyze',
    'brief.extract_requirements',
    'script.ad.generate',
    'script.social_caption.generate',
    'script.voiceover.generate',
    'script.scene_description.generate',
    'hook.video.generate',
    'hook.thumbnail_copy.generate',
    'utility.prompt.optimize',
    'utility.output.format',
  ];

  it.each(creativeProdSkills)('CREATIVE_PRODUCTION can invoke: %s', (skillId) => {
    expect(isHumanAuthorized(skillId, 'CREATIVE_PRODUCTION')).toBe(true);
  });

  it('CREATIVE_PRODUCTION denied QC skills', () => {
    expect(isHumanAuthorized('qc.script.review', 'CREATIVE_PRODUCTION')).toBe(false);
    expect(isHumanAuthorized('qc.brand.alignment', 'CREATIVE_PRODUCTION')).toBe(false);
    expect(isHumanAuthorized('qc.asset.metadata', 'CREATIVE_PRODUCTION')).toBe(false);
    expect(isHumanAuthorized('qc.creative.quality', 'CREATIVE_PRODUCTION')).toBe(false);
    expect(isHumanAuthorized('communication.whatsapp.classify', 'CREATIVE_PRODUCTION')).toBe(false);
  });
});

describe('isHumanAuthorized — QC access', () => {
  const qcSkills: SkillId[] = [
    'qc.script.review',
    'qc.brand.alignment',
    'qc.asset.metadata',
    'qc.creative.quality',
  ];

  it.each(qcSkills)('QC can invoke: %s', (skillId) => {
    expect(isHumanAuthorized(skillId, 'QC')).toBe(true);
  });

  it('QC denied brief skills', () => {
    expect(isHumanAuthorized('brief.analyze', 'QC')).toBe(false);
    expect(isHumanAuthorized('brief.extract_requirements', 'QC')).toBe(false);
  });
});

describe('isHumanAuthorized — unknown role', () => {
  it('returns false for unknown role', () => {
    expect(isHumanAuthorized('brief.analyze', 'UNKNOWN_ROLE')).toBe(false);
  });
});

describe('isHumanAuthorized — AGENT role denied for human path', () => {
  it.each(ALL_SKILL_IDS)('AGENT role is denied on human path: %s', (skillId) => {
    expect(isHumanAuthorized(skillId, 'AGENT')).toBe(false);
  });
});
