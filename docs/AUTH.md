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

## 7. Known gaps

- Coverage thresholds are not enforced until `@vitest/coverage-v8` is approved (ask-first dependency).
- The step-up e2e (backdated `last_seen_at`) needs a direct local DB connection; the rules are covered
  by pgTAP (`supabase/tests/02_identity.test.sql`) and unit tests.
- T1, T2 and T7 are manual (above). Per-IP counting on hosted Supabase (OQ1) is checked on staging.
- A verified phone before a first booking is a later task.
