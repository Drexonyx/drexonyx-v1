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
  'utility.prompt.optimize',
  'utility.output.format',
  'utility.batch.coordinate',
];

describe('AGENT_ALLOWLIST', () => {
  it('contains exactly utility.prompt.optimize and qc.asset.metadata (DR 0075)', () => {
    expect(AGENT_ALLOWLIST.size).toBe(2);
    expect(AGENT_ALLOWLIST.has('utility.prompt.optimize')).toBe(true);
    expect(AGENT_ALLOWLIST.has('qc.asset.metadata')).toBe(true);
  });
});

describe('isAgentAuthorized', () => {
  it('returns true for utility.prompt.optimize', () => {
    expect(isAgentAuthorized('utility.prompt.optimize')).toBe(true);
  });

  it('returns true for qc.asset.metadata', () => {
    expect(isAgentAuthorized('qc.asset.metadata')).toBe(true);
  });

  it('returns false for all other skills', () => {
    const others = ALL_SKILL_IDS.filter(
      (id) => id !== 'utility.prompt.optimize' && id !== 'qc.asset.metadata',
    );
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
  const unprivileged = ['CREATIVE_PRODUCTION', 'QC', 'CLIENT', 'AGENT'];

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
  });
});

describe('isHumanAuthorized — QC access', () => {
  const qcSkills: SkillId[] = [
    'qc.script.review',
    'qc.brand.alignment',
    'qc.asset.metadata',
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
