# Hand-off: implement patient sign-in (paste everything below the line into a new Claude Code session)

---

You are continuing work on **A-CureXpress** (repo: `/Users/masum/Desktop/acurexpress`, Turborepo + pnpm; apps `web`, `partner`, `admin`; packages `config`, `ui`, `db`, `core`; one local Supabase in `supabase/`). The previous session designed patient sign-in and sign-up with the EGM plugin and ran out of context before building it. **Your job is to finish the review and then implement it.**

## 0. Recover context first (mandatory)

1. **Read these files in full before anything else:**
   - `CLAUDE.md`, `AGENTS.md`, `docs/TESTING.md`, `docs/SUPABASE.md`.
   - `docs/ACureXpress_Product_Context.md` sections 0, 14, 19, 22, 24, 25.
   - **`docs/specs/auth.md`**: the approved design. Its **"Review Log (Stage 9, round 1)"** section at the end is normative: it overrides the plan above it wherever they conflict. Also read its "Identity Tests T1 to T9" table.
   - `implementation_readiness_report.md` (repo root): the 50 review findings the Review Log resolves.
   - `concepts_brief.md`: the brainstorm, including the owner's reasoning.
2. **Search the previous conversation for any detail the files leave out.**
   - Use the **episodic-memory** plugin: run the `episodic-memory:remembering-conversations` skill, or dispatch the `episodic-memory:search-conversations` agent.
   - Search terms: "Finish sign-up", "AUTH_METHODS", "identity rules Google email phone", "Q8 trigger auth.users", "step-up 90 days", "Postgres limiter", "patient-only footer partner band", "InlineScript emergency bar".
   - Also read `.remember/today-2026-11-22.md`, `.remember/today-2026-11-23.md` and `.remember/now.md` (the remember plugin's notes).
   - Read the auto-memory in `~/.claude/projects/-Users-masum-Desktop-acurexpress/memory/`.
3. **Do not re-ask the owner questions already decided in the spec** (Q1 to Q13, identity rules, Review Log). Ask only about genuinely new decisions, one question at a time.

## 1. Rules (from the owner, all still binding)

- **Git:** do not commit, stage, tag, branch, stash or push; never use `--no-verify`. The owner commits. The working tree already holds large **uncommitted** work from earlier tasks (patient-only web, new footer, Home redesign, hero posters, `[...slug]` stubs). Never revert, overwrite or "clean up" it.
- **Database: LOCAL ONLY.** The checkout is linked to a remote Supabase project (`supabase/.temp/linked-project.json`).
  - Never run `db push`, `db pull`, `db reset --linked`, `migration repair`, `config push` or anything against the remote.
  - Use `pnpm db:start`, `pnpm db:reset`, `pnpm db:test`, `pnpm supabase db lint` and `pnpm db:types`. Make `db:types` explicitly `--local` first (Review Log M1).
  - Create new migration files only, with `pnpm supabase migration new <name>`. Never edit an existing migration.
  - If Docker is not running, write the migrations and pgTAP tests, say clearly they could not be run, and stop DB verification there.
- **Docs:**
  - Do not edit `docs/ACureXpress_Product_Context.md`; D21 is proposed for the lead.
  - In `docs/SUPABASE.md`, add only the one grants rule.
  - `docs/AUTH.md` is allowed (Review Log B4; amend the CLAUDE.md docs rule accordingly).
- **Scope:** do not touch `apps/partner` or `apps/admin`. Shared code goes in packages; apps never import from each other.
- **Dependencies:** ask before adding any. The plan needs **none** (Review Log M16: Sheet on the existing `radix-ui` in packages/ui, zod only in core, no `server-only`, no Upstash, no input-otp). `@vitest/coverage-v8` is an ask-first item (M26).
- **Secrets:** never print, log or commit keys. Only variable names go in `.env.example` files (grouped by app) and `turbo.json`.
- **Quality bar:**
  - en and hi with identical keys (a parity test exists), and no "admin" or "partner" words outside the footer partner link (tests enforce this);
  - accessibility; mobile first (360px);
  - design tokens only (no purple, contrast at least 4.5:1, nothing under 13px);
  - no health data in logs or analytics; no fake claims in copy.
- **EGM is advisory;** the Product Context, SUPABASE.md and TESTING.md win. EGM skills can only be started by the owner typing them: `/egm:egm-review`, `/egm:egm-drift-report`. The Skill tool refuses them, so ask the owner to type the command, then follow the skill's instructions.

## 2. Environment notes

- **Shell:** prefix every command with `export PATH=$HOME/.nvm/versions/node/v22.21.0/bin:$PATH` (Node 22, pnpm 10.34.9). Supabase CLI is 3.2.0 (`pnpm supabase ...`).
- **Port 3000** may be held by the owner's web dev server, or by their other project in `~/Desktop/adidev`. Never kill a process you did not start; use another port and say so.
- **Turbopack** sometimes misses `globals.css` changes, so run `rm -rf apps/web/.next` before builds.
- **Next.js 16 specifics:**
  - `cacheComponents` is on;
  - `src/proxy.ts` replaces middleware;
  - check `apps/web/node_modules/next/dist/docs/` before using an unfamiliar API;
  - inline `<script>` tags must use `src/components/ui/inline-script.tsx` (the documented pattern), or React warns on client navigation.
- **Known separate issue:** background prefetches of some stub pages return 404 (navigation works). Not part of this task.
- **Baseline before this task** (all green): web unit 66, ui 8, core 5, config 4, db 3, partner 3, admin 3; e2e web 119, partner 3, admin 3; web builds 60 pages.

## 3. What to do, in order

1. **Finish the review.**
   - Ask the owner to type `/egm:egm-review docs/specs/auth.md`, give it the same four context files (Product Context, SUPABASE.md, TESTING.md, CLAUDE.md), and choose **"Implementation plan only"** (Stage 9, round 2).
   - Resolve its findings in the spec's Review Log (apply valid ones; record rejected ones with reasons; owner direction: early development, simplest option that keeps the security properties).
   - Show the owner the review log and the list of spec changes, then get a go-ahead.
2. **Build milestones M1 to M7** exactly as in `docs/specs/auth.md` (Detailed Implementation Plan plus Review Log), verifying each milestone before the next:
   - **M1 Database.** Foundation and identity migrations, pgTAP, `config.toml`, templates, types.
   - **M2 packages.** core: phone, email, next-path, auth-methods, auth-errors, schemas, legal. db: cookies, admin, middleware, env. ui: sheet.
   - **M3 Proxy and session.** `getClaims()` in the proxy, `/auth/*` handled without locale, fail-safe without env, `env-check.ts`.
   - **M4 Panel UI.** Drawer and bottom sheet, `/login`, phone and email codes, Finish sign-up, step-up, header island `/auth/session`, user menu, bottom nav, link interceptor, i18n `auth` namespace.
   - **M5 Google.** `startGoogle` (PKCE), `/auth/callback` with link mode, tests with a mocked exchange.
   - **M6 Profile.** `(patient)` pages with `requirePatient()`, add phone, add email, connect Google, marketing toggle.
   - **M7 Wrap-up.** Cron cleanup and `vercel.json`, CI jobs (database and e2e-auth), `playwright.auth.config.ts` on port 3200, `scripts/auth-e2e-env.sh`, `docs/AUTH.md`, `docs/rls-matrix.md`, the SUPABASE.md rule, CLAUDE.md, the `.env.example` files, turbo.json.
3. **Verify.**
   - Start Docker if needed.
   - Run `pnpm db:start`, `pnpm db:reset`, `pnpm db:test`, `pnpm supabase db lint`, `pnpm db:types`.
   - Then `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` (all apps) and `pnpm --filter @acurexpress/web test:e2e:auth`.
   - Do a manual pass with `pnpm dev --filter=@acurexpress/web`.
   - Screenshot every panel state at 360px and 1280px in en and hi. The visual reference is the owner's Apollo Pharmacy login drawer: right-side white panel, close and back icons top, a friendly illustration, a bold title, a "+91 Enter phone number" field, a full-width Continue button, and small checkboxes. In our design the checkboxes live on Finish sign-up, not the first screen.
4. **Drift check.** Ask the owner to type `/egm:egm-drift-report docs/specs/auth.md`. Fix real drift in code, or update the spec with a reason. Apply Review Log M28: a Major or higher drift finding in a security-critical part triggers a second Goldfish review of that part.
5. **Report to the owner**, then stop. Do not start booking, profile content or doctor work. The report covers:
   - files built, migrations and policies;
   - the review logs and drift report;
   - the threat checklist and how each item is handled;
   - tests and verification output;
   - default methods per environment;
   - external configuration (Google client, Brevo SMTP, DLT and MSG91 through the Send-SMS hook, Turnstile, redirect URLs, signing keys, `enable_signup` off in production until real legal versions);
   - undecided points, TODO_HCQ items;
   - a suggested commit message.

## 4. Owner decisions at a glance (details in the spec)

- **Methods:** phone code is primary and the UI default (listed first); email code through Brevo is the interim method while DLT is pending; Google is extra. `AUTH_METHODS`: unset means `google`; local `phone,email,google`; deployed `email,google` until DLT.
- **Identity:** Google and email resolve to one account on a verified email; phone never links automatically. Profile can add a phone, add an email and connect Google; "already in use" shows before any code (accepted Supabase limitation, rate limited). No merging; two accounts per person is a known v1 limitation.
- **Consent:** a Finish sign-up screen after authentication (18+ and Terms required, marketing optional, name), recorded by the `finish_signup()` definer function. No checkbox on the first screen, no consent cookie.
- **Q1:** a user who stops at Finish sign-up stays signed in but blocked.
- **Q2:** profile, role and consent are created together at Finish sign-up; cleanup of unconfirmed users after 24 hours.
- **Q3:** staff may use the patient site; staff roles need `aal2`.
- **Q4:** Supabase built-in Turnstile captcha; Postgres rate limiter.
- **Q5:** `getClaims()` in the proxy, `getUser()` elsewhere.
- **Q6:** one "wrong or expired" message; 5 tries per code.
- **Q7:** nine-value `app_role` enum.
- **Q8:** `profiles.email` and `profiles.phone` are kept and shown, synced by a minimal never-raise trigger on `auth.users`.
- **Q9:** consents are `on delete set null`.
- **Q10:** fail-safe app plus a CI database job and an auth e2e project.
- **Q11:** one spec file in three parts.
- **Q12:** the gate checks the current Terms version; marketing can be changed later in Profile.
- **Q13:** step-up after 90 days idle on phone sign-in, stored in the database (Review Log B6).
- **Staying as is:** legal versions remain `TODO_HCQ` (`draft-2026-11`); production hides sign-in while they are placeholders (Review Log B5).

## 5. Working artefacts

`concepts_brief.md`, `design_draft.md` and `implementation_readiness_report.md` (plus any new review reports) are working files. Delete them only after the owner says so.
