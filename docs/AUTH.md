# Patient sign-in (apps/web)

How sign-in works, how to run it locally, and what the project lead must configure before it goes
live. The design and every decision are in `docs/specs/auth.md` (its Review Logs and "Build decisions"
section win over the plan text). Database rules: `docs/SUPABASE.md`. Permissions: `docs/rls-matrix.md`.

## 1. How it works

- **One panel** (`apps/web/src/features/auth`): a right drawer from `md`, a bottom sheet below, and the
  same panel on `/login` (noindex). Header Login links, `/login?next=` links and protected-page links
  open it when JavaScript is on (`auth-link-interceptor.tsx`); `?login=1&next=&step=` opens it on any page.
- **Methods** come from `AUTH_METHODS` (comma list of `phone,email,google`), read on the server only.
  Phone is always first. Unset means Google only. Production shows none while any legal version is a
  placeholder (`draft-*`).
- **Codes** are sent through a cookie-less client (`createOtpSenderClient`) so a send never touches the
  Google PKCE cookie. Verify, Google and everything else use the cookie client (`@acurexpress/db/server`).
- **Gate** (`features/auth/server/auth-state.ts`), in order: no user -> `signed_out`; no profile or no
  consent for the current Terms -> `needs_finish` (Finish sign-up: 18+ and Terms required, marketing
  optional, name); this session stale after 90 idle days -> `step_up`; otherwise `signed_in`.
  `touch_last_seen()` runs first so a stale session is recorded as pending.
- **Consent** is written only by `finish_signup()` and `record_consent()` (database functions). The
  version comes from `legal_versions`, never from the browser.
- **Step-up**: a Google session clears itself (checked in the database); an email code is confirmed by
  the server (`complete_step_up_server`, service role); a phone-only account answers "Is this your
  account?". "No" signs out and points to Contact us.
- **Identity rules**: Google and email are one account on a verified email (Supabase linking). Phone
  sign-in never links automatically. Profile can add a phone, add an email and connect Google. "Already
  in use" shows before any code (accepted Supabase order, rate limited). No merging.
- **Sessions**: httpOnly, `secure` when deployed, sameSite lax, 30 days. `proxy.ts` refreshes with
  `getClaims()` only when a session cookie exists; pages, actions and the callback use `getUser()`.
- **Fail-safe**: without Supabase env the site still renders; `/login` shows "not available", actions
  return `unavailable`, the header shows Login. Vercel production builds fail without the required env
  (`apps/web/src/config/env-check.ts`).
- **Logging**: `apps/web/src/lib/log.ts` writes allow-listed fields only (event, method, outcome, locale,
  request id, count). Never codes, phones, emails, tokens, return paths or user ids.

## 1a. Signed-in experience (docs/specs/signed-in-home.md)

- **"/" serves two pages.** `proxy.ts` verifies the session cookie with `getClaims()` (a routing hint
  only) and rewrites "/" to the internal `/home` page; the URL stays "/". `/home` checks the user
  again with `getUser()` and shows the public home for an invalid session. A direct `/home` request
  is redirected to "/". A cookie that Auth rejects (4xx, bad JWT) is deleted in the proxy, keeping
  the PKCE `-code-verifier`; a network or 5xx failure keeps the cookies (an outage signs no one out).
- **Private routes** (`/appointments`, `/appointments/[id]`, `/profile`, `/account`, `/support`,
  `/home`) are rendered per request (`instant = false` + `connection()`), sent with
  `Cache-Control: private, no-store`, `X-Robots-Tag: noindex` and a **per-request nonce CSP** with
  `'strict-dynamic'` and no `'unsafe-inline'` for scripts. Public pages stay prerendered and use
  `script-src 'self' 'unsafe-inline'` (owner-approved; Next's page data is inline and a static page
  has no nonce). Turnstile is the only third-party script. Reports go to `/api/csp-report`.
- **Signed-out access** still goes to `/login?next=`; `safeReturnPath` removes any record id from
  `next` (`/appointments/<id>` returns to `/appointments`).
- **Known gap:** `/appointments/[id]` for an unknown or someone else's id shows the not-found page
  with HTTP **200**, because the check runs after streaming starts under `cacheComponents`.
