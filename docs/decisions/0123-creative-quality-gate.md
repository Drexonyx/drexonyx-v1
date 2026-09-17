# DR 0123 — Creative Quality Gate

**Status:** APPROVED  
**Date:** 2026-09-17  
**Supersedes:** None  
**Related:** DR 0090 (two-step QC model), DR 0114 (QC review specialist), DR 0115 (QC skill allowlist), DR 0075 (skill invocation authority)

---

## 1. Context

DREXONYX must never deliver an AI-generated creative asset unless the final deliverable matches the client's approved brief with complete fidelity. The existing QC pipeline (DR 0114) runs three advisory machine checks (asset metadata, script review, brand alignment) followed by a mandatory human QC_GATE. However, it does not include a dedicated brief fidelity assessment step, does not verify the asset is in `READY_FOR_QC` status before creating the gate, and does not require the human reviewer to document their findings when rejecting.

**Core rule:** ONE MATERIAL ERROR = NO DELIVERY. Any single material deviation from the approved brief constitutes a blocking defect that prevents delivery.

---

## 2. Decisions

### 2.1 — New skill: `qc.creative.quality`

A new machine-recommendation-only skill, `qc.creative.quality`, is authorized. It performs AI-based brief fidelity analysis across eight creative quality categories:

1. STORY/CONCEPT — narrative arc, message alignment, emotional tone
2. SHOT/SCENE — composition, scene sequence, visual storytelling fidelity
3. PRODUCT — accurate product representation, key attributes, branding
4. HUMAN/CHARACTER — people, characters, casting alignment
5. MOTION — movement, pacing, timing
6. VISUAL — color, lighting, style, aesthetic
7. EDITING/POST-PRODUCTION — cuts, transitions, effects, audio sync
8. CLIENT-SPECIFIC — any custom requirements from the brief

This is a **machine recommendation only** — it provides advisory findings to the human QC reviewer. It does not issue a binding verdict and does not replace the mandatory human QC_GATE (DR 0090 §2.2).

### 2.2 — AGENT_ALLOWLIST expansion (limited)

`qc.creative.quality` is added to the AGENT_ALLOWLIST per this DR. This is the minimal expansion required to run the brief fidelity assessment within the existing orchestration pipeline. No other skills are added.

### 2.3 — Asset readiness enforcement in `processQcGate`

When a QC_GATE step carries an `assetId` in its input, the runner MUST verify that the asset's status is `READY_FOR_QC` before creating the gate. If the asset is in any other status, the task fails with a descriptive error. This prevents a QC gate from being opened on an asset that has not yet been flagged as ready.

### 2.4 — Documented findings required on QC gate rejections

When a QC gate (approver_role = 'QC') is rejected, a non-empty `decisionReason` is mandatory. The human reviewer must document their findings before a rejection is accepted. This creates an audit trail linking each rejection to its stated reason.

Approvals do not require a `decisionReason` (though one may be provided).

### 2.5 — QC Review Specialist updated (six-step plan)

The QC Review Specialist (DR 0114) is updated to:
- Accept `briefId` and `briefText` parameters (the approved brief's identifiers and content)
- Insert `qc.creative.quality` as step 3 (after existing brand alignment check)
- Renumber: QC_GATE → step 4, NOTIFICATION → step 5

The six-step plan becomes:
```
Step 0: SKILL — qc.asset.metadata
Step 1: SKILL — qc.script.review
Step 2: SKILL — qc.brand.alignment
Step 3: SKILL — qc.creative.quality   (brief fidelity — NEW, DR 0123)
Step 4: QC_GATE                        (mandatory human verdict)
Step 5: NOTIFICATION
```

### 2.6 — No schema migrations, no new step types, no new IntentTypes

All enforcement is implemented in the orchestration layer using existing step types, existing gate infrastructure, and existing schema columns (`task_approvals.decision_reason`, `assets.status`). No new database migrations are required or authorized by this DR.

---

## 3. Constraints

- `qc.creative.quality` is a machine recommendation only — it may NOT issue binding verdicts
- No financial table access from the creative quality skill
- No autonomous approval of QC gates — human resolver required (DR 0090 §2.2)
- No self-approval — resolver must not be the task initiator
- `qc.creative.quality` is NOT added to `HUMAN_SKILL_AUTHORITY` for CLIENT role — client access remains denied
- This DR does NOT authorize any other AGENT_ALLOWLIST expansion
