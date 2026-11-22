## Workflow rules (apply every session)
For any new module or schema change (booking, payments, ledger, RLS, prescriptions, status/badge rules), use the EGM plugin to write a design doc and get a goldfish review before writing code, and save the approved doc in docs/specs/. Skip EGM for small UI or copy changes.

# A-CureXpress: working rules for Claude Code

Healthcare platform for India (HCQ Care Private Limited, built by Flucks). Patient safety and privacy come first.

## Required reading (before any change)

1. `docs/ACureXpress_Product_Context.md`: product rules, hard rules, decisions D0–D20, open-point defaults (§23), tech decisions (§24), UI direction (§25), out of scope (§26).
   Precedence when sources disagree: §22 decisions → addendum → brief → §23 defaults.
2. `docs/SUPABASE.md`: database SOPs. Mandatory before touching `supabase/`, SQL, RLS or Supabase client code.
3. `AGENTS.md`: Next.js 16 differs from older versions. Check `node_modules/next/dist/docs/` before using an API you are unsure of.

Do not edit files in `docs/` (the only exception is adding `docs/rls-matrix.md`). `docs/designs/` holds Stitch exports: visual reference only, never copy their code.

## Stack

Next.js 16 (App Router, `cacheComponents`, Turbopack) · React 19 · TypeScript strict (`noUncheckedIndexedAccess`) · Tailwind CSS 4 (tokens in `src/styles/globals.css`) · shadcn/ui (radix) · next-intl (`en`, `hi`; English unprefixed, Hindi at `/hi/...`) · Supabase (`@supabase/ssr`) · zod · Vitest + Testing Library · Playwright + axe · pnpm 10 · Node 22 (`.nvmrc`).

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | ESLint · `next typegen` + tsc · Prettier |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | Builds, starts on :3100, runs Playwright + axe (`pnpm exec playwright install chromium` once) |
| `pnpm db:start` / `db:stop` / `db:reset` / `db:test` / `db:types` | **Local** Supabase only (Docker) |

If styles look stale after editing `globals.css`, `rm -rf .next` (Turbopack's build cache can miss CSS changes).

## Layout

- `src/app/[locale]/(public)`: visitor pages. `[slug]/page.tsx` serves "Coming soon" stubs; a real page at the same path wins.
- `src/app/[locale]/(patient|partner|admin)`: placeholders. Add a server-side auth and role guard before any page.
- `src/components/ui` (primitives), `brand` (badges, cards, logo), `layout` (header, footer, nav, search), `home` (Home sections).
- `src/lib/flags.ts` (feature flags), `src/lib/mock` (typed SAMPLE data), `src/lib/supabase` (clients; no queries yet), `src/i18n` (routing + messages).
- `supabase/` migrations, tests (pgTAP), functions, `seed.sql` (synthetic only).

## Hard rules

- **No secrets** in code, commits, logs or output. Only `.env.example` is tracked. The service role key is server-only and never `NEXT_PUBLIC_`.
- **No real patient data** anywhere outside production. Mocks and seeds use obviously fake names and numbers.
- **Never fabricate** doctors, counts, reviews, locations or "online now" claims. Placeholders are labelled on screen and in code.
- **RLS on every table**, enabled in the same migration that creates it, with allow and deny tests.
- **Never run** `db push`, `db reset`, `db pull`, `migration repair` or destructive SQL against a remote/linked project. Local only.
- **Never edit an existing migration.** Add a new one.
- **Feature flags** (`src/lib/flags.ts`): `medicineSales`, `onlinePrescribing`, `aiConsultant`, `nativeAppFeatures` default **false**; `shopNetwork` (Phase 1, not regulated) defaults true. Components read flags, never hard-code them. Flag-off UI is hidden, not greyed out.
- **No health data** in logs, analytics events, notification text or migrations.
- Doctor status and badge logic live on the server/database, never only in UI. "A-CureXpress Verified" (shield icon) and "Registered Doctor" (plain grey outline) must never look alike.
- Never convey meaning by colour alone. Text contrast ≥ 4.5:1, visible focus, touch targets ≥ 44px, mobile first (360px), respect reduced motion.
- All UI strings go in `src/i18n/messages/{en,hi}.json` (same keys; a unit test enforces this). Hindi is first-pass and marked TODO-review.
- No `any`. Types for DB tables come from `pnpm db:types`.

## Definition of done

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm test:e2e` (axe: zero critical/serious) all pass; new behaviour has tests; DB changes follow the `docs/SUPABASE.md` PR checklist; docs and this file are updated when behaviour or commands change.

## Ask first

Ask before adding any new dependency, before any destructive action (deleting files or data, dropping or renaming DB objects, rewriting git history, force pushes), and before anything that touches a remote environment. Do not push unless asked.
