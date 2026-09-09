import type { Skill, SkillContext, SkillResult } from '../interface';
import { callAi } from '../ai/adapter';

export interface UtilityBatchCoordinateInput {
  objective: string;
  taskList: string[];
  constraints?: string;
}

export interface UtilityBatchCoordinateOutput {
  coordinationPlan: string;
  taskSequence: Array<{ step: number; task: string; rationale: string }>;
  estimatedEffort: string;
}

const SYSTEM_PROMPT = `You are a production coordinator planning task execution sequences.
Given an objective and a list of tasks, produce a coordination plan and return a JSON object with:
- coordinationPlan: a concise narrative describing the overall coordination approach
- taskSequence: array of objects with step (number), task (string), rationale (string) for each sequenced task
- estimatedEffort: overall effort estimate as a string (e.g. "2-3 hours", "1 day")

Respond with ONLY valid JSON. No markdown, no explanation.`;

function buildUserPrompt(input: UtilityBatchCoordinateInput): string {
  const parts = [
    `Objective:\n${input.objective}`,
    `Tasks:\n${input.taskList.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
  ];
  if (input.constraints) parts.push(`Constraints:\n${input.constraints}`);
  return parts.join('\n\n');
}

function parseOutput(text: string): UtilityBatchCoordinateOutput | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.coordinationPlan === 'string' &&
      Array.isArray(o.taskSequence) &&
      typeof o.estimatedEffort === 'string'
    ) {
      return {
        coordinationPlan: o.coordinationPlan,
        taskSequence: o.taskSequence as Array<{ step: number; task: string; rationale: string }>,
        estimatedEffort: o.estimatedEffort,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const utilityBatchCoordinateSkill: Skill<UtilityBatchCoordinateInput, UtilityBatchCoordinateOutput> = {
  id: 'utility.batch.coordinate',
  version: '1.0.0',
  family: 'UTILITY',

  async execute(input: UtilityBatchCoordinateInput, _context: SkillContext): Promise<SkillResult<UtilityBatchCoordinateOutput>> {
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
