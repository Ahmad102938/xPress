# Goldfish Review Report: Stage 9 Implementation Readiness Test, round 1

**Target:** `/Users/masum/Desktop/acurexpress/docs/specs/auth.md` (lines 672-870, "## Detailed Implementation Plan" to end of file)

**GoldfishContext:** `docs/ACureXpress_Product_Context.md`, `docs/SUPABASE.md`, `docs/TESTING.md`, `CLAUDE.md` (working-tree version; line 16 holds the docs rule).

**Verdict:** NOT READY. Two of the three reviewers independently returned "not ready".

## Reviewer Status

| Reviewer                       | Status    | Raw findings                                |
| ------------------------------ | --------- | ------------------------------------------- |
| `egm-implementation-readiness` | completed | 8 Blocker, 21 Major, 10 Nit                 |
| `egm-codebase-details`         | completed | 3 Blocker, 25 Major (21 + 4 phasing), 7 Nit |
| `egm-style`                    | completed | 0 Blocker, 7 Major, 7 Nit                   |

After deduplication: **9 Blockers, 28 Majors, 13 Nits** (50 findings). Where reviewers disagreed on severity, the highest severity is kept and the disagreement is noted.

ID key: `IR` = `egm-implementation-readiness`, `CD` = `egm-codebase-details`, `ST` = `egm-style`. Every finding lists its full stable ids.

---

## Blockers

### B1. The production build env check breaks today's CI and e2e builds - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness-r1-1`, `egm-codebase-details-r1-2`
- **Affected Scope:** lines 783 (item 36), 822 (item 54), 838 (item 57)
- **Discrepancy Description:** Item 36 makes `next build` fail when Supabase env is missing. `next build` always runs with `NODE_ENV=production`. The `checks` job in `.github/workflows/ci.yml` (`turbo run ... build`) and the existing e2e webServer (`pnpm build && pnpm start` in `apps/web/playwright.config.ts`) both build with no Supabase env.
- **Rationale & Recommendation:** Both jobs would fail. That contradicts "Existing e2e jobs are unchanged" (838) and "Existing projects run unchanged, with no Supabase" (822). State the exact gate (for example only when `VERCEL_ENV=production`) and the env each CI build gets.

### B2. The Playwright `auth` project collides with the existing e2e set-up - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness-r1-2`, `egm-codebase-details-r1-1`
- **Affected Scope:** lines 822 (item 54), 838 (item 57), 863
- **Discrepancy Description:**
  - Port 3100 is already the default (`E2E_PORT ?? 3100`, `playwright.config.ts` line 3).
  - `webServer` applies to the whole config, not to one project, so every run would start both servers. The existing CI e2e job would then need the local Supabase stack.
  - `testDir: "./e2e"` makes the existing `chromium` project pick up `e2e/auth/*.spec.ts`.
  - Both servers would build into the same `apps/web/.next` with different `NEXT_PUBLIC_*` values baked in.
- **Rationale & Recommendation:** "Existing projects run unchanged" cannot hold. Name a separate config file (for example `playwright.auth.config.ts`) or an env-gated server, plus a separate port, a separate dist dir, `testIgnore`/`testMatch`, and the exact commands for both CI jobs and `pnpm test:e2e`.

### B3. "Identity tests 1 to 9" are never defined, and test 7 is categorised two ways - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness-r1-3`, `egm-style-r1-2` (ST rated Major)
- **Affected Scope:** lines 833, 849, 856 (item 66). Context lines 95, 116, 462.
- **Discrepancy Description:** The spec only mentions "the nine identity tests requested by the owner" (line 95) and cites T4, T6 and T8 without defining them. Line 833 puts test 7 in the "run with codes" group, but line 849 puts it in the manual Google checklist. Item 66 deletes `concepts_brief.md` and `design_draft.md`, which are probably where the tests are defined.
- **Rationale & Recommendation:** An implementer cannot write these tests, and after item 66 nobody can recover them. List T1-T9 inline, each with steps and an expected result, and fix test 7's category.

