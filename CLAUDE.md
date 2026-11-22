## Workflow rules (apply every session)
For any new module or schema change (booking, payments, ledger, RLS, prescriptions, status/badge rules), use the EGM plugin to write a design doc and get a goldfish review before writing code, and save the approved doc in docs/specs/. Skip EGM for small UI or copy changes.

# A-CureXpress: working rules for Claude Code

Healthcare platform for India (HCQ Care Private Limited, built by Flucks). Patient safety and privacy come first.

## Required reading (before any change)

1. `docs/ACureXpress_Product_Context.md`: product rules, hard rules, decisions D0–D20, open-point defaults (§23), tech decisions (§24), UI direction (§25), out of scope (§26).
   Precedence when sources disagree: §22 decisions → addendum → brief → §23 defaults.
2. `docs/SUPABASE.md`: database SOPs. Mandatory before touching `supabase/`, SQL, RLS or Supabase client code (`packages/db`).
3. `docs/TESTING.md`: what to test and how. `docs/DEPLOYMENT.md`: Vercel projects, env, migrate-then-deploy order.
4. `AGENTS.md`: Next.js 16 differs from older versions. Check `apps/web/node_modules/next/dist/docs/` before using an API you are unsure of.

**Never silently edit `docs/ACureXpress_Product_Context.md`.** Propose changes to it (for example a new decision) in your report and let the project lead apply them. Other files in `docs/` change only when a command or path they describe changes; new files there are limited to `docs/rls-matrix.md`, `docs/specs/*` (approved EGM design docs) and `docs/DEPLOYMENT.md`. `docs/designs/` holds Stitch exports: visual reference only, never copy their code.

## Stack

Turborepo + pnpm workspaces · Next.js 16 (App Router, `cacheComponents`, Turbopack) · React 19 · TypeScript strict (`noUncheckedIndexedAccess`) · Tailwind CSS 4 (tokens in `packages/ui/src/styles/tokens.css`) · shadcn/ui (radix) · next-intl (`en`, `hi`; on web English unprefixed, Hindi at `/hi/...`) · Supabase (`@supabase/ssr`) · zod · Vitest + Testing Library · Playwright + axe · pnpm 10 · Node 22 (`.nvmrc`).

## Repo layout

| Path | Package | What lives there |
|---|---|---|
| `apps/web` | `@acurexpress/web` | Patient and public site, acurexpress.com (dev :3000) |
| `apps/partner` | `@acurexpress/partner` | Doctor, clinic and shop partners, partners.acurexpress.com (dev :3001). Placeholder |
| `apps/admin` | `@acurexpress/admin` | HCQ staff console, admin.acurexpress.com (dev :3002). Placeholder, `noindex` |
| `packages/config` | `@acurexpress/config` | tsconfig bases, ESLint flat configs (with the boundary rule), Prettier options |
| `packages/ui` | `@acurexpress/ui` | shadcn primitives, brand components (badges, rating, logo), `cn`, design tokens, their `badges`/`rating` strings |
| `packages/db` | `@acurexpress/db` | Supabase clients (`/client`, `/server`, `/middleware`) and generated types |
| `packages/core` | `@acurexpress/core` | Feature flags, constants, zod schemas, pure domain helpers and types |
| `supabase/` | (root) | ONE database for all apps: migrations, pgTAP tests, functions, `seed.sql` (synthetic only) |
| `docs/` | (root) | Product context, SOPs, `specs/` for approved design docs |

Inside `apps/web/src`:
- `app/[locale]/(public)`: visitor pages. `[slug]/page.tsx` serves "Coming soon" stubs; a real page at the same path wins.
- `app/[locale]/(patient)`: placeholder. Add a server-side auth and role guard before any page. The old `(partner)` and `(admin)` route groups are superseded by `apps/partner` and `apps/admin`; do not add pages there.
- `components/ui` (app-specific primitives such as `section-header`, `banner-carousel`), `brand` (cards, chips), `layout` (header, footer, nav, search), `home` (Home sections).
- `lib/mock` (typed SAMPLE data), `config/` (page config), `i18n` (routing + messages).

## Package boundaries (enforced by ESLint `no-restricted-imports`, tested in `packages/config`)

