# Decision Record 0073 — Phase 10: AI Model Invocation Boundary

- **Decision Round:** Phase 10
- **Phase:** 10 — Skills
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration, or
  implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `c216622`
- **Resolves:** Phase 10 Planning open question on which AI models Phase 10
  Skills may invoke, through which interface, and which concerns remain
  outside the skill boundary
- **Relationship to prior records:** Does not modify Decision Records
  0001–0069. All remain authoritative and unchanged. Depends on DR 0057
  (provider-agnostic media-generation architecture), DR 0072 (skill
  architecture). Does NOT alter DR 0057's scope — DR 0057 governs async
  dispatch to external media-generation providers; this record governs
  synchronous text-completion AI calls made internally by skills.

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0069. No statement is promoted above FACT
unless directly grounded in an approved Decision Record, the verified schema,
or an explicit Owner instruction.

---

## 1. Context

**FACT (Phase 09, DR 0057):** The existing `AiProvider` interface governs
async dispatch to external media-generation providers (e.g., Higgsfield for
video and image generation). It models a dispatch-and-callback lifecycle and
is not designed for synchronous text-completion calls.

**FACT (Phase 10 Planning):** Phase 10 Skills require synchronous AI
text-completion calls (to an LLM) to produce scripts, hooks, strategies, and
QC judgments. This is a fundamentally different call pattern from Phase 09
async provider dispatch.

**FACT (CLAUDE.md):** "Do not invent requirements, API capabilities, pricing,
platform behavior, or project scope." The specific AI model(s) and providers
for Phase 10 Skills are not established by this record. Model selection,
routing, cost authorization, and credit governance require separate Owner
decisions and, where applicable, separate architecture decisions in later
phases (particularly Phase 12).

---

## 2. Decision

### 2.1 Separation of Concerns: Skills vs. Provider Adapters

**APPROVED:** Phase 10 AI text-completion calls (skills) and Phase 09
media-generation dispatch (provider adapters) are governed by separate
boundaries and MUST NOT share the same invocation interface. The Phase 09
`AiProvider` interface is not used for Phase 10 skill text-completion.

### 2.2 Internal AI Invocation Adapter

**APPROVED:** Phase 10 Skills invoke AI text-completion through a thin
internal adapter in `lib/skills/ai/adapter.ts`. This adapter is the sole
location in `lib/skills/` where any AI provider SDK or API key is accessed.

The adapter's responsibilities in V1:
1. Accept a structured request (prompt, system prompt, optional parameters).
2. Route the request to the configured AI model.
3. Return a structured text result or a typed error.
4. Encapsulate all provider-specific SDK details from the skill modules.

Skills call the adapter interface; they do not directly import, instantiate,
or configure AI SDK clients.

### 2.3 What the Adapter Does NOT Own

**APPROVED:** The internal adapter does NOT own and MUST NOT implement:

- **Model selection as a permanent decision.** Which AI model is used is an
  Owner decision (see §2.4 below) and is expected to be revisited in Phase 12.
  The adapter reads configuration; it does not hard-code a model choice.
- **Independent cost authorization or credit governance.** These concerns are
  outside the skill adapter's boundary. The V1 adapter MUST remain compatible
  with the cost and credit governance architecture that will be established in
  Phase 12. No cost enforcement logic is added to the adapter independently of
  that governed architecture.
- **Provider-specific routing logic.** If multiple AI providers are used in a
  later phase, routing decisions are governed by a future decision record.
  The V1 adapter serves a single configured model.
- **Fallback provider selection.** No fallback model is implemented in V1.
  Fallback strategy is DEFERRED.

### 2.4 Model Configuration

**APPROVED:**

- **Configuration mechanism:** The AI model identifier is provided via the
  server-side environment variable `SKILLS_AI_MODEL`. The adapter reads this
  variable at runtime; no model identifier is hard-coded in the adapter. The
  Owner may change the model by updating `SKILLS_AI_MODEL` without a code
  change to the adapter.

- **V1 model identifier — Owner approved 2026-09-05:** `claude-sonnet-4-6`.
  The V1 default configuration is `SKILLS_AI_MODEL=claude-sonnet-4-6`.

