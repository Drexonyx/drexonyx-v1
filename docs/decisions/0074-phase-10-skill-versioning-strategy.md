# Decision Record 0074 — Phase 10: Skill Versioning Strategy

- **Decision Round:** Phase 10
- **Phase:** 10 — Skills
- **Status:** APPROVED — Owner approved 2026-09-05. No schema, migration, or
  implementation is authorized by approval of this record alone.
- **Decision owner:** Owner / DREXONYX
- **Date:** 2026-09-05
- **Repository state at drafting:** `claude/drexonyx-v1-baseline-inspection-fb76lg` @ `c216622`
- **Resolves:** Phase 10 Planning open question on skill versioning
- **Relationship to prior records:** Does not modify Decision Records
  0001–0069. All remain authoritative and unchanged. Depends on DR 0071
  (output persistence — `skill_version` column), DR 0072 (skill interface —
  `version` field).

---

## Governance Note

Every substantive statement is labeled **FACT**, **APPROVED**, **PROPOSED**,
**DEFERRED**, or **REQUIRES OWNER DECISION**, consistent with the evidentiary
standard applied throughout DR 0001–0069.

---

## 1. Context

**FACT (DR 0071 §2.1, APPROVED):** The `production.skill_outputs` table
includes a `skill_version TEXT NOT NULL` column that records which version of
a skill produced a given output row.

**FACT (DR 0072 §2.2, APPROVED):** The `Skill` interface includes
`readonly version: string` (semver string, e.g., `'1.0.0'`).

**FACT (Phase 10 Planning):** Skill prompts and output schemas may change over
time as skills are refined. A versioning strategy is needed so that historical
output records remain interpretable after a skill is updated.

---

## 2. Decision

### 2.1 Version Format

**APPROVED:** Skill versions follow semantic versioning (`MAJOR.MINOR.PATCH`,
e.g., `1.0.0`). All Phase 10 V1 skills launch at version `1.0.0`.

### 2.2 Version Increment Rules

**APPROVED:**

- **PATCH** increment: prompt wording changes that do not alter output
  structure or semantics. Historical outputs remain interpretable without
  reprocessing.
- **MINOR** increment: new optional fields added to the output schema
  (backward-compatible addition). Consumers of older outputs can ignore the
  new fields.
- **MAJOR** increment: output schema breaking changes — removed fields,
  renamed fields, or changed types. Consumers of older outputs may require
  migration logic.

### 2.3 Version Stored in Outputs

**APPROVED:** The `skill_version` stored in `production.skill_outputs` is the
version of the skill at the time of execution. This value is set by the skill
module itself (from its `readonly version` field on the `Skill` interface) and
is not overridable by the caller or the route handler.

Rationale: recording the exact version that produced each output ensures that
a version increment does not retroactively alter the interpretation of
historical rows.

### 2.4 No Runtime Version Selection in V1

**APPROVED:** In V1, callers MUST NOT specify which version of a skill to
invoke. The SKILL_REGISTRY always resolves to the single currently deployed
version of each skill.

**DEFERRED:** Historical version replay is an explicit V1 non-requirement.

### 2.5 No Parallel Version Deployment in V1

**APPROVED:** In V1, only one version of each skill is deployed at any time.
Skill upgrades replace the current version; the new version takes effect on
the next invocation.

**DEFERRED:** Side-by-side deployment of multiple versions of the same skill
is an explicit V1 non-requirement.

### 2.6 Version in Audit Trail

**APPROVED:** Every `production.skill_outputs` row records `skill_version`.
This ensures that output provenance is traceable to a specific skill revision,
independent of subsequent upgrades.

---

## 3. Explicitly Prohibited Assumptions

- Do not assume callers may select a skill version at invocation time —
  version selection is not supported in V1 (§2.4).
- Do not assume parallel version deployment is supported in V1 — it is
  not (§2.5).
- Do not assume `skill_version` in a historical output row reflects the
  current deployed version — it reflects the version at time of execution
  (§2.3).
- Do not assume this record authorizes schema changes, migrations, code
  changes, commits, or pushes.
- Do not assume Decision Records 0001–0069 have been altered, reinterpreted,
  or superseded.

---

## 4. Owner Approval

Owner approved 2026-09-05.

1. **SemVer** (`MAJOR.MINOR.PATCH`) with the increment rules in §2.2 approved
   as the V1 skill versioning approach.
2. **Historical version replay** (§2.4) approved as an explicit V1
   non-requirement (deferred).
3. **Parallel version deployment** (§2.5) approved as an explicit V1
   non-requirement (deferred).

**No implementation is authorized by approval of this record alone.**
