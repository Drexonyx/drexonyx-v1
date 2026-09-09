# DR 0076 — DispatchParams.fileKey Semantics: Input vs Output

**Status:** APPROVED  
**Date:** 2026-09-06  
**Phase:** 11 — Higgsfield AI Provider Integration

## 1. Context

DR 0057 §2.4 defines `DispatchParams.fileKey` as a mandatory field with no further
qualification. Phase 09 implementation left `fileKey: ''` (empty string) at both
dispatch call sites in `lib/agent/driver.ts`. Phase 11 must clarify semantics and
fill the correct value.

## 2. Decisions

### 2.1 — fileKey is the input file reference

`DispatchParams.fileKey` carries the *input* file reference — the asset the provider
uses as a source (reference image, base video, etc.) for the generation. It is **not**
the output location; the output is returned by the provider via webhook `result_url`.

### 2.2 — Value sourced from aiGenerations.params.input_file_key

At dispatch time, `fileKey` is read from `aiGenerations.params.input_file_key` (a
`string | undefined` field in the JSONB column). If absent, an empty string is passed.
Providers that do not require a source file treat an empty `fileKey` as a no-op.

**Source expression:**
```typescript
(gen.params as { input_file_key?: string } | null)?.input_file_key ?? ''
```

### 2.3 — DR 0057 is NOT amended

The `AiProvider` interface (DR 0057) is unchanged. `fileKey` remains a `string` in
`DispatchParams`. This DR refines the semantics without altering the contract.

### 2.4 — Output file-key is assigned during materialization

The output canonical `file_key` stored on the `assets` row is assigned by the
materialization step (lib/agent/materialization.ts) after the provider reports
success. It follows the DR 0054 §2.2 convention: `{provider}/{org_id}/{asset_id}/generation`.

## 3. Non-decisions

- The Higgsfield adapter is not required to pass `fileKey` through unchanged; it may
  map it to a provider-specific field name.
- What `input_file_key` references (an S3 key, a content URL, etc.) is governed by
  the storage provider DR, which remains DEFERRED.
