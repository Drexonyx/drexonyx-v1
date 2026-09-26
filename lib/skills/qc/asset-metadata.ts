import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';
import { extractJson } from '../ai/extract-json';

export interface QcAssetMetadataInput {
  assetName: string;
  assetType: string;
  metadata?: Record<string, string>;
}

export interface QcAssetMetadataOutput {
  verdict: 'PASS' | 'FAIL';
  issues: string[];
  completeness: number;
  recommendations: string[];
}

const SYSTEM_PROMPT = `You are a digital asset QC specialist reviewing asset metadata completeness and correctness.
Assess the asset metadata and return a JSON object with:
- verdict: "PASS" or "FAIL"
- issues: array of specific metadata issues found (missing fields, incorrect values, naming violations)
- completeness: metadata completeness score from 0-100
- recommendations: array of specific actions to resolve the issues

A PASS verdict means the metadata is complete and correct for production use.
A FAIL verdict means the metadata requires correction before the asset can proceed.
Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: QcAssetMetadataInput): string {
  const parts = [
    `Asset name: ${input.assetName}`,
    `Asset type: ${input.assetType}`,
  ];
  if (input.metadata && Object.keys(input.metadata).length > 0) {
    const metaStr = Object.entries(input.metadata)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n');
    parts.push(`Metadata:\n${metaStr}`);
  } else {
    parts.push('Metadata: (none provided)');
  }
  return parts.join('\n');
}

function parseOutput(text: string): QcAssetMetadataOutput | null {
  try {
    const parsed = extractJson(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      (o.verdict === 'PASS' || o.verdict === 'FAIL') &&
      Array.isArray(o.issues) &&
      typeof o.completeness === 'number' &&
      Array.isArray(o.recommendations)
    ) {
      return {
        verdict: o.verdict,
        issues: o.issues as string[],
        completeness: o.completeness,
        recommendations: o.recommendations as string[],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const qcAssetMetadataSkill: Skill<QcAssetMetadataInput, QcAssetMetadataOutput> = {
  id: 'qc.asset.metadata',
  version: '1.0.0',
  family: 'QC',

  async execute(input: QcAssetMetadataInput, _context: SkillContext): Promise<SkillResult<QcAssetMetadataOutput>> {
    const result = await callAi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(input),
    });

    if (!result.ok) {
      return { ok: false, error: result.error, isTransient: result.isTransient };
    }

    const output = parseOutput(result.text);
    if (!output) {
      return { ok: false, error: 'AI returned unparseable output', isTransient: false };
    }

    return { ok: true, output };
  },
};