- Apps import only from packages, **never from each other**. Packages **never import from apps** (and never use the app-only `@/` alias).
- Import a package by name through its public entry points (`index.ts`, or a subpath declared in its `package.json` `exports`). No deep imports into `src/`.
- Shared things go in `packages/`. Partner-only code stays in `apps/partner`, admin-only code in `apps/admin`. When unsure, keep it in the app and promote it once a second app needs it.
- **No business rules in React components.** Rules (doctor status, badges, booking, payments, ledger) live in Postgres functions/RLS and server actions; components only render.
- Packages ship TypeScript source (no build step). Each app lists them in `transpilePackages` in `next.config.ts`.
- A new shared component that uses strings brings its own messages (see `packages/ui/src/messages`); apps merge them into their next-intl messages.

## Commands (run from the repo root)

| Command | What it does |
|---|---|
| `pnpm dev` | All apps in dev (web :3000, partner :3001, admin :3002). One app: `pnpm dev --filter=@acurexpress/web` |
| `pnpm build` / `pnpm start` | Production build / serve (turbo, cached) |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | ESLint per workspace · `next typegen` + tsc per workspace · Prettier (whole repo) |
| `pnpm test` | Unit tests (Vitest) in every workspace |
| `pnpm test:e2e` | Per app: builds, starts (web :3100, partner :3101, admin :3102), runs Playwright + axe. `pnpm --filter @acurexpress/web exec playwright install chromium` once |
| `pnpm turbo run <task> --filter=<package>` | Any task for one workspace (and its dependencies) |
| `pnpm db:start` / `db:stop` / `db:reset` / `db:test` / `db:types` | **Local** Supabase only (Docker). `db:types` writes `packages/db/src/database.types.ts` |

Env files are per app: copy `apps/<app>/.env.example` to `apps/<app>/.env.local` (the root `.env.example` lists them grouped by app). Turbo only passes declared env vars to tasks; add new ones to `turbo.json`.

If styles look stale after editing CSS, `rm -rf apps/<app>/.next` (Turbopack's build cache can miss CSS changes).

## Hard rules

- **No secrets** in code, commits, logs or output. Only `.env.example` files are tracked. The service role key is server-only and never `NEXT_PUBLIC_`.
- **No real patient data** anywhere outside production. Mocks and seeds use obviously fake names and numbers.
- **Never fabricate** doctors, counts, reviews, locations or "online now" claims. Placeholders are labelled on screen and in code.
- **RLS on every table**, enabled in the same migration that creates it, with allow and deny tests.
- **Never run** `db push`, `db reset`, `db pull`, `migration repair` or destructive SQL against a remote/linked project. Local only.
- **Never edit an existing migration.** Add a new one. Migrations must stay backward compatible with the app versions still deployed (all three apps share one database).
- **Feature flags** (`packages/core/src/flags.ts`): `medicineSales`, `onlinePrescribing`, `aiConsultant`, `nativeAppFeatures` default **false**; `shopNetwork` (Phase 1, not regulated) defaults true. Components read flags, never hard-code them. Flag-off UI is hidden, not greyed out.
- **No health data** in logs, analytics events, notification text or migrations.
- Doctor status and badge logic live on the server/database, never only in UI. "A-CureXpress Verified" (shield icon) and "Registered Doctor" (plain grey outline) must never look alike (`packages/ui/src/brand/verification-badge.tsx`).
- **Admin app:** never indexed; every admin page needs server-side auth, a role guard and TOTP MFA (AAL2) before it ships.
- Never convey meaning by colour alone. Text contrast ≥ 4.5:1, visible focus, touch targets ≥ 44px, mobile first (360px), respect reduced motion.
- All UI strings go in the app's `src/i18n/messages/{en,hi}.json` (or a package's `messages/`), same keys in both (a unit test enforces this per workspace). Hindi is first-pass and marked TODO-review.
- No `any`. Types for DB tables come from `pnpm db:types`.

## Definition of done

From the root: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm test:e2e` (axe: zero critical/serious) all pass; new behaviour has tests in the workspace it lives in; DB changes follow the `docs/SUPABASE.md` PR checklist; docs and this file are updated when behaviour or commands change.

## Ask first

Ask before adding any new dependency, before any destructive action (deleting files or data, dropping or renaming DB objects, rewriting git history, force pushes), and before anything that touches a remote environment (Supabase, Vercel, DNS, GitHub settings). Do not push unless asked.
