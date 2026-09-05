# Decision Record 0072 — Phase 10: Agent Architecture for Skills

- **Decision Round:** Phase 10
- **Phase:** 10 — Skills
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration, or
  implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `c216622`
- **Resolves:** Phase 10 Planning architectural question — which skill
  architecture to adopt (Options A–E evaluated)
- **Relationship to prior records:** Does not modify Decision Records
  0001–0069. All remain authoritative and unchanged. Depends on DR 0057
  (provider adapter architecture precedent), DR 0071 (output persistence),
  DR 0073 (AI model invocation boundary), DR 0075 (invocation authority).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0069.

---

## 1. Context

**FACT (verified code, `lib/agent/providers/interface.ts`):** The existing
Phase 09 provider architecture defines:

```typescript
export interface AiProvider {
  readonly name: string;
  dispatch(params: DispatchParams): Promise<DispatchResult>;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  parseWebhookPayload(rawPayload: unknown): ParsedWebhookPayload | null;
}
```

And a registry:

```typescript
const PROVIDER_MAP: Record<string, AiProvider> = {
  higgsfield: higgsFieldProvider,
};
```

**FACT (Phase 10 Planning):** Five architecture options were evaluated:
A (route-handlers-only), B (server actions), C (separate microservice),
D (AI SDK streaming), E (TypeScript modules + SKILL_REGISTRY). Option E was
identified as the recommended architecture, mirroring the existing PROVIDER_MAP
pattern established in Phase 09.

**FACT (Phase 10 Planning):** Phase 10 defines 17 skills in 6 families:
BRIEF (2), SCRIPT (4), HOOK (2), STRATEGY (3), QC (3), UTILITY (3). Each
skill has a typed input and output.

---

## 2. Decision

### 2.1 Architecture: TypeScript Modules + SKILL_REGISTRY (Option E)

**APPROVED:** Phase 10 Skills are implemented as TypeScript modules in
`lib/skills/`, following the same registry pattern established by Phase 09
providers in `lib/agent/providers/`. This is Option E.

### 2.2 Skill Interface

**APPROVED:**

```typescript
export interface Skill<TInput, TOutput> {
  readonly id: SkillId;           // e.g., 'brief.analyze'
  readonly version: string;       // semver per DR 0074, e.g., '1.0.0'
  readonly family: SkillFamily;   // e.g., 'BRIEF'
  execute(
    input: TInput,
    context: SkillContext,
  ): Promise<SkillResult<TOutput>>;
}

export interface SkillContext {
  organizationId: string;
  actorId: string;          // user_id (USER) or production_job_id (AGENT)
  actorType: 'USER' | 'AGENT';
  actorRole: string;        // role at invocation time
}

export type SkillResult<T> =
  | { ok: true; output: T }
  | { ok: false; error: string; isTransient: boolean };
```

### 2.3 SKILL_REGISTRY

**APPROVED:**

```typescript
export const SKILL_REGISTRY: Record<SkillId, Skill<unknown, unknown>> = {
  'brief.analyze': briefAnalyzeSkill,
  'brief.extract_requirements': briefExtractRequirementsSkill,
  'script.ad.generate': scriptAdGenerateSkill,
  'script.social_caption.generate': scriptSocialCaptionGenerateSkill,
  'script.voiceover.generate': scriptVoiceoverGenerateSkill,
  'script.scene_description.generate': scriptSceneDescriptionGenerateSkill,
  'hook.video.generate': hookVideoGenerateSkill,
  'hook.thumbnail_copy.generate': hookThumbnailCopyGenerateSkill,
  'strategy.campaign.develop': strategyCampaignDevelopSkill,
  'strategy.brand.positioning': strategyBrandPositioningSkill,
  'strategy.audience.segmentation': strategyAudienceSegmentationSkill,
  'qc.script.review': qcScriptReviewSkill,
  'qc.brand.alignment': qcBrandAlignmentSkill,
  'qc.asset.metadata': qcAssetMetadataSkill,
  'utility.prompt.optimize': utilityPromptOptimizeSkill,
  'utility.output.format': utilityOutputFormatSkill,
  'utility.batch.coordinate': utilityBatchCoordinateSkill,
};
```

### 2.4 Directory Structure

**APPROVED:**

