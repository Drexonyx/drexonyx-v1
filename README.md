# Drexonyx V1

Drexonyx V1 — UGC advertising video production platform.

## System State (Phase 21)

Full-stack Next.js application. All core business systems are implemented:
authentication, client provisioning, quotes, orders, production (AI-generation + manual upload),
QC, approvals, revisions, deliveries, financial ledger, email notifications, and
Cloudflare R2 object storage. See `docs/decisions/` for the full Decision Record index.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [NextAuth v5](https://authjs.dev) — dual Credentials providers (admin portal, client portal)
- [Drizzle ORM](https://orm.drizzle.team) + [postgres.js](https://github.com/porsager/postgres) — PostgreSQL
- [Resend](https://resend.com) — transactional email (delivery notifications, quote notifications)
- [Stripe](https://stripe.com) — payment processing
- [Higgsfield AI](https://platform.higgsfield.ai) — AI video generation provider
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — private object storage (S3-compatible)
- [Anthropic API](https://docs.anthropic.com) — Skills AI invocations
- [Vitest](https://vitest.dev) — unit and component tests

## Prerequisites

- **Node.js**: `^22.22.2 || ^24.15.0 || >=26.0.0` (see `engines` in `package.json`
  and `.nvmrc`). `npm install`/`npm ci` will fail fast on an incompatible version
  (`engine-strict=true` in `.npmrc`). If you use `nvm`, run `nvm use` in the repo
  root to pick up the correct version.
- **npm**: ships with the Node versions above.

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the environment variable template and fill in real values:

```bash
cp .env.example .env.local
```

See `.env.example` for the full variable list and descriptions, and
`docs/decisions/0103-production-environment-configuration.md` for the authoritative
production variable inventory with security classification of each variable.

Run the development server:

```bash
npm run dev
```

## Scripts

- `npm run dev` — start the development server (http://localhost:3000)
- `npm run build` — create a production build
- `npm run start` — run the production build
- `npm run lint` — run ESLint
- `npm run typecheck` — run the TypeScript compiler in check-only mode
- `npm run test` — run the test suite (Vitest)
- `npm run db:migrate` — apply pending Drizzle migrations (requires `DATABASE_URL`)

## Database Migrations

Migrations are in `db/migrations/`. Apply them with:

```bash
DATABASE_URL=<your-postgres-url> npm run db:migrate
```

In production, use the GitHub Actions workflow `.github/workflows/migrate.yml`
(manual trigger — requires typing `MIGRATE` as confirmation input).

## Testing

Vitest with React Testing Library and jsdom. Tests are colocated with source.
Run with `npm run test`. The full suite (955+ tests) runs in CI on every push.

## Continuous Integration

Every push and pull request runs `.github/workflows/ci.yml`:
`npm ci`, lint, type-check, test, `npm audit --audit-level=high`, and production build.
All six steps must pass before a PR is considered green.

## Environments & Secrets

- `.env.example` documents all environment variables. It contains no real values.
  Copy it to `.env.local` for local development.
- All `.env*` files except `.env.example` are gitignored and must never be committed.
- Only variables prefixed `NEXT_PUBLIC_` are exposed to the browser. Secrets must
  never use that prefix.
- See `docs/decisions/0103-production-environment-configuration.md` for the
  authoritative production variable classification (required secrets, required
  configuration, optional with defaults, and the server-only boundary rule).

## Architecture

See `ARCHITECTURE.md` for dependency direction, environment separation, secrets
handling, and the security baseline. See `CLAUDE.md` for Claude Code operating rules.