### B4. `docs/AUTH.md` and the SUPABASE.md rule change break the CLAUDE.md docs rule - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness-r1-4`, `egm-codebase-details-r1-24` (CD rated Major), `egm-style-r1-1` (Major), `egm-style-r1-3` (Major)
- **Affected Scope:** lines 846-853 (items 62, 63), 854 (item 64). `docs/AUTH.md` is also depended on at lines 653, 849 and 864.
- **Discrepancy Description:** CLAUDE.md line 16 limits new `docs/` files to `docs/rls-matrix.md`, `docs/specs/*` and `docs/DEPLOYMENT.md`. Other docs change "only when a command or path they describe changes". Item 62 creates `docs/AUTH.md`, and item 64 adds a new policy rule to SUPABASE.md. Item 63's wording ("the file the docs rule allows us to add") suggests the other new files are allowed too.
- **Rationale & Recommendation:** Move the AUTH.md content into `docs/specs/auth.md` or DEPLOYMENT.md, or record an explicit owner exception. Send the SUPABASE.md rule to the lead the same way as the §12/D21 change.

### B5. The production legal-version guard can be bypassed ("non-empty" is ambiguous) - Severity: Blocker

- **Reviewer Lens:** `egm-codebase-details-r1-3`, `egm-style-r1-4` (ST rated Major)
- **Affected Scope:** lines 744 (item 12), 783 (item 36). Context lines 106, 377, 472, 637.
- **Discrepancy Description:** `parseAuthMethods` returns `["google"]` when `AUTH_METHODS` is unset. If the check tests the raw variable, an unset value puts Google sign-up live in production while `LEGAL_VERSIONS` are still `TODO_HCQ`. If it tests the parsed list, the check fires on every production build.
- **Rationale & Recommendation:** This defeats the NFR at line 637 and the threat-model row for placeholder legal versions. State that the guard tests the parsed list ("any sign-in method enabled") and that it applies only to `VERCEL_ENV=production`.

