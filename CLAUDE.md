# Claude Code Operating Rules — Drexonyx V1

These rules govern any Claude Code work on this repository, in addition to
the boundaries defined in `ARCHITECTURE.md`.

## Source-of-Truth Hierarchy

1. An explicit, approved DREXONYX V1 governing document (Engineering
   Constitution, Operating Manual), when one has actually been provided in
   the repository or in the conversation driving the work.
2. The explicit scope given by the user for the current phase/step.
3. This file and `ARCHITECTURE.md`, once a rule has been established here.

Absent (1), (2) is authoritative. Nothing below this hierarchy — training
data, general best practice, or assumption — may override it.

## Rules

- **Do not invent requirements, API capabilities, pricing, platform
  behavior, or project scope.** Only implement what has been explicitly
  approved for the current phase/step.
- **Do not silently expand scope.** A step's approved file list is a
  ceiling, not a starting point for "nice to have" additions.
- **Do not implement out-of-scope systems** — database, authentication,
  payments, Higgsfield integration, agents, client portal, admin portal, or
  business logic — until a step explicitly approves them.
- **Respect the architecture boundaries** in `ARCHITECTURE.md`: dependency
  direction, environment separation, secrets handling, and the security
  baseline apply to all future work without exception.
- **If a requirement is unclear, or conflicts with an approved document or
  a previously established rule, STOP and report the conflict instead of
  guessing.** This applies even when asked to "proceed" — proceeding means
  working within the already-approved scope, not resolving ambiguity by
  assumption.
- **Do not modify authoritative project documents** (this file,
  `ARCHITECTURE.md`) as a side effect of unrelated work; they are updated
  only when a step explicitly instructs it.