```
lib/skills/
  index.ts                          -- exports SKILL_REGISTRY, types
  interface.ts                      -- Skill<TInput,TOutput>, SkillContext, SkillResult
  registry.ts                       -- SKILL_REGISTRY map
  ai/
    adapter.ts                      -- internal AI invocation adapter (DR 0073)
  brief/
    analyze.ts
    extract-requirements.ts
  script/
    ad-generate.ts
    social-caption.ts
    voiceover.ts
    scene-description.ts
  hook/
    video-hook.ts
    thumbnail-copy.ts
  strategy/
    campaign-develop.ts
    brand-positioning.ts
    audience-segmentation.ts
  qc/
    script-review.ts
    brand-alignment.ts
    asset-metadata.ts
  utility/
    prompt-optimize.ts
    output-format.ts
    batch-coordinator.ts
```

### 2.5 Route Handler as Uniform V1 Invocation Boundary

**APPROVED:** Skills are invoked through a Next.js route handler at
`app/api/skills/[skillId]/route.ts`. The route handler is the uniform V1
invocation boundary because it provides a single, centralized location for:

- **Authentication:** resolving the caller's session via Auth.js.
- **Authorization:** enforcing the per-skill RBAC matrix from DR 0075.
- **Tenant scoping:** resolving the caller's `organization_id` before any
  skill logic executes.
- **Input validation:** validating and parsing the request body before
  passing it to the skill.
- **Audit and persistence:** creating and updating the `production.skill_outputs`
  row that records the invocation lifecycle.
- **Execution control:** the single path through which all skill executions
  flow, making monitoring and future rate-limiting straightforward to add.

The route handler calls `skill.execute(input, context)` only after all of the
above have succeeded. This layered structure is a deliberate V1 architectural
choice for consistency and control, not a reflection of any limitation of other
Next.js primitives.

**APPROVED:** The route handler steps, in order:

1. Authenticate the caller via Auth.js session (human) or Service Token
   validation per DR 0065 (agent, if presenting a Service Token).
2. Resolve the caller's `organizationId` and role from `identity.org_memberships`
   (human) or from the validated Service Token scope (agent).
3. Validate invocation authority per DR 0075 (caller role is permitted for
   this skill); return 403 if not authorized.
4. Look up the skill in SKILL_REGISTRY; return 404 if not found.
5. Validate and parse the request body as the skill's typed input.
6. Create a `production.skill_outputs` row with `status = 'PENDING'`.
7. Call `skill.execute(input, context)`.
8. Update the `skill_outputs` row to `SUCCEEDED` or `FAILED`.
9. Return the result to the caller.

### 2.6 AI Invocation Encapsulated Within Skill Modules

**APPROVED:** AI model invocation is encapsulated within skill modules via the
internal adapter in `lib/skills/ai/adapter.ts` (governed by DR 0073). Route
handlers call `skill.execute()` only and have no knowledge of which AI model
a skill uses.

### 2.7 Prohibited Patterns

**APPROVED:** The following patterns are prohibited in Phase 10 V1:

- Skills MUST NOT call other skills directly (no skill-to-skill chaining in V1).
- Skills MUST NOT invoke the Phase 09 `runGenerationDriver` or `retryDispatch`
  (different lifecycle governed by DR 0058).
- Skills MUST NOT write to `commercial.quotes`, any `financial.*` table, or
  to `commercial.campaigns` / `commercial.briefs` content fields (DR 0070 §2.3).
- Skills MUST NOT expose AI provider API keys in output or logs.
- Skills MUST NOT perform RBAC checks internally — authorization is fully
  delegated to the route handler (§2.5, step 3).

---

## 3. Explicitly Prohibited Assumptions

- Do not assume skills may call each other directly — skill-to-skill chaining
  is prohibited in V1 (§2.7).
- Do not assume any invocation path other than the route handler is used in
  V1 — the route handler is the approved uniform boundary (§2.5).
- Do not assume this record authorizes schema changes, migrations, code
  changes, commits, or pushes.
- Do not assume Decision Records 0001–0069 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

1. **Option E** (TypeScript modules + SKILL_REGISTRY) approved as the Phase 10
   architecture.
2. **Skill interface** (§2.2) approved as defined.
3. **Route handler** as the uniform V1 invocation boundary (§2.5) approved.
4. **Skill-to-skill chaining prohibited** in V1 (§2.7) approved.

**No implementation is authorized by approval of this record alone.**
