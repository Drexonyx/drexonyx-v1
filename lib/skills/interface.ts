// DR 0072 §2.2: Skill interface, SkillContext, SkillResult.
// DR 0074 §2.1: version follows semver; all V1 skills start at 1.0.0.

export type SkillFamily = 'BRIEF' | 'SCRIPT' | 'HOOK' | 'STRATEGY' | 'QC' | 'UTILITY';

export type SkillId =
  | 'brief.analyze'
  | 'brief.extract_requirements'
  | 'script.ad.generate'
  | 'script.social_caption.generate'
  | 'script.voiceover.generate'
  | 'script.scene_description.generate'
  | 'hook.video.generate'
  | 'hook.thumbnail_copy.generate'
  | 'strategy.campaign.develop'
  | 'strategy.brand.positioning'
  | 'strategy.audience.segmentation'
  | 'qc.script.review'
  | 'qc.brand.alignment'
  | 'qc.asset.metadata'
  | 'qc.creative.quality'
  | 'utility.prompt.optimize'
  | 'utility.output.format'
  | 'utility.batch.coordinate';

// DR 0072 §2.2: Provided by the route handler; consumed by skill.execute().
// actorRole is for audit/provenance only — skills MUST NOT use it for authorization (DR 0075 §2.6).
export interface SkillContext {
  organizationId: string;
  actorId: string;        // identity.users.id (USER) or production.production_jobs.id (AGENT)
  actorType: 'USER' | 'AGENT';
  actorRole: string;      // role at invocation time, for audit trail only
}

export type SkillResult<T> =
  | { ok: true; output: T }
  | { ok: false; error: string; isTransient: boolean };

// DR 0072 §2.2: All Phase 10 skills implement this interface.
// Skills MUST NOT perform RBAC checks internally (DR 0072 §2.7).
// Skills MUST NOT call other skills (DR 0072 §2.7).
// Skills MUST make at most one AI adapter call per execute() (DR 0073 §2.6).
export interface Skill<TInput, TOutput> {
  readonly id: SkillId;
  readonly version: string;
  readonly family: SkillFamily;
  execute(input: TInput, context: SkillContext): Promise<SkillResult<TOutput>>;
}
