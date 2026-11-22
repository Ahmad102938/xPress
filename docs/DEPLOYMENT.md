# Deployment (A-CureXpress)

How the three apps are hosted and released. Nothing here is set up yet: this is the plan the project lead follows when creating the Vercel projects. Read with `docs/SUPABASE.md` (migrations) and `CLAUDE.md` (rules).

---

## 1. Shape

| App | Package | Vercel project | Production domain | Dev port |
|---|---|---|---|---|
| Patient and public site | `@acurexpress/web` | `acurexpress-web` | `acurexpress.com` (+ `www` redirect) | 3000 |
| Partners (doctors, clinics, shops) | `@acurexpress/partner` | `acurexpress-partner` | `partners.acurexpress.com` | 3001 |
| HCQ staff console | `@acurexpress/admin` | `acurexpress-admin` | `admin.acurexpress.com` | 3002 |

- **One Vercel project per app**, all connected to the same GitHub repository.
- **One Supabase project per environment** (local, staging, production) shared by all three apps. One `supabase/` folder at the repo root holds the only set of migrations.
- Order is always: **migrate the database first, then deploy the apps.** Migrations must therefore be backward compatible with the app versions still running (see section 5).

## 2. Vercel project settings (same for each app, change the app name)

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root Directory | `apps/web` · `apps/partner` · `apps/admin` |
| Include files outside the Root Directory in the Build Step | **On** (the app imports `packages/*` source) |
| Install Command | default (`pnpm install`; Vercel detects the pnpm workspace and the `packageManager` field) |
| Build Command | `pnpm turbo run build --filter=@acurexpress/web` (use the app's package name) |
| Output Directory | default (`.next`) |
| Ignored Build Step | `npx turbo-ignore` (skips the build when neither the app nor a package it depends on changed) |
| Node.js version | 22.x (matches `.nvmrc`) |
| Function region | Mumbai, `bom1` (Settings → Functions). Keeps functions next to the Supabase region (choose an India region for Supabase too) |
| Production branch | `main` |
| Remote cache | optional: Vercel Remote Cache for turbo (no secrets in the repo) |

No `vercel.json` is needed: every setting above lives in the project settings. Add one per app only if a later need (cron, headers that must live outside `next.config.ts`) requires it.

## 3. Environment variables

Set per project and per Vercel environment. The variable names are listed in the root `.env.example` (grouped by app) and in each `apps/<app>/.env.example`.

| Vercel environment | Supabase project | Keys | Notes |
|---|---|---|---|
| Development (`vercel env pull`) | local (`pnpm db:start`) | local keys from `pnpm supabase status` | Prefer the local stack; do not pull production keys to laptops |
| Preview (every PR / branch) | **staging only** | staging URL + anon key; service role only where a server action needs it | Preview must never see production keys |
| Production (`main`) | production | production URL + anon key; service role server-only | Set by the project lead |

- Feature flags (`FLAG_*`) are set per environment. All regulated flags stay `false` in production until HCQ Care clears the launch gate. Changing a flag needs a redeploy (public pages are prerendered).
- `SUPABASE_SERVICE_ROLE_KEY` is never `NEXT_PUBLIC_` and never set on a project that does not need it.
- Turbo only passes env vars declared in `turbo.json` (`FLAG_*`, `NEXT_PUBLIC_*`, `SUPABASE_*`). Add new variable names there, or the build will not see them.

## 4. Domains and DNS

| Record | Name | Points to |
|---|---|---|
| A / ALIAS (as Vercel shows) | `acurexpress.com` | web project |
| CNAME | `www` | web project (redirect to the apex) |
| CNAME | `partners` | partner project |
| CNAME | `admin` | admin project |

- Preview deployments use the generated `*.vercel.app` URLs. Turn on Vercel Deployment Protection for previews of all three projects, and for **production** of the admin project as an extra layer until staff auth with MFA ships.
- The admin app sends `X-Robots-Tag: noindex, nofollow` and a disallow-all `robots.txt`; the partner app indexes only its landing page.

### Local hosts

Browsers resolve `*.localhost` to your machine, so no `/etc/hosts` change is needed:

- web: `http://localhost:3000`
- partner: `http://partners.localhost:3001`
- admin: `http://admin.localhost:3002`

Next.js already allows `localhost` subdomains in dev, so `allowedDevOrigins` is not needed for these.

## 5. Release order: migrations before apps

1. **Pull request.** CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and builds (affected workspaces), plus Playwright per app. Once the first migration lands, the database job runs `supabase db reset`, `test db`, `db lint` and the types check against a local stack in the runner. Vercel builds Preview deployments against **staging**.
2. **Merge to `main`.** A GitHub Actions job (TODO, see the block at the end of `ci.yml`) runs `supabase db push` against **staging** using a GitHub environment secret. Only after it succeeds are the staging app deployments considered current.
3. **Production.** The project lead approves the GitHub `production` environment. The job runs `supabase db push` against production, **then** the app deployments are promoted.
   - Recommended Vercel setup for this order: in each project, turn off automatic assignment of production domains for `main` builds, and let the GitHub Actions job run `vercel promote` for each app after the migration succeeds (Vercel token stored as a GitHub environment secret, never in the repo).
4. **Backward compatible migrations (expand, then contract).** Because all apps share one database and deploy after it, every migration must work with the currently deployed code: add columns as nullable or with defaults, add new functions alongside old ones, backfill in a separate step, and remove old columns or functions only in a later release once no deployed app uses them.

Never run `db push` from a laptop against production. Never edit an existing migration (see `docs/SUPABASE.md`).

## 6. Rollback

- **App:** Vercel Instant Rollback in the affected project (Deployments → previous production deployment → Promote / Instant Rollback). Each app rolls back on its own. Because migrations are backward compatible, the previous app version still works with the current schema.
- **Database:** no down migrations. Fix forward with a new migration that reverses the change, run through the same CI path (staging first). For data damage, use Supabase point-in-time recovery (production plan) after the project lead decides; it affects all three apps.
- **Feature flag:** set the flag back to `false` in the Vercel project and redeploy (or Instant Rollback to the previous deployment).
- **Repository:** revert the merge commit on `main` with `git revert` (never force-push `main`).

## 7. Checklist for creating the projects (project lead)

- [ ] Create Vercel projects `acurexpress-web`, `acurexpress-partner`, `acurexpress-admin` from this repo with the settings in section 2.
- [ ] Set env variables per environment (section 3). Preview uses staging keys only.
- [ ] Add domains and DNS records (section 4); enable Deployment Protection.
- [ ] Create GitHub environments `staging` and `production` (production requires reviewer approval) with `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, project refs, and a Vercel token if `vercel promote` is used.
- [ ] Enable the TODO database and deploy jobs in `ci.yml` once the first migration exists.
