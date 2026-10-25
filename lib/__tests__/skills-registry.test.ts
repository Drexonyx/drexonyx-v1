import { describe, it, expect } from 'vitest';
import { SKILL_REGISTRY } from '../skills/registry';
import type { SkillId } from '../skills/interface';

const EXPECTED_SKILLS: SkillId[] = [
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
  'qc.facebook_policy.check',
  'communication.whatsapp.classify',
  'facebook.page.publish',
  'utility.prompt.optimize',
  'utility.output.format',
  'utility.batch.coordinate',
  'sales.lead.discover',
  'sales.lead.verify',
  'sales.lead.score',
  'sales.lead.qualify',
  'sales.outreach.draft',
];

const EXPECTED_FAMILIES: Record<SkillId, string> = {
  'brief.analyze': 'BRIEF',
  'brief.extract_requirements': 'BRIEF',
  'script.ad.generate': 'SCRIPT',
  'script.social_caption.generate': 'SCRIPT',
  'script.voiceover.generate': 'SCRIPT',
  'script.scene_description.generate': 'SCRIPT',
  'hook.video.generate': 'HOOK',
  'hook.thumbnail_copy.generate': 'HOOK',
  'strategy.campaign.develop': 'STRATEGY',
  'strategy.brand.positioning': 'STRATEGY',
  'strategy.audience.segmentation': 'STRATEGY',
  'qc.script.review': 'QC',
  'qc.brand.alignment': 'QC',
  'qc.asset.metadata': 'QC',
  'qc.creative.quality': 'QC',
  'qc.facebook_policy.check': 'QC',
  'communication.whatsapp.classify': 'COMMUNICATION',
  'facebook.page.publish': 'SOCIAL',
  'utility.prompt.optimize': 'UTILITY',
  'utility.output.format': 'UTILITY',
  'utility.batch.coordinate': 'UTILITY',
  'sales.lead.discover': 'SALES',
  'sales.lead.verify': 'SALES',
  'sales.lead.score': 'SALES',
  'sales.lead.qualify': 'SALES',
  'sales.outreach.draft': 'SALES',
};

describe('SKILL_REGISTRY', () => {
  it('contains exactly 26 skills', () => {
    expect(Object.keys(SKILL_REGISTRY)).toHaveLength(26);
  });

  it.each(EXPECTED_SKILLS)('registers skill: %s', (skillId) => {
    expect(SKILL_REGISTRY[skillId]).toBeDefined();
  });

  it.each(EXPECTED_SKILLS)('%s has id matching its registry key', (skillId) => {
    expect(SKILL_REGISTRY[skillId].id).toBe(skillId);
  });

  it.each(EXPECTED_SKILLS)('%s has a valid semver version', (skillId) => {
    expect(SKILL_REGISTRY[skillId].version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it.each(EXPECTED_SKILLS)('%s has correct family', (skillId) => {
    expect(SKILL_REGISTRY[skillId].family).toBe(EXPECTED_FAMILIES[skillId]);
  });

  it.each(EXPECTED_SKILLS)('%s has an execute function', (skillId) => {
    expect(typeof SKILL_REGISTRY[skillId].execute).toBe('function');
  });
});