This approval selects the V1 default model only. It does NOT authorize:
- Multi-model routing or provider selection logic in the adapter.
- A fallback model (fallback strategy is DEFERRED per §2.3).
- Independent cost authorization or credit governance in the adapter (these
  concerns are owned by the Phase 12 governed architecture; the adapter must
  remain compatible with it).

The Owner may change the deployed model by updating `SKILLS_AI_MODEL` in the
server environment without a code change. Any architectural change to how
models are selected — routing, multi-provider, fallback — requires a separate
decision record and Owner approval, to be addressed in Phase 12.

### 2.5 Server-Side Secret Handling

**APPROVED:** Any API key required by the AI adapter is stored exclusively as
a server-side environment variable. It is NEVER:
- Returned to any client.
- Logged, included in error responses, or written to any database column.
- Included in `production.skill_outputs` payload or error fields.
- Accessible from client-side code.

### 2.6 Single-Call Constraint (V1 Control)

**APPROVED:** Each `skill.execute()` invocation MUST make at most one call to
the AI adapter in V1. Multi-step AI chains within a single skill execution are
prohibited. This constraint limits cost exposure and keeps the V1 skill
execution model predictable.

**DEFERRED:** Multi-step AI execution patterns are deferred to a future phase
and require separate Owner authorization.

### 2.7 Prohibited Uses

**APPROVED:** The following are prohibited in Phase 10 V1:

- Skills MUST NOT use the Phase 09 `AiProvider` interface for text-completion
  calls (§2.1).
- Skills MUST NOT pass financial data (quote amounts, costs, pricing fields
  from `commercial.quotes` or `financial.*`) as prompt context to the AI
  adapter (financial boundary; DR 0002 §D).
- Skills MUST NOT return raw AI provider API responses directly to the caller —
  only processed, validated skill outputs are returned.
- The adapter MUST NOT be called from client-side code, API route handlers
  other than the skill invocation route, or any path that bypasses the skill
  interface.
- No AI provider integration is implemented by this record. Implementation
  is authorized only by a separate BUILD authorization, and only after the
  model identifier is specified per §2.4.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume Phase 09 `AiProvider` governs Phase 10 skill AI calls —
  it does not (§2.1).
- Do not assume the V1 model selection (§2.4) authorizes multi-model routing,
  fallback providers, or independent cost/credit governance in the adapter —
  none of these are authorized; they belong to Phase 12.
- Do not assume the adapter implements independent cost authorization or credit
  governance — it must not; it must remain compatible with Phase 12 (§2.3).
- Do not assume multi-step AI chains within a single skill are permitted in
  V1 — they are prohibited (§2.6).
- Do not assume financial data may be passed to AI prompts — it is prohibited
  (§2.7).
- Do not assume this record authorizes schema changes, migrations, code
  changes, commits, or pushes.
- Do not assume Decision Records 0001–0069 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

1. **Separation of concerns** (§2.1) approved: Phase 10 text-completion and
   Phase 09 media-generation dispatch use separate interfaces; `AiProvider`
   is not used for skill text-completion.
2. **Internal adapter** (§2.2) approved: `lib/skills/ai/adapter.ts` is the
   sole location for AI provider SDK and API key access within `lib/skills/`.
3. **Adapter scope constraints** (§2.3) approved: The adapter does NOT
   implement independent cost authorization or credit governance; it must
   remain compatible with the Phase 12 governed architecture.
4. **`SKILLS_AI_MODEL` configuration mechanism and V1 model identifier**
   (§2.4) approved: model identifier is provided via environment variable,
   not hard-coded; V1 default is `claude-sonnet-4-6`
   (`SKILLS_AI_MODEL=claude-sonnet-4-6`). No routing, fallback, or
   multi-model selection is authorized for V1; those belong to Phase 12.
5. **Server-side secret handling** (§2.5) approved.
6. **Single-call-per-execute constraint** (§2.6) approved for V1; multi-step
   patterns explicitly deferred.
7. **Prohibited uses** (§2.7) approved.

**No implementation is authorized by approval of this record alone.**
