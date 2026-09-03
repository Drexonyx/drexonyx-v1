# Drexonyx V1

Drexonyx V1 application repository.

## Foundation State

This repository currently contains the Phase 01 foundation: a minimal Next.js
application skeleton (Step 01), CI and environment/secrets conventions
(Step 02), and the architecture/security/testing boundary baseline (Step 03,
see `ARCHITECTURE.md` and `CLAUDE.md`). No database, authentication,
payments, third-party integrations, or business logic have been implemented
yet.

## Stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript
- ESLint

## Prerequisites

- **Node.js**: `^22.22.2 || ^24.15.0 || >=26.0.0` (see `engines` in `package.json`
  and `.nvmrc`). This range is not arbitrary — it is the intersection of the
  Node requirements declared by this project's own dependencies (notably
  `jsdom`, the narrowest). `npm install`/`npm ci` will fail fast with a clear
  error on an incompatible Node version (`engine-strict=true` in `.npmrc`)
  rather than silently warning. If you use `nvm`, running `nvm use` in the
  repo root picks up the correct version automatically.
- **npm**: ships with the Node versions above; no separate install needed.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — create a production build
- `npm run start` — run the production build
- `npm run lint` — run ESLint
- `npm run typecheck` — run the TypeScript compiler in check-only mode
- `npm run test` — run the unit/component test suite (Vitest)

## Testing

Vitest, recommended for this project's current testing needs, is used for
unit and component tests, with React Testing Library and jsdom. Tests are
colocated with source (e.g. `app/page.test.tsx`). Run them with
`npm run test`. E2E testing, architecture-boundary enforcement, and
authorization/tenant-isolation test content are intentionally out of scope
until the corresponding application code exists (see `ARCHITECTURE.md`).

## Continuous Integration

Every push and pull request runs the CI workflow defined in
`.github/workflows/ci.yml`: `npm ci`, lint, type-check, test, a dependency
security audit (`npm audit --audit-level=high`), and production build. A
pull request cannot be considered green unless all six steps pass.

## Dependency Updates

`.github/dependabot.yml` opens weekly update pull requests for npm packages
and GitHub Actions used by this repository.

## Environments & Secrets

- Environment selection (development / production) is handled by Next.js
  and the hosting platform, not by files in this repository.
- `.env.example` documents the environment variable convention. It contains
  no real values. Copy it to `.env.local` for local development.
- All `.env*` files except `.env.example` are gitignored and must never be
  committed.
- Only variables prefixed `NEXT_PUBLIC_` are exposed to the browser;
  anything else stays server-side. Secrets must never use that prefix.
- No secrets exist in this repository at this stage, and CI must never
  echo, log, or persist secret values.
