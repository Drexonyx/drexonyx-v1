// DR 0124: Deterministic Facebook policy compliance check — zero AI calls.
// Validates content against Facebook's published placement limits and policy rules.

import type { Skill, SkillContext, SkillResult } from '../interface';

export interface QcFacebookPolicyCheckInput {
  /** The post body / caption text to validate. */
  text: string;
  /** Optional: ad headline (separate character limit). */
  headline?: string;
  /** Placement hint — affects character limit applied. Default: 'feed'. */
  placement?: 'feed' | 'story' | 'reel' | 'marketplace' | 'search';
}

export interface QcFacebookPolicyCheckOutput {
  verdict: 'PASS' | 'FAIL';
  findings: string[];
}

// Facebook published character limits per placement (conservative — shorter of ad/organic).
const CHAR_LIMITS: Record<string, number> = {
  feed:        2200,
  story:       125,
  reel:        2200,
  marketplace: 5000,
  search:      255,
};

const HEADLINE_CHAR_LIMIT = 255;
const MAX_HASHTAGS = 30;

// Terms that violate Facebook ad policy (illustrative subset of known violations).
// Source: Meta Advertising Standards — prohibited content list.
const PROHIBITED_TERMS: ReadonlyArray<string> = [
  // Discriminatory language / protected characteristics
  'whites only', 'blacks only', 'no muslims', 'no jews', 'no christians',
  // Illegal goods
  'buy guns', 'illegal weapons', 'fake id', 'counterfeit',
  // Deceptive claims
  'guaranteed results', '100% guaranteed', 'no side effects guaranteed',
  // Adult / shock content signals (text-level)
  'explicit content', 'adult only content',
];

// Disclosure-required content categories detected by keyword signal.
// A match DOES NOT cause a FAIL — it adds a disclosure-required finding.
const DISCLOSURE_SIGNALS: ReadonlyArray<{ pattern: RegExp; message: string }> = [
  { pattern: /\b(loan|mortgage|credit|invest(ment|ing)?|financial advice|forex|crypto|bitcoin)\b/i, message: 'Financial product content may require disclaimers and Special Ad Category registration.' },
  { pattern: /\b(supplement|diet pill|weight loss|cure|treats|heals|clinically proven)\b/i, message: 'Health claim content requires compliance review and may be restricted.' },
  { pattern: /\b(vote|election|candidate|political party|ballot)\b/i, message: 'Political content requires disclaimer and may require identity verification with Meta.' },
];

function countHashtags(text: string): number {
  const matches = text.match(/#\w+/g);
  return matches ? matches.length : 0;
}

function checkProhibitedTerms(text: string): string[] {
  const lower = text.toLowerCase();
  return PROHIBITED_TERMS
    .filter((term) => lower.includes(term))
    .map((term) => `Prohibited term detected: "${term}"`);
}

function checkDisclosureSignals(text: string): string[] {
  return DISCLOSURE_SIGNALS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ message }) => `Disclosure required: ${message}`);
}

export const qcFacebookPolicyCheckSkill: Skill<QcFacebookPolicyCheckInput, QcFacebookPolicyCheckOutput> = {
  id: 'qc.facebook_policy.check',
  version: '1.0.0',
  family: 'QC',

  async execute(input: QcFacebookPolicyCheckInput, _context: SkillContext): Promise<SkillResult<QcFacebookPolicyCheckOutput>> {
    const findings: string[] = [];
    const placement = input.placement ?? 'feed';
    const charLimit = CHAR_LIMITS[placement] ?? CHAR_LIMITS.feed;

    // 1. Text length
    if (input.text.length > charLimit) {
      findings.push(`Text exceeds ${placement} placement limit: ${input.text.length} / ${charLimit} characters.`);
    }

    // 2. Headline length
    if (input.headline && input.headline.length > HEADLINE_CHAR_LIMIT) {
      findings.push(`Headline exceeds limit: ${input.headline.length} / ${HEADLINE_CHAR_LIMIT} characters.`);
    }

    // 3. Hashtag limit
    const hashtagCount = countHashtags(input.text);
    if (hashtagCount > MAX_HASHTAGS) {
      findings.push(`Too many hashtags: ${hashtagCount} (limit: ${MAX_HASHTAGS}).`);
    }

    // 4. Prohibited terms
    findings.push(...checkProhibitedTerms(input.text));
    if (input.headline) findings.push(...checkProhibitedTerms(input.headline));

    // 5. Disclosure signals (informational — do not cause FAIL alone)
    findings.push(...checkDisclosureSignals(input.text));

    // FAIL if any hard-failure finding exists (prohibited terms or limit violations).
    // Disclosure-only findings = PASS with advisory.
    const hardFailings = findings.filter(
      (f) => !f.startsWith('Disclosure required:'),
    );

    return {
      ok: true,
      output: {
        verdict: hardFailings.length === 0 ? 'PASS' : 'FAIL',
        findings,
      },
    };
  },
};