### B6. The step-up cookie has no integrity mechanism or defined contents, and there is no way to detect a phone sign-in - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness-r1-5`, `egm-codebase-details-r1-14` (CD rated Major)
- **Affected Scope:** lines 767 (item 29), 769 (item 31). Context line 420.
- **Discrepancy Description:**
  - The cookie is "bound to the session id, httpOnly, 15 minutes". The plan does not say what it records, how it is made tamper-proof (an HMAC needs a secret, and none is added in items 59 or 60), or where the session id comes from (the JWT `session_id`?).
  - The JWT `amr` value is `otp` for both phone and email codes (`auth-js` `types.ts` lines 388-402), and `app_metadata.provider` is the account's first provider, so "this sign-in was made by phone code" cannot be detected as described.
  - The second-factor API (`signInWithOtp` to the account's email, or `reauthenticate()`) is not named.
- **Rationale & Recommendation:** An unsigned "confirmed" cookie would let a user skip the Q13 step-up. Specify the signing, the payload, the source of the session id, how the method is detected and the API calls.

### B7. Promised audit rows have no writer - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness-r1-6`, `egm-codebase-details-r1-14`
- **Affected Scope:** lines 714-718 (item 5), 770 (item 32). Context lines 207, 287, 444, 462.
- **Discrepancy Description:** `audit_log` is written "only by definer functions". The plan promises audit rows for step-up "Yes" (CUJ 10), phone and email added, and Profile add attempts. None of the item 5 functions writes these.
- **Rationale & Recommendation:** For each audit action, name a definer function (with signature, grants and pgTAP tests) or a trigger path.

### B8. The `audit_log` append-only guard blocks user deletion - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness-r1-7`
- **Affected Scope:** line 706 (item 4). Context lines 286-288.
- **Discrepancy Description:** `audit_log.actor_id` is `on delete set null`, and the set-null action is an UPDATE that the append-only trigger rejects. Unlike consents (Q9), no exception is specified. Deleting a user through `auth.admin.deleteUser` (used by e2e and test cleanup, and later by account deletion) would fail.
- **Rationale & Recommendation:** Add the same narrow set-null exception with a test in item 6, or choose a different FK rule.

### B9. Some `config.toml` settings cannot be built as described (env-off toggles, signing keys) - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness-r1-8`, `egm-codebase-details-r1-7` (CD rated Major), `egm-codebase-details-r1-8` (part)
- **Affected Scope:** lines 694-697, 700 (item 1). Context lines 363-366.
- **Discrepancy Description:**
  - "Off when unset" (Turnstile) and "disabled when unset" (Google) cannot be expressed in static TOML unless `enabled` reads an `env()` value. The plan does not say whether the CLI accepts `env()` on booleans. With `enabled = true` and an empty secret, captcha would break every send.
  - "Asymmetric signing keys" needs `signing_keys_path = "./signing_keys.json"` and a generated key file. `config.toml` warns not to commit that file, and neither `.gitignore` nor `supabase/.gitignore` ignores it.
  - No step generates the key file locally or in the CI `database` and `e2e-auth` jobs, so local `getClaims()` verification is not guaranteed.
- **Rationale & Recommendation:** Give the exact keys and env mechanism, add the key-generation step, add the ignore entry to the file list, and give the CI provisioning.

---

## Majors

### M1. Milestones are not mapped to files, and the `db:types --local` change comes too late - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-9`, `egm-codebase-details-r1-25`
- **Affected Scope:** lines 674-684, 839 (item 58), 860
- **Discrepancy Description:**
  - No item has a milestone, so it is unclear which milestone owns items 36, 52-53 and 57-60.
  - M1 verification runs `pnpm db:types`, but root `package.json` `db:types` has no `--local` and the checkout is linked to a remote project. Item 58, which fixes that, is filed under CI.
  - If Docker is down in M1, item 22 (`database.types.ts`) cannot be generated and M2 cannot typecheck. No fallback is given.
- **Rationale & Recommendation:** Running `db:types` in M1 risks generating types from the remote project, which breaks SUPABASE.md §18. Map each item to a milestone, move item 58 into M1, and give a fallback for when Docker is down.

### M2. The proxy matcher contradicts itself and cites redirect tests that do not exist - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-10`, `egm-codebase-details-r1-4`, `egm-style-r1-5`
- **Affected Scope:** line 762 (item 24). Context line 394.
- **Discrepancy Description:** If the matcher excludes `auth/*`, `proxy.ts` never runs there, so `auth/*` cannot "still get the session refresh". No locale-redirect or proxy tests exist in `apps/web/e2e` or `apps/web/src`, and no new `updateSession`/proxy test is listed.
- **Rationale & Recommendation:** Give the exact matcher string and an in-code branch that skips next-intl for `/auth/*` and `/api/*` but still calls `updateSession`. Add the tests.

### M3. The admin client's file, exports and naming are inconsistent - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-11`, `egm-codebase-details-r1-9`
- **Affected Scope:** lines 753 (item 18), 758 (item 23). Context line 390.
- **Discrepancy Description:** Item 18 puts `createAdminClient()` in `server.ts`. Item 23 adds an `./admin` subpath export, but no `packages/db/src/admin.ts` is listed. Part B calls the limiter helper `createLimiterClient()`, while item 18 calls it `rateLimitHit(...)`.
- **Rationale & Recommendation:** Specify the file, the export names and the subpath mapping.

### M4. `getServiceRoleKey()` in `env.ts` contradicts that file's client-bundle rule - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r1-10`
- **Affected Scope:** line 755 (item 20)
- **Discrepancy Description:** `packages/db/src/env.ts` states that the service role key is deliberately not read there, because `"use client"` `client.ts` imports that file.
- **Rationale & Recommendation:** Place the service role key reader in a server-only module, for example the admin module from M3.

### M5. `assertProductionAuthEnv()` is in the wrong package and its imports are unverified - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r1-11`
- **Affected Scope:** lines 755 (item 20), 783 (item 36)
- **Discrepancy Description:** The check needs `LEGAL_VERSIONS` and `parseAuthMethods` from `@acurexpress/core`, but `packages/db/package.json` has no dependency on core. Importing workspace TypeScript source from `next.config.ts`, which loads before `transpilePackages` applies, is unverified.
- **Rationale & Recommendation:** Move the check into apps/web or core, or add the dependency and verify the import path.

### M6. `VERCEL_ENV` is missing from turbo.json - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r1-19`, `egm-implementation-readiness-r1-36` (IR rated Nit)
- **Affected Scope:** lines 783, 840 (item 59)
- **Discrepancy Description:** Item 36 reads `VERCEL_ENV`, but item 59 does not add it. DEPLOYMENT.md line 49 says Turbo passes only the env vars declared in `turbo.json`.
- **Rationale & Recommendation:** Add `VERCEL_ENV` to the `build` env list, or state why it passes through anyway.

### M7. The `rate_limits` cleanup fallback conflicts with its grants, and pg_cron detection is undefined - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-12`, `egm-codebase-details-r1-23` (part)
- **Affected Scope:** lines 707-709 (item 4), 765 (item 27). Context lines 289-294, 431.
- **Discrepancy Description:** The cron route deletes `rate_limits` rows through service_role "if pg_cron is unavailable", but `rate_limits` has no client grants. The plan does not say how the route detects that pg_cron is missing, or whether the migration runs `create extension pg_cron`.
- **Rationale & Recommendation:** Add a definer cleanup function or an explicit grant, and specify how pg_cron is detected.

### M8. "5 failed attempts per destination per code" cannot be built on `rate_limit_hit` - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-13`
- **Affected Scope:** lines 768, 827. Context line 427 (Q6).
- **Discrepancy Description:** The limiter only counts fixed time windows and never resets when a new code is sent.
- **Rationale & Recommendation:** Define the window, the key, the reset on send, and what "forces a new code" means.

### M9. The client IP header is not named, and local/absent behaviour is undefined - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-14`, `egm-codebase-details-r1-16`
- **Affected Scope:** line 768 (item 30)
- **Discrepancy Description:** The plan does not say whether the header is the first hop of `x-forwarded-for`, `x-real-ip` or `x-vercel-forwarded-for`. It also does not give the key used locally or in CI, or say whether a missing header fails open or closed.
- **Rationale & Recommendation:** Name the header and specify the fallback.

### M10. The PKCE flow-id mechanism is unspecified and easy to confuse with `flow=link` - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-15`, `egm-codebase-details-r1-5`
- **Affected Scope:** lines 763 (item 25), 837 (item 56). Context lines 261, 396-399, 447.
- **Discrepancy Description:** In auth-js 2.119.2, `exchangeCodeForSession(code, { flowId })` receives `sb_flow_id` only when `auth.experimental.appendPkceFlowIdToRedirects` is on (`GoTrueClient.d.ts` lines 676-696, `constants.ts` line 50). Otherwise the app must carry the flow id itself, for example in a cookie. The plan's own `flow=link` parameter is a different thing, and item 18 does not set the client option.
- **Rationale & Recommendation:** Pick one mechanism and name the parameter, cookie or option. The "missing verifier" test depends on it.

### M11. Redirect allow-list entries are bare origins - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r1-6`
- **Affected Scope:** line 691 (item 1). Context line 351.
- **Discrepancy Description:** auth-js matches allow-list entries against the full URL, including the query string. `http://localhost:3100` will not match `/auth/callback?next=...`. Only the Site URL's own origin always passes.
- **Rationale & Recommendation:** Use wildcard entries (`http://localhost:3100/**` and so on). Otherwise these redirects fall back to `site_url`.

### M12. The no-JavaScript `/login` flow is incomplete and conflicts with Turnstile - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-16`, `egm-codebase-details-r1-26`
- **Affected Scope:** line 809 (item 44)
- **Discrepancy Description:** The plan does not say how the code step and destination carry across no-JS posts (hidden field or cookie, and whether it is signed), or how Finish sign-up is reached without JS. Turnstile needs JavaScript.
- **Rationale & Recommendation:** Specify the state carrier and the steps. Resolve the captcha conflict or scope down the no-JS claim.

### M13. The `(patient)` guard will not work as described (layout limits, cacheComponents, gate URL, missing shell) - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-17`, `egm-implementation-readiness-r1-18`, `egm-codebase-details-r1-13`
- **Affected Scope:** lines 809-813 (items 44-46, 48). Context lines 417-421.
- **Discrepancy Description:**
  - Layouts receive neither pathname nor search params, so a layout cannot build `/login?next=<path>` (Next docs `layout.md` lines 180 and 240).
  - Layouts do not re-run on client navigation. The Next auth guide warns against putting auth checks in layouts (`authentication.md` line 1358).
  - With `cacheComponents: true` (`apps/web/next.config.ts` line 9), `cookies()` or `getUser()` needs a `<Suspense>` boundary (`08-caching.md` lines 107-201).
  - "The gate" has no URL.
  - `(patient)` is a sibling of `(public)`, so `AuthProvider`, `LoginDrawer`, the header and the footer are not mounted there.
- **Rationale & Recommendation:** Specify where the check runs (each page, or a header set by the proxy), where the Suspense boundaries go, the exact gate URL, and the shell for `(patient)`.

### M14. Missing file entries, and globs for hand-written files - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-19`, `egm-codebase-details-r1-21`
- **Affected Scope:** lines 767-769 (items 29-31), 798 (item 42), 814 (item 49), 823 (item 55)
- **Discrepancy Description:** The `HeaderAuth` island has no file or test. Items 42 and 55 use globs, which the standard allows only for generated output. Items 29-31 say "+ test" without a file name. Loading and layout-shift behaviour for `HeaderAuth` is not stated.
- **Rationale & Recommendation:** List every file path explicitly.

### M15. Behaviour for signed-in users in the bottom nav and link interceptor is undefined - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-20`, `egm-codebase-details-r1-27`
- **Affected Scope:** lines 808 (item 43), 815 (item 50)
- **Discrepancy Description:** The interceptor has no session source for letting signed-in users through. Changing Account to `/login?next=/account` breaks the `pathname.startsWith(href)` `aria-current` logic. `mobile-bottom-nav.test.tsx` line 20 expects `/account`.
- **Rationale & Recommendation:** Specify the session source and the expected link and `aria-current` value for each state.

### M16. Dependencies are missing from the file list (radix Dialog, zod, server-only, ask-first) - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-21`, `egm-codebase-details-r1-12`, `egm-codebase-details-r1-32`
- **Affected Scope:** lines 753 (item 18), 770 (item 32), 788 (item 38)
- **Discrepancy Description:** `radix-ui` is a dependency of `packages/ui` only (`packages/ui/package.json` line 24). apps/web has neither radix nor zod, and the `server-only` package is not installed. CLAUDE.md requires asking before adding a dependency, and puts primitives in `packages/ui`.
- **Rationale & Recommendation:** Add shadcn `dialog`/`sheet` primitives to `packages/ui` and list them. Import schemas only from core. List any `package.json`/lockfile changes as an ask-first item.

### M17. `enable_confirmations` is not specified - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-22`
- **Affected Scope:** line 690 (item 1)
- **Discrepancy Description:** `[auth.email]` and `[auth.sms]` `enable_confirmations` are both false today (`config.toml` lines 232 and 271). G5, `finish_signup` and the cleanup job all assume users stay unconfirmed until they verify.
- **Rationale & Recommendation:** Specify the values and the expected `*_confirmed_at` behaviour.

### M18. `config.toml` values are missing or in the wrong format - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-23`, `egm-codebase-details-r1-8`
- **Affected Scope:** lines 692-693 (item 1), 701 (item 2). Context line 358.
- **Discrepancy Description:**
  - `[auth.sms.test_otp]` keys take no `+` prefix (`config.toml` line 278), but the plan writes `+919000000001`.
  - The SMS provider block is not named.
  - The "raised" `email_sent` quota (currently 2 per hour) has no number.
  - SMS `max_frequency` (currently 5 s, against the 30 s resend rule) has no value.
  - `sign_in_sign_ups` and `token_verifications` limits are not reviewed for e2e.
  - Template subjects and `[auth.email.template.*]` keys are not given.
- **Rationale & Recommendation:** Give the exact keys and values.

### M19. The auth e2e environment is not wired (status env names, CI secrets, Google mock) - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-24`, `egm-implementation-readiness-r1-25`, `egm-codebase-details-r1-18`
- **Affected Scope:** lines 822 (item 54), 833, 838
- **Discrepancy Description:** `supabase status -o env` prints `API_URL`, `ANON_KEY` and so on, not `NEXT_PUBLIC_SUPABASE_*`, and no mapping or `--override-name` is given. CI values for `RATE_LIMIT_HMAC_SECRET` and `CRON_SECRET` are not specified. No mechanism is given for mocking Google in front of a real local GoTrue.
- **Rationale & Recommendation:** Specify the mapping, where it runs, the test secrets and the Google mock technique.

### M20. App and GoTrue rate limits will block the e2e suite - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r1-17`
- **Affected Scope:** lines 823-836. Context line 426.
- **Discrepancy Description:** The app allows 10 sends per IP per hour, and GoTrue allows 30 per 5 minutes. Playwright runs `fullyParallel: true` against one shared database from one IP, and no reset or test-only limits are specified.
- **Rationale & Recommendation:** Specify resetting `rate_limits` between tests, test-only limits, or serial mode.

### M21. pgTAP coverage and SUPABASE.md §7 schema rules fall short - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-26`, `egm-implementation-readiness-r1-27`, `egm-codebase-details-r1-23`
- **Affected Scope:** lines 714-736 (items 5-7)
- **Discrepancy Description:**
  - `my_auth_state()` and `touch_last_seen()` have no tests.
  - `record_consent` lacks wrong-caller, anon and invalid-input tests, and `finish_signup` lacks an invalid-name test (TESTING.md §3).
  - No indexes are listed on `consents.user_id`, `audit_log.actor_id` or `user_roles.user_id`.
  - No id types or defaults, no `updated_at` exception and no `<table>_<action>_<who>` policy names are given (SUPABASE.md §7, §15).
  - The plan does not say how the tests set the role, JWT claims, aal or provider.
- **Rationale & Recommendation:** Add the missing tests, indexes and naming, and describe the JWT simulation. If that needs a helper extension, it is a new dependency.

### M22. Security-relevant code has no listed test - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-28`, `egm-implementation-readiness-r1-34`, `egm-codebase-details-r1-22`, `egm-style-r1-10` (ST rated Nit)
- **Affected Scope:** lines 754 (item 19), 753 (item 18), 764-765 (items 26-27), 782 (item 35), 809 (item 44), 862
- **Discrepancy Description:**
  - These have no tests: `updateSession`, `server.ts`, `/auth/session`, the cron route (line 431 says it is "covered by a test"), `siteUrl()` (the open-redirect defence) and the no-JS `/login`.
  - Line 862's list "9-17" includes item 16 (`index.ts`, which has no test).
  - The list leaves out items 6-7 (pgTAP) and the routes above.
- **Rationale & Recommendation:** Add the test paths, which the write allowlist needs, and fix the number list.

### M23. "Home still prerendered" has no defined check - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r1-29`, `egm-codebase-details-r1-34` (CD rated Nit)
- **Affected Scope:** lines 836, 861. Context line 413.
- **Discrepancy Description:** The plan does not say how prerendering is asserted: build output, the prerender manifest or a response header.
- **Rationale & Recommendation:** Name the assertion.

### M24. The `mapSupabaseAuthError` list misses codes that matter for enumeration and the callback - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r1-15`
- **Affected Scope:** line 745 (item 13). Context line 650.
- **Discrepancy Description:**
  - `signup_disabled` and `otp_disabled` are missing. With the `enable_signup` kill switch, new numbers fail while existing ones get a code, which leaks who has an account.
  - Also missing: `email_provider_disabled`, `phone_provider_disabled`, `provider_disabled`, `sms_send_failed`, `email_address_invalid`, `manual_linking_disabled`, `bad_code_verifier`, `flow_state_not_found` and `flow_state_expired`.
  - All are in `auth-js/src/lib/error-codes.ts`.
- **Rationale & Recommendation:** Add the codes and add enumeration tests for the kill-switch case.

### M25. Removing the stubs breaks existing tests that are not in the file list - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r1-20`, `egm-implementation-readiness-r1-35` (IR rated Nit)
- **Affected Scope:** line 816 (item 51)
- **Discrepancy Description:**
  - `footer-links.test.ts` line 17, `site-footer.test.tsx` and `e2e/patient-only.spec.ts` (which visits `/appointments` and `/account`) will fail.
  - The sitemap page silently drops the removed links.
  - The leftover `pages.*` message keys and the `StubKey` union are not addressed.
- **Rationale & Recommendation:** List each affected test and message file with the intended change.

### M26. The coverage targets need an uninstalled package and have no enforcement - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r1-28`, `egm-implementation-readiness-r1-38` (IR rated Nit)
- **Affected Scope:** line 865
- **Discrepancy Description:** No `@vitest/coverage-*` package is installed, and no thresholds config or CI enforcement is specified.
- **Rationale & Recommendation:** Add the package as an ask-first item and list the config file.

### M27. "All states" and "every error state" are not enumerated - Severity: Major

- **Reviewer Lens:** `egm-style-r1-6`
- **Affected Scope:** lines 793, 803
- **Discrepancy Description:** The reader cannot check that the plan is complete.
- **Rationale & Recommendation:** Reference the closed `AUTH_ERROR` list (item 13) and the `verifyOtp` result states (item 32), or list the states.

### M28. The drift re-review has no threshold - Severity: Major

- **Reviewer Lens:** `egm-style-r1-7`
- **Affected Scope:** line 866
- **Discrepancy Description:** "If the drift is significant" gives no measurable trigger.
- **Rationale & Recommendation:** Name a criterion, for example any drift in the migrations, actions, callback or other threat-model files. Otherwise always run the security re-review.

---

## Nits

### N1. `docs/specs/auth.md` is marked Create but already exists - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness-r1-30`, `egm-codebase-details-r1-29`, `egm-style-r1-8`
- **Affected Scope:** line 845 (item 61)
- **Rationale & Recommendation:** Change it to "(Modify) finalise".

### N2. Deleting the working artefacts is an ask-first action - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details-r1-30`
- **Affected Scope:** line 856 (item 66)
- **Rationale & Recommendation:** CLAUDE.md "Ask first" covers deleting files. Also see B3: this deletion removes the only source of the identity tests.

### N3. The cookie max age has no value - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness-r1-32`, `egm-codebase-details-r1-31`
- **Affected Scope:** line 752 (item 17)
- **Rationale & Recommendation:** `@supabase/ssr` defaults to 400 days with `httpOnly: false` (`ssr/src/utils/constants.ts`). State the number.

### N4. `signOut` and `verifyOtp` action details - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness-r1-33`, `egm-codebase-details-r1-35`
- **Affected Scope:** lines 776-777 (item 32)
- **Rationale & Recommendation:** "POST-only" is trivially true for a server action. Test instead that no GET path exists and that cookies are cleared. auth-js defaults to `scope: 'global'`, but CUJ 11 says "this device", so specify `scope: 'local'`. The `verifyOtp` action name shadows the Supabase method.

### N5. Redundant entries in turbo.json - Severity: Nit

- **Reviewer Lens:** `egm-style-r1-9`, `egm-codebase-details-r1-19` (part)
- **Affected Scope:** line 840 (item 59)
- **Rationale & Recommendation:** `SUPABASE_*` already covers `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_*` already covers both `NEXT_PUBLIC_*` names. List only `AUTH_METHODS`, `RATE_LIMIT_HMAC_SECRET`, `CRON_SECRET` and `VERCEL_ENV` (see M6).

### N6. `LoginDrawer` dynamic import from a Server Component layout - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details-r1-33`
- **Affected Scope:** line 813 (item 48)
- **Rationale & Recommendation:** `ssr: false` is not allowed in a Server Component, so a client wrapper is needed. State this.

### N7. The `.gitignore` source for `supabase/.env` - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness-r1-31`
- **Affected Scope:** line 702 (item 3)
- **Rationale & Recommendation:** The file is ignored by root `.gitignore` line 43, not by `supabase/.gitignore`. The plan could say which file.

### N8. The `supabase_auth_admin` execute grant assumes HMAC keys are available in Postgres - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness-r1-37`
- **Affected Scope:** line 707 (item 4)
- **Rationale & Recommendation:** `RATE_LIMIT_HMAC_SECRET` exists only on the app server. Mark the SMS-hook use as deferred.

### N9. `finish_signup` "source from the claim" uses the first provider - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness-r1-39`
- **Affected Scope:** line 733 (item 7). Context line 321.
- **Rationale & Recommendation:** `app_metadata.provider` is the first provider, not the method of the current sign-in. Confirm the intent, or use `amr` (see B6).

### N10. "A small illustration (no claims)" is unclear - Severity: Nit

- **Reviewer Lens:** `egm-style-r1-11`
- **Affected Scope:** line 790 (item 40)
- **Rationale & Recommendation:** Say "no medical or trust claims".

### N11. "Hindi is first-pass TODO-review" is jargon - Severity: Nit

- **Reviewer Lens:** `egm-style-r1-12`
- **Affected Scope:** line 818 (item 53)
- **Rationale & Recommendation:** Suggest "Hindi strings are a first draft, marked TODO for native review."

### N12. The `vercel.json` rationale wording - Severity: Nit

- **Reviewer Lens:** `egm-style-r1-13`
- **Affected Scope:** line 766 (item 28)
- **Rationale & Recommendation:** The claim is accurate (DEPLOYMENT.md line 35). Suggest "DEPLOYMENT.md allows a `vercel.json` when a cron is needed."

### N13. The milestone intro is wordy - Severity: Nit

- **Reviewer Lens:** `egm-style-r1-14`
- **Affected Scope:** line 674
- **Rationale & Recommendation:** Suggest "Build in seven milestones; each must pass lint, typecheck and tests before the next starts."

---

## Claims verified accurate by reviewers (no finding)

- `supabase/.env` is git-ignored (root `.gitignore` line 43).
- CLI `^3.2.0` is in root `package.json`.
- `auto_expose_new_tables`, `[auth.captcha]` and `enable_manual_linking` exist in the CLI config.
- `db:types` currently lacks `--local`.
- The `[slug]` to `[...slug]` drift is real.
- `CLIENT_NAMESPACES`, `(patient)/layout.tsx`, `mobile-bottom-nav.tsx` with its test, `stub-pages.ts`, and `packages/db/src/{server,middleware,env,client,index}.ts` with `env.test.ts` all exist.
- `getClaims`, `exchangeCodeForSession(code, { flowId })`, `linkIdentity`, `cookieOptions` on `createServerClient`, and the codes `phone_exists`, `email_exists` and `identity_already_exists` exist in the installed versions.
- DEPLOYMENT.md allows a `vercel.json` for a cron.
- The coverage targets match TESTING.md line 93.
- `concepts_brief.md` and `design_draft.md` exist at the repo root.

## Highest-leverage fixes

1. Isolate the new e2e and build checks from existing CI (B1, B2, B5, M6).
2. Write T1-T9 into the spec before item 66 deletes their source (B3).
3. Resolve the `docs/AUTH.md` and SUPABASE.md placement against CLAUDE.md line 16 (B4).
4. Close the security design gaps: step-up integrity (B6), audit writers (B7), the `audit_log` set-null exception (B8), and the config.toml mechanisms and signing keys (B9).
