# A-CureXpress web platform

Connected healthcare platform for India: clinics, doctors, booking, online consultation and a verified medical-shop network.

- Product context: [`docs/ACureXpress_Product_Context.md`](docs/ACureXpress_Product_Context.md)
- Database guide: [`docs/SUPABASE.md`](docs/SUPABASE.md) · Testing rules: [`docs/TESTING.md`](docs/TESTING.md) · Deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Working rules for contributors and AI agents: [`CLAUDE.md`](CLAUDE.md), [`AGENTS.md`](AGENTS.md)

## Repo map

```
apps/
  web/        @acurexpress/web      patient + public site, acurexpress.com        dev :3000
  partner/    @acurexpress/partner  partners.acurexpress.com (placeholder)        dev :3001
  admin/      @acurexpress/admin    admin.acurexpress.com (placeholder, noindex)  dev :3002
packages/
  config/     @acurexpress/config   tsconfig bases, ESLint (with workspace boundaries), Prettier
  ui/         @acurexpress/ui       shadcn primitives, brand components, design tokens
  db/         @acurexpress/db       Supabase clients and generated types
  core/       @acurexpress/core     feature flags, pure domain helpers
supabase/     one database for all apps: migrations, pgTAP tests, functions, seed
docs/         product context, SOPs, specs/ (approved design docs)
```

Apps import only from packages, never from each other; packages never import from apps (ESLint enforces it).

## Quick start

```bash
nvm use                      # Node 22
corepack enable pnpm
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill from `pnpm supabase status` once the local DB is used
pnpm dev                     # all apps; or: pnpm dev --filter=@acurexpress/web
```

- web: http://localhost:3000 (Hindi at `/hi`)
- partner: http://partners.localhost:3001
- admin: http://admin.localhost:3002

Checks (from the root, via turbo): `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`.

Current state: monorepo with a static signed-out Home page (typed sample data) in `apps/web`, and placeholder partner and admin apps. No database schema, auth or payments yet.
