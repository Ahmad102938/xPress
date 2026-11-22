<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## A-CureXpress monorepo (read with CLAUDE.md)

- This is a Turborepo + pnpm workspace. `next` is installed per app, so read the Next.js docs at `apps/web/node_modules/next/dist/docs/` (the same version is used by `apps/partner` and `apps/admin`).
- Run tasks from the repo root: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` (turbo runs them in every workspace). One workspace: `pnpm turbo run <task> --filter=@acurexpress/<name>`.
- Apps (`apps/web`, `apps/partner`, `apps/admin`) import only from packages, never from each other. Packages (`packages/config`, `ui`, `db`, `core`) never import from apps. Import packages through their public entry points only. ESLint enforces this.
- No business rules in React components: they live in Postgres functions/RLS and server actions.
- Partner code stays in `apps/partner`; shared code goes in `packages/`.
- One Supabase project and one `supabase/` folder (at the root) serve all apps. Local only; never touch a linked remote.
- Keep every rule in CLAUDE.md: tests with every change, EGM design doc for new modules and schema changes, never edit existing migrations, no secrets, never silently edit `docs/ACureXpress_Product_Context.md`.