- **Recent sign-in (15 min, `app_settings.recent_auth_minutes`, TODO_HCQ)** protects add or change
  phone, add or change email, connect Google, sign out everywhere and the deletion request.
  Step 0 showed that verifying a `phone_change` code writes a fresh `amr` timestamp, so the JWT
  cannot prove a recent sign-in. The server therefore issues its own proof after a real sign-in or
  re-verify: an httpOnly cookie `acx_recent = <session_id>.<expiry>.<hmac>` (HMAC with
  `RATE_LIMIT_HMAC_SECRET`, prefix `recent:`). Contact changes never set it.
  - **Gap:** the database functions for sign out everywhere and the deletion request check only that
    the caller is signed in; the recent check is in the server action. Someone holding valid tokens
    could call Supabase Auth's `updateUser` or global sign-out directly. `double_confirm_changes`
    (secure email change) and a shorter `jwt_expiry` on staging and production (recommend 900 s)
    reduce this.
- **Re-verify dialog** sends a code to the account's OWN confirmed phone (default) or email, never
  one typed in the browser, with `shouldCreateUser: false`; the new session must be the same user
  (else sign out, fail closed); the replaced session is revoked with
  `POST /auth/v1/logout?scope=local` and its own token (no service role); other devices stay signed
  in. **Google re-verify is not offered:** Google cannot be forced to ask for the password again
  (no `prompt=login`; `max_age=0` was not testable locally), so Google accounts re-verify by an
  email code to their Google email.
- **Sign out** (this device) and **sign out everywhere** both end by clearing device state (`acx:`
  storage keys, session cookies `acx_recent`, `acx_profile`, `acx_auth_method`) and loading a fresh
  document. A `pageshow` guard and a `BroadcastChannel` cover Back after sign-out and other tabs.
- **Idle sign-out** (client, `SESSION_IDLE_MINUTES`, default 30, TODO_HCQ) warns
  `min(2 min, timeout/4)` before signing out. It is a convenience, not the security boundary.
  **Server-side session time-boxes and inactivity timeouts are a Supabase Pro setting**
  (Auth > Sessions); they are not assumed here and must be set by the project lead if HCQ wants them.
- **Family profiles:** one login, many patient profiles (`patient_profiles` + `profile_access`). The
  selected profile is the httpOnly cookie `acx_profile` (a UI preference, checked through RLS on
  every request; invalid or archived falls back to self with a notice). Every action names its
  profile explicitly. Dependents never sign in themselves (owner decision; proposed D22).
- **Service role near the patient area:** only the existing rate limiter
  (`features/auth/server/limiter.ts` -> `rate_limit_hit` with HMAC keys; no patient rows). Patient
  data is always read and written with the user's own session.
- **Audit:** `patient_profile.*`, `patient_address.*`, `account.deletion_requested|cancelled` and
  `session.sign_out_all` rows carry ids and field names only.

## 2. Environment variables

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | Local values from `pnpm supabase status` |
| `SUPABASE_SERVICE_ROLE_KEY` | web, server only | Admin client: limiter, cleanup job, unconfirmed-user lookup, email step-up confirmation |
| `AUTH_METHODS` | web, server | Local `phone,email,google`; deployed `email,google` until DLT |
| `NEXT_PUBLIC_SITE_URL` | web | The site's origin; OAuth redirects are built from it |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | web | Unset = no captcha widget |
| `RATE_LIMIT_HMAC_SECRET` | web, server only | Required on Vercel |
| `CRON_SECRET` | web, server only | Bearer secret for `/api/cron/auth-cleanup` (Vercel cron, `apps/web/vercel.json`, needed for the daily cleanup cron) |
| `SESSION_IDLE_MINUTES` | web | Client idle sign-out minutes (1-1440, default 30, TODO_HCQ) |
| `PATIENT_HOME_FIXTURES` | web, development only | `1` shows the full signed-in home with fake data under `next dev`. Ignored by production builds; a Vercel production build fails if set |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `..._SECRET`, `SUPABASE_AUTH_CAPTCHA_SECRET` | `supabase/.env` | Local CLI only, git-ignored |

**Warning:** Next.js loads `apps/web/.env` in every mode. Keep local development pointed at the
local stack (put local values in `apps/web/.env.local`, which wins over `.env`).

## 3. Local recipes

```bash
pnpm db:start        # creates supabase/signing_keys.json once (pnpm db:keys), then starts Docker stack
pnpm db:reset        # migrations + seed (no auth users are seeded)
pnpm db:test         # pgTAP
pnpm dev --filter=@acurexpress/web
```

- **Test phone numbers** (local only, `config.toml [auth.sms.test_otp]`): `9000000001` to `9000000005`,
  code `123456`. No SMS is ever sent locally.
- **Email codes**: Mailpit at http://127.0.0.1:54324 (subject "Your A-CureXpress code").
- **Google locally**: create an OAuth client (Web) with redirect URI
  `http://127.0.0.1:54321/auth/v1/callback`, put the id and secret in `supabase/.env`, set
  `[auth.external.google] enabled = true` in `supabase/config.toml` (do not commit that change), restart.
