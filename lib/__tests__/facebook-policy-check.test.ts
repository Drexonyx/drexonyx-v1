// DR 0124: qc.facebook_policy.check — deterministic skill unit tests.
import { describe, it, expect } from 'vitest';
import { qcFacebookPolicyCheckSkill } from '../skills/qc/facebook-policy-check';
import type { SkillContext } from '../skills/interface';

const CTX: SkillContext = {
  organizationId: 'org-001',
  actorId: 'user-001',
  actorType: 'USER',
  actorRole: 'OWNER',
};

describe('qc.facebook_policy.check', () => {
  it('has correct id, version, family', () => {
    expect(qcFacebookPolicyCheckSkill.id).toBe('qc.facebook_policy.check');
    expect(qcFacebookPolicyCheckSkill.version).toBe('1.0.0');
    expect(qcFacebookPolicyCheckSkill.family).toBe('QC');
  });

  // ─── PASS cases ────────────────────────────────────────────────────────────

  it('returns PASS for clean short feed post', async () => {
    const result = await qcFacebookPolicyCheckSkill.execute(
      { text: 'Check out our new product launch! Amazing quality at great prices.' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.verdict).toBe('PASS');
      expect(result.output.findings).toHaveLength(0);
    }
  });

  it('returns PASS with advisory finding for financial-signal content', async () => {
    const result = await qcFacebookPolicyCheckSkill.execute(
      { text: 'Invest in your future with our wealth management services.' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.verdict).toBe('PASS');
      const disclosures = result.output.findings.filter((f) => f.startsWith('Disclosure required:'));
      expect(disclosures.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns PASS for text at exact feed character limit (2200)', async () => {
    const text = 'A'.repeat(2200);
    const result = await qcFacebookPolicyCheckSkill.execute({ text }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.verdict).toBe('PASS');
  });

  it('returns PASS for story post within 125 chars', async () => {
    const result = await qcFacebookPolicyCheckSkill.execute(
      { text: 'New drop! 🔥', placement: 'story' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.verdict).toBe('PASS');
  });

  it('returns PASS for post with 30 hashtags (at limit)', async () => {
    const tags = Array.from({ length: 30 }, (_, i) => `#tag${i}`).join(' ');
    const result = await qcFacebookPolicyCheckSkill.execute({ text: tags }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.verdict).toBe('PASS');
  });

  // ─── FAIL cases ────────────────────────────────────────────────────────────

  it('returns FAIL when text exceeds feed character limit', async () => {
    const text = 'A'.repeat(2201);
    const result = await qcFacebookPolicyCheckSkill.execute({ text }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.verdict).toBe('FAIL');
      expect(result.output.findings.some((f) => f.includes('2201'))).toBe(true);
    }
  });

  it('returns FAIL when story text exceeds 125 chars', async () => {
    const text = 'A'.repeat(126);
    const result = await qcFacebookPolicyCheckSkill.execute({ text, placement: 'story' }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.verdict).toBe('FAIL');
      expect(result.output.findings.some((f) => f.includes('story'))).toBe(true);
    }
  });

  it('returns FAIL when headline exceeds 255 chars', async () => {
    const result = await qcFacebookPolicyCheckSkill.execute(
      { text: 'Short text.', headline: 'H'.repeat(256) },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.verdict).toBe('FAIL');
      expect(result.output.findings.some((f) => f.includes('Headline'))).toBe(true);
    }
  });

  it('returns FAIL when hashtag count exceeds 30', async () => {
    const tags = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(' ');
    const result = await qcFacebookPolicyCheckSkill.execute({ text: tags }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.verdict).toBe('FAIL');
      expect(result.output.findings.some((f) => f.includes('hashtag'))).toBe(true);
    }
  });

  it('returns FAIL and flags prohibited term in body text', async () => {
    const result = await qcFacebookPolicyCheckSkill.execute(
      { text: 'We offer 100% guaranteed results for everyone!' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.verdict).toBe('FAIL');
      expect(result.output.findings.some((f) => f.includes('guaranteed results'))).toBe(true);
    }
  });

  it('returns FAIL and flags prohibited term in headline', async () => {
    const result = await qcFacebookPolicyCheckSkill.execute(
      { text: 'Great quality products.', headline: 'Buy guns at our store!' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.verdict).toBe('FAIL');
      expect(result.output.findings.some((f) => f.includes('buy guns'))).toBe(true);
    }
  });

  // ─── Placement defaults ─────────────────────────────────────────────────

  it('uses feed limit (2200) when placement is omitted', async () => {
    const text = 'A'.repeat(2201);
    const result = await qcFacebookPolicyCheckSkill.execute({ text }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.verdict).toBe('FAIL');
  });

  it('accepts marketplace text up to 5000 chars', async () => {
    const text = 'A'.repeat(5000);
    const result = await qcFacebookPolicyCheckSkill.execute({ text, placement: 'marketplace' }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.verdict).toBe('PASS');
  });

  // ─── Return shape ───────────────────────────────────────────────────────

  it('always returns ok:true (no transient errors — deterministic)', async () => {
    const result = await qcFacebookPolicyCheckSkill.execute({ text: 'hello' }, CTX);
    expect(result.ok).toBe(true);
  });

  it('findings is always an array', async () => {
    const result = await qcFacebookPolicyCheckSkill.execute({ text: 'hello' }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(Array.isArray(result.output.findings)).toBe(true);
  });

  // ─── Disclosure signals advisory only ──────────────────────────────────

  it('health claim content gets advisory finding but still PASses if otherwise clean', async () => {
    const result = await qcFacebookPolicyCheckSkill.execute(
      { text: 'Our supplement supports healthy energy levels!' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.verdict).toBe('PASS');
      expect(result.output.findings.some((f) => f.includes('Health claim'))).toBe(true);
    }
  });

  it('political content gets advisory finding but still PASSes if otherwise clean', async () => {
    const result = await qcFacebookPolicyCheckSkill.execute(
      { text: 'Support our candidate in the upcoming election.' },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.verdict).toBe('PASS');
      expect(result.output.findings.some((f) => f.includes('Political'))).toBe(true);
    }
  });
});
