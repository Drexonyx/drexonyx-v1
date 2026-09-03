# Drexonyx V1 — Architecture Baseline

This document establishes the architecture, environment, secrets, security,
and testing boundaries for Drexonyx V1. It is a **boundary and convention
document only** — no database, authentication, payments, external
integrations, or business logic exist in the codebase yet. Every rule below
constrains work that has not been implemented, and must be respected by any
future phase/step before those features are added.

## 1. Architecture Boundaries

The application follows a strict layered architecture with a single
dependency direction:

```
UI  →  Application  →  Domain / Business Rules  →  Services  →  Infrastructure  →  External Providers
```

Rules:

- **Dependencies point inward only, right-to-left in usage terms**: a layer
  may depend on the layer(s) to its right in the diagram above (i.e. UI may
  call Application; Application may call Domain and Services; Services may
  call Infrastructure; Infrastructure may call External Providers). No layer
  may depend on a layer to its left (Domain must never import from
  Application or UI; Services must never import from UI, etc.).
- **UI** (`app/` — Next.js App Router routes, layouts, and presentational
  components): renders interface state and dispatches user intent. Contains
  no business rules and performs no direct data access.
- **Application**: orchestrates use cases — coordinates Domain and Services
  to fulfil a request from the UI. Not yet present in the codebase.
- **Domain / Business Rules**: the core business logic and invariants,
  framework-agnostic and free of I/O. Not yet present in the codebase.
- **Services**: application-facing service interfaces the Domain/Application
  layers depend on (abstractions), independent of any concrete provider.
  Not yet present in the codebase.
- **Infrastructure**: concrete implementations of Service interfaces
  (database clients, external API clients, file storage, etc.). Not yet
  present in the codebase.
- **External Providers**: third-party systems (database engines, payment
  processors, AI/media providers, auth providers, etc.) accessed exclusively
  through Infrastructure. None are integrated yet.

No directory scaffolding for Application, Domain, Services, or
Infrastructure is created in this step — creating empty structure ahead of
an approved feature would invent scope. This document is the authoritative
boundary definition; the corresponding directories are introduced only when
a future, explicitly approved step adds real content to them.

## 2. Environment Boundaries

- Three environments are recognized: **development**, **staging**, and
  **production**. They are strictly separated and never share configuration,
  data, or credentials.
- Environment separation is achieved through the hosting platform's
  environment configuration and Next.js's own environment handling
  (`NODE_ENV`, environment-scoped env files), not through in-repo branching
  logic or hardcoded environment checks that select business behavior.
- No environment-specific application code exists yet, since no environment
  has infrastructure or providers to distinguish between.

## 3. Secrets

- No secrets, API keys, passwords, tokens, or private provider credentials
  may exist in source code, frontend/client code, Git history, logs,
  prompts, or any committed file.
- Secrets are supplied exclusively via environment variables injected by the
  hosting platform at runtime (see `.env.example` and the README
  "Environments & Secrets" section for the mechanics already in place).
- Only variables explicitly prefixed `NEXT_PUBLIC_` are exposed to browser
  code; a secret must never carry that prefix.
- CI must never echo, log, or persist a secret value; the current CI
  workflow (`.github/workflows/ci.yml`) references no secrets at all.

## 4. Security Baseline

These rules govern all future implementation and are non-negotiable:

- **Server-side authorization is mandatory.** Every access decision is
  enforced on the server. Hiding UI elements or routes on the frontend is
  never a substitute for a server-side check.
- **Frontend visibility is never authorization.** The client may not be
  trusted to decide what a user is allowed to see or do.
- **Tenant isolation must be enforced server-side.** Any multi-tenant data
  access must be scoped and verified on the server for every request; the
  client's claimed tenant/user context is never trusted on its own.
- **No direct Browser → Database access.** All data access goes through the
  Application/Domain/Services/Infrastructure chain; the browser never holds
  database credentials or a direct database connection.
- **External provider secrets remain server-side**, accessed only from
  Infrastructure code, never from UI or Application code that ships to the
  browser.

## 5. Testing Baseline

The foundation must support (i.e. not architecturally preclude) the
following test types once corresponding code exists:

- Unit tests (Domain and Application logic in isolation)
- Integration tests (Services/Infrastructure boundaries)
- Authorization tests
- Security tests
- Architecture tests (verifying the layering/dependency-direction rules in
  Section 1 are not violated)
- Regression tests

Priority areas for these tests, once there is authorization/tenant logic to
test, are: tenant isolation, unauthorized access, privilege escalation,
duplicate events, and invalid state transitions.

No test framework or test files are added in this step. Selecting a test
runner is a technical decision outside the currently approved stack (Next.js
+ TypeScript + App Router) and is deferred to an explicitly approved step.

## 6. Claude Code Operating Rules

See `CLAUDE.md` for the operating rules that govern how implementation work
on this repository is carried out.