- **Captcha locally**: Turnstile test keys; set `SUPABASE_AUTH_CAPTCHA_SECRET` in `supabase/.env`,
  `[auth.captcha] enabled = true`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for web, restart.
- **Auth e2e**: `apps/web/scripts/auth-e2e-env.sh` then `pnpm --filter @acurexpress/web test:e2e:auth`
  (port 3200, build folder `.next-auth`, serial). The script refuses a non-local `API_URL`.
- **Signing keys**: if CLI commands fail with "failed to read signing keys", run `pnpm db:keys`.

## 4. Manual Google checklist (identity tests T1, T2, T7)

Run on the local stack with Google configured, or on staging. Use test Google accounts only.

1. **T1**: sign in with Google (account G, email X). Log out. Sign in with an email code to X.
   Expected: the same account (same name in the menu, no Finish sign-up).
2. **T2**: with a new address Y: sign up with an email code to Y, finish sign-up, log out, then
   "Continue with Google" with the Google account for Y. Expected: one account.
3. **T7**: sign up with a test phone, add email X in Profile and verify it, log out, then sign in with
   Google using X. Expected: Google links to the phone account (Profile shows the phone and Google).
4. **Connect Google** from Profile: success shows "Google is connected"; a Google account already used
   elsewhere shows "This Google account is already in use"; cancelling at Google changes nothing.

## 5. Remote settings (the project lead applies these; never from a laptop)

| Setting | Local | Staging | Production |
|---|---|---|---|
| Email provider | Mailpit | Brevo SMTP, verified domain | Brevo SMTP, verified domain |
| Email OTP length / expiry / resend | 6 / 600 s / 30 s | same | same |
| Email templates | code only | code only (copy `supabase/templates`) | same |
| Phone provider | test numbers | off until DLT | off until DLT, then Send-SMS hook to MSG91 (+91 only, limiter) |
| Google | off (on when testing) | on | on |
| Manual linking | on | on | on |
| Captcha (Turnstile) | off | on | on |
| Asymmetric JWT signing keys | local file | on | on |
| Session lifetime | 30 days | 30 days | 30 days |
| `enable_signup` | on | on | **off until real legal versions exist** |
| Site URL / redirect allow-list | `http://localhost:3000` + ports | staging domains (+ partner/admin) | `https://acurexpress.com` (+ partner/admin) |
| `AUTH_METHODS` (Vercel env) | `phone,email,google` | `email,google` | `email,google` (empty result while legal versions are placeholders) |
| `NEXT_PUBLIC_SITE_URL`, `RATE_LIMIT_HMAC_SECRET`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` | local | set | set |

## 6. Enable checklist

- [ ] Real Terms and Privacy versions from HCQ (new migration updating `legal_versions` and
      `LEGAL_VERSIONS` in `packages/core` together), then `enable_signup = true` in production.
- [ ] Brevo SMTP credentials and sender domain (SPF, DKIM) in the Supabase dashboard.
- [ ] DLT registration (sender id and templates) and MSG91 account; build the Send-SMS hook
      (+91 only, `rate_limit_hit`), then add `phone` to `AUTH_METHODS`. SMS volume and cost alert first.
- [ ] Turnstile site and secret keys (site key in Vercel, secret in Supabase).
- [ ] Google OAuth client with the Supabase callback URL for each project.
- [ ] Redirect URLs for web, partner and admin per environment.
- [ ] Asymmetric JWT signing keys switched on in each project.
- [ ] D4 processor register: Google (OAuth), Brevo (email), MSG91 (SMS, later), Cloudflare (Turnstile).
- [ ] Proposed decision D21 applied to the Product Context by the project lead.
- [ ] Proposed decision D22 (family profiles, shared credentials vs G8/D8, DPDP consent) decided.
- [ ] `jwt_expiry` shortened (recommend 900 s) on staging and production; Supabase Pro session
      time-box and inactivity timeout set if HCQ wants them.

## 7. Known gaps

- Coverage thresholds are not enforced until `@vitest/coverage-v8` is approved (ask-first dependency).
- The step-up e2e (backdated `last_seen_at`) needs a direct local DB connection; the rules are covered
  by pgTAP (`supabase/tests/02_identity.test.sql`) and unit tests.
- T1, T2 and T7 are manual (above). Per-IP counting on hosted Supabase (OQ1) is checked on staging.
- A verified phone before a first booking is a later task.
