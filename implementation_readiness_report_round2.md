# Goldfish Review Report: Stage 9 Implementation Readiness Test, round 2

**Target:** `/Users/masum/Desktop/acurexpress/docs/specs/auth.md` (lines 672-1054: "## Detailed Implementation Plan" to end of file, including "Identity Tests T1 to T9" and "Review Log (Stage 9, round 1)")

**Reading rule applied:** the Review Log (lines 884-1050) is normative and overrides the plan items. Round-1 findings resolved by the log are not repeated here unless the resolution itself is wrong, incomplete, contradictory or unbuildable.

**GoldfishContext:** `docs/ACureXpress_Product_Context.md`, `docs/SUPABASE.md`, `docs/TESTING.md`, `CLAUDE.md`. Round 1 is in `implementation_readiness_report.md`.

**Owner direction given to reviewers:** early development; prefer the simplest option that keeps the security properties; no new dependencies.

**Verdict:** NOT READY. All three reviewers independently returned "not ready".

- Two reviewers independently found that the auth e2e server never receives its environment. The auth e2e suite cannot run as written.
- Two reviewers independently found that the step-up resolution can be bypassed by calling the database function directly.
- One reviewer, checking the installed `@supabase/ssr`, found that the M10 "implicit" client cannot be built.

## Reviewer Status

| Reviewer                       | Status    | Raw findings                |
| ------------------------------ | --------- | --------------------------- |
| `egm-implementation-readiness` | completed | 2 Blocker, 14 Major, 7 Nit  |
| `egm-codebase-details`         | completed | 3 Blocker, 13 Major, 6 Nit  |
| `egm-style`                    | completed | 0 Blocker, 17 Major, 12 Nit |

After deduplication: **3 Blockers, 25 Majors, 14 Nits** (42 findings). Where reviewers disagreed on severity, the highest severity is kept and the disagreement is noted.

**ID key:**

- `IR` = `egm-implementation-readiness`
- `CD` = `egm-codebase-details`
- `ST` = `egm-style`

The stable ids are `<reviewer>-r2-<n>`, using each reviewer's own numbering. Round-1 Review Log entries are cited as "RL-B6", "RL-M10" and so on, to avoid confusion with milestones M1-M7.

---

## Blockers

### B1. The auth e2e webServer never loads `.env.test.local` - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness-r2-2`, `egm-codebase-details-r2-1`, `egm-style-r2-5` (ST rated Major)
- **Affected Scope:** lines 897-899 (RL-B2), 993-995 (RL-M19), 822 (item 54), 1013 (RL-M23)
- **Discrepancy Description:**
  - RL-M19 writes the local-stack env to `apps/web/.env.test.local`. RL-B2 starts the server with `pnpm build && pnpm start --port 3200`, which runs with `NODE_ENV=production`.
  - Next loads `.env.test*` only when `NODE_ENV=test` (`apps/web/node_modules/next/dist/docs/01-app/02-guides/environment-variables.md` lines 246-283).
  - The auth build therefore gets no Supabase URL or keys, no `AUTH_METHODS` and no `NEXT_PUBLIC_SITE_URL`. In CI it runs in fail-safe mode and every auth test fails. Locally it silently loads the developer's own `.env.local`, which may point at staging.
  - Round-1 B2 also raised that both suites share `apps/web/.next`, so the auth build overwrites the `NEXT_PUBLIC_*` values baked into the default build. RL-B2 does not resolve this. RL-M23 then reads `.next/prerender-manifest.json` without saying which build produced it (ST).
- **Rationale & Recommendation:**
  - In `playwright.auth.config.ts`, load the file with Node 22's built-in `process.loadEnvFile("./.env.test.local")` (no new dependency) and pass the values through `webServer.env`. The alternative is for `auth-e2e-env.sh` to export the values and `exec` Playwright. State which one.
  - Give the auth build its own dist dir, or state that the two suites never share a build.

### B2. The step-up can be bypassed with the user's own token, and the flow is still underspecified - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness-r2-1`, `egm-codebase-details-r2-3`, `egm-style-r2-7` (ST rated Major), `egm-implementation-readiness-r2-12` (Major, merged)
- **Affected Scope:** lines 909-915 (RL-B6), 919 (RL-B7), 716 (item 5), 769 (item 31), 941. Context lines 314, 324, 389, 400.
- **Discrepancy Description:**
  - No grants are given for `begin_step_up()`, `complete_step_up(p_choice)` or `touch_last_seen()`. If they are own-user definer functions callable by `authenticated`, a user holding their own access token can do either of these:
    - call `rpc('complete_step_up', {p_choice: 'second_factor'})`, which nothing verifies;
    - verify the phone code directly at GoTrue, then call `touch_last_seen` before the `verifyOtp` action runs, so `begin_step_up` is never triggered.
  - The function never rejects `confirmed_owner` for accounts that have an email or Google identity.
  - The call order of `touch_last_seen` and the 90-day check is not stated. If touch runs first, step-up never fires.
  - The following are not specified:
    - the second-factor API (`signInWithOtp({ email, shouldCreateUser: false })` plus `verifyOtp({ type: "email" })`, or OAuth);
    - which email is used;
    - the `confirmStepUp` action inputs;
    - that `/auth/callback` calls `complete_step_up`, with a test in item 56;
    - the mapping from each trigger to `second_factor` or `confirmed_owner`.
  - `profiles.step_up_required_at` is not added to item 5. The `my_auth_state()` contract (line 314, "nothing else") is not extended to return it.
  - The `avatarUrl` that `/auth/session` returns has no stated source (IR-12).
  - Item 31 (`step-up.ts` cookie) is obsolete after RL-B6 but is still listed and still mapped to M4. In line 913, "It runs after..." has an unclear subject.
- **Rationale & Recommendation:** Move the decision into the database or behind service_role. One of these:
  - (a) `complete_step_up(p_user_id, p_choice)` is service_role only and is called through `@acurexpress/db/admin` after the server has verified the factor. Add it to the permitted-uses list.
  - (b) It stays on `authenticated` and checks inside the function:
    - `confirmed_owner` only when `auth.identities` has no email or google row;
    - `second_factor` only when a fresh email or google identity sign-in is later than `step_up_required_at`;
    - `touch_last_seen` itself sets `step_up_required_at` when `last_seen_at` is more than 90 days old, instead of refreshing it.

  Then:
  - name the API calls and the callback step;
  - extend `my_auth_state()`;
  - delete item 31;
  - add pgTAP tests showing the bypass is denied.

  If the owner prefers a simpler design, record "UI-level only, bypassable with a raw token" as an accepted residual risk in the threat model.

### B3. RL-M10's `flowType: "implicit"` server client cannot be built with `@supabase/ssr` - Severity: Blocker

- **Reviewer Lens:** `egm-codebase-details-r2-2`. Merged: `egm-implementation-readiness-r2-20` (Nit) and `egm-style-r2-23` (Nit), which ask that the two client factories be named.
- **Affected Scope:** lines 965-968 (RL-M10), 753 (item 18), 837 (item 56)
- **Discrepancy Description:**
  - `createServerClient` always forces `flowType: "pkce"` after spreading the caller's options (`@supabase/ssr@0.12.7` `src/createServerClient.ts` lines 165-175).
  - Email `signInWithOtp` and `updateUser({ email })` therefore always create a PKCE verifier (auth-js `GoTrueClient.ts` lines 2297-2298, 3441-3442). That verifier overwrites the shared `-code-verifier` cookie (`helpers.ts` lines 384-407).
  - An email send followed by a Google sign-in then breaks the callback exchange. "No flow id is needed" is wrong for the installed versions.
- **Rationale & Recommendation:**
  - Drop the implicit client. Use one server client with `auth: { experimental: { appendPkceFlowIdToRedirects: true } }`, which ssr and supabase-js pass through.
  - The callback calls `exchangeCodeForSession(code, flowId ? { flowId } : undefined)` with `flowId` read from `sb_flow_id`. This depends on the RL-M11 wildcard redirects.
  - Rewrite the "missing verifier" test as "a flow id whose verifier slot is gone".
  - Name the factory in `packages/db/src/server.ts`, and say which client the Part C `updateUser` calls use.

---

## Majors

### M1. RL-N9: `amr` cannot tell phone from email - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-3`, `egm-codebase-details-r2-12`, `egm-style-r2-8`
- **Affected Scope:** line 1046 (RL-N9), 1002 (RL-M21), 733 (item 7). Context lines 321, 323.
- **Discrepancy Description:**
  - The `amr` method is `otp` for both phone and email codes (auth-js `types.ts` lines 388-404). Round-1 B6 already noted this.
  - The fallback, `app_metadata.provider`, is the account's first provider.
  - `record_consent` has no `source` rule.
  - The pgTAP claim simulation in RL-M21 sets no `amr`.
- **Rationale & Recommendation:** Give one deterministic rule inside the definer functions:
  - `oauth` maps to `google`.
  - Otherwise use the provider of the newest `auth.identities.last_sign_in_at` row, or decide from the confirmed-at columns.
  - Alternatively, declare `source` approximate.

  Apply the same rule in `record_consent`, include `amr` in the simulated claims, and add pgTAP cases.

### M2. The e2e helpers need service-role grants and test-user cleanup that the plan does not give - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-4`, `egm-codebase-details-r2-6`
- **Affected Scope:** lines 715, 1000 (RL-M20), 981 (RL-M14), 877 (T4), 881 (T8), 834. Context lines 290, 303.
- **Discrepancy Description:**
  - The grants are explicit and `auto_expose_new_tables = false`.
  - `rate_limits` has no client grants, and `profiles` grants only `authenticated`. Service role bypasses RLS but not grants.
  - The helper therefore cannot:
    - clear `rate_limits` (`rate_limit_reset` needs a specific key, and the cleanup function deletes only old windows);
    - read profile state for T4;
    - backdate `last_seen_at`.
  - A direct Postgres connection would need `pg`, which is a new dependency. The helper's import (`@supabase/supabase-js` is not an apps/web dependency) is unstated.
  - There are only five test phone numbers, and there is no user cleanup between tests or reruns.
- **Rationale & Recommendation:**
  - Write out the exact `service_role` grants per table: select on `profiles`, `user_roles` and `consents`, and update on `last_seen_at` only. Or add a definer `rate_limits_reset_all()` for service_role only, with pgTAP tests and a matrix entry.
  - `helpers.ts` imports `@acurexpress/db/admin` and deletes test users through `auth.admin.deleteUser`.
  - Say whether tests share users or recreate them.

### M3. `AUTH_TEST_LIMIT_OVERRIDE` can never take effect - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-5`, `egm-codebase-details-r2-5`, `egm-style-r2-4`
- **Affected Scope:** line 1000 (RL-M20), 898, 954 (RL-M6), 844 (item 60)
- **Discrepancy Description:**
  - The override is honoured only when `NODE_ENV !== "production"`, but the suite runs `next start`, which is production.
  - An env var applies to the whole server, not to "one dedicated test".
  - The variable is missing from the turbo env lists and from `.env.example`.
- **Rationale & Recommendation:** Simplest fix: drop the override and prove the limits with action, unit and pgTAP tests, or trip the real limit with 11 distinct emails. If the override is kept, gate it on `process.env.VERCEL !== "1"` and declare it in turbo and `.env.example`.

### M4. "Expired code" cannot be produced in e2e, and the SMS OTP expiry is unset - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-6`, `egm-codebase-details-r2-16`
- **Affected Scope:** lines 826 (item 55), 881 (T8), 957 (RL-M8). Context line 455.
- **Discrepancy Description:**
  - There is no clock control, and `auth.*` cannot be reached through PostgREST.
  - Only the email OTP expiry is set. GoTrue's SMS OTP expiry is a separate setting, so the 600 s window in RL-M8 may not hold for phone codes.
- **Rationale & Recommendation:**
  - Cover "expired" in action tests with a mocked `otp_expired`.
  - In e2e, keep "wrong code" and the race part of T8.
  - State the SMS OTP expiry key and value, and align the RL-M8 window with it.

### M5. RL-M18 still leaves round-1 config gaps open - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-7`, `egm-codebase-details-r2-14`
- **Affected Scope:** lines 988-992 (RL-M18), 690-700 (item 1). Context line 358.
- **Discrepancy Description:** Still missing:
  - The SMS provider block. Today `[auth.sms] enabled = false` and `[auth.sms.twilio] enabled = false` (`config.toml` lines 269, 300-305). Whether `test_otp` sends without an enabled provider is unverified.
  - SMS `max_frequency`, which is still 5 s against the 30 s resend rule.
  - Numbers for the raised `[auth.rate_limit]` values.
  - The `[auth.email.template.*]` subjects and `content_path` values.

  "Checked during the build" leaves the decisions to the implementer.

- **Rationale & Recommendation:** Write the exact TOML.

### M6. RL-M24 still leaks account existence when the kill switch is on - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-8`
- **Affected Scope:** lines 1014-1019 (RL-M24). Context line 650.
- **Discrepancy Description:** With `enable_signup = false`, a new destination gets `signup_disabled`, which maps to `unavailable`. An existing destination gets `code_sent`. The generic key does not hide that difference.
- **Rationale & Recommendation:** Send actions treat `signup_disabled`, `user_not_found` and `otp_disabled` as `code_sent`, and the later verify fails with `invalid_or_expired`. Add an enumeration test for this case.

### M7. The error and state lists contradict each other - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-9`, `egm-style-r2-12`
- **Affected Scope:** lines 1014-1019 (RL-M24), 1028-1033 (RL-M27), 745 (item 13)
- **Discrepancy Description:** RL-M24 maps errors to `unavailable`, `invalid_or_expired`, `rate_limited` and `try_again`. The RL-M27 states have no `try_again` but do have `network_error`, `captcha_failed`, `too_many_attempts` and `method_disabled`. It is unclear which list is authoritative.
- **Rationale & Recommendation:** Publish one canonical `AUTH_ERROR` list, one code-to-key map (each code to exactly one key) and one key-to-state table.

### M8. The prerender check (RL-M23) is non-deterministic - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-10`, `egm-codebase-details-r2-13`
- **Affected Scope:** lines 1013 (RL-M23), 838 (item 57), 836
- **Discrepancy Description:**
  - `turbo run lint typecheck test build` (`ci.yml` line 47) has no `test` → `build` dependency, so the test can skip itself vacuously or read a stale `.next` (possibly the auth build).
  - `.next` is not a turbo input, so a cached result can be replayed.
  - Item 57 lists no post-build step.
  - Conditional skipping conflicts with TESTING.md §1.3.
- **Rationale & Recommendation:** Assert it in the existing `e2e/home.spec.ts`, where the webServer has already built, by reading the manifest from disk. Or add an explicit, uncached CI step after the build.

### M9. The consent function semantics are undefined - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-11`
- **Affected Scope:** lines 733-734 (item 7). Context lines 314-323.
- **Discrepancy Description:**
  - "Idempotent" is not defined: does a repeat call do nothing or append rows?
  - The behaviour when the Terms version changes (Q12) is not stated.
  - `record_consent` accepts `terms_privacy`, which allows Terms to be recorded outside Finish sign-up, or with `granted = false`.
  - The `has_current_terms` rule (latest row wins, or any granted row) is not stated.
- **Rationale & Recommendation:**
  - Restrict `record_consent` to `marketing`.
  - Define "latest row per (user, type, version) wins".
  - Specify, row by row, what `finish_signup` does on a repeat call and on a version change.

### M10. The `(patient)` shell has no auth context, and `HeaderAuth` is still unnamed - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-13`, `egm-codebase-details-r2-9`, `egm-style-r2-20` (ST rated Nit)
- **Affected Scope:** lines 971-976 (RL-M13), 813 (item 48), 814 (item 49)
- **Discrepancy Description:**
  - `(patient)/layout.tsx` copies the `(public)` shell, but `AuthProvider`, `LoginDrawer` and the interceptor are mounted only in `(public)`. `HeaderAuth` and the Profile flows on `/account` would have no provider.
  - It is not stated whether the shell is duplicated or extracted.
  - The `HeaderAuth` file and its test are still not named (a round-1 point).
  - The URL value `step=finish` does not match the state name `needs_finish` (ST).
- **Rationale & Recommendation:**
  - Mount `AuthProvider`, `LoginDrawerLazy` and the interceptor once, in `[locale]/layout.tsx` or in a named shared shell used by both groups.
  - Name `features/auth/components/header-auth.tsx` and its test.
  - Align the step and state names, or give the mapping.

### M11. `/login` and `requirePatient` can redirect into each other forever - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-14`
- **Affected Scope:** lines 809 (item 44), 974 (RL-M13). Context line 409.
- **Discrepancy Description:**
  - `/login` redirects signed-in users to `next`.
  - `requirePatient` sends gated users to `/login?...&step=finish`.
  - If "signed-in" means "has a session", the two pages redirect into each other.
  - `/login`'s `Suspense` boundary under `cacheComponents` is also not stated.
- **Rationale & Recommendation:** `/login` redirects only when `authState() === "signed_in"`, and otherwise opens the panel at `step`. Put the check inside `<Suspense>`.

### M12. The milestone map breaks the "each milestone passes tests" rule - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-15`, `egm-codebase-details-r2-8`, `egm-style-r2-9`
- **Affected Scope:** lines 937-944 (RL-M1), 674, 684, 816 (item 51), 809-811 (items 44-46), 1020-1024 (RL-M25)
- **Discrepancy Description:**
  - Item 51 (stub removal) is in M4, but the real pages arrive in M6. Between them, `/login`, `/appointments` and `/account` return 404, and `footer-links.test.ts:17` and `patient-only.spec.ts:23-25` fail.
  - The RL-M25 test edits have no milestone.
  - `HeaderAuth` (M4) depends on `/auth/session` (item 26, M7).
  - Item 58 appears in both M1 and M7.
  - Item 32 (M4) overlaps with "Part C" (M6).
  - Obsolete item 31 is still mapped.
  - There is no fallback for item 22 when Docker is down (line 684), so M2 cannot typecheck.
- **Rationale & Recommendation:**
  - Put items 44-46, item 51 and the RL-M25 edits in one milestone.
  - Move item 26 to M4.
  - Assign the Part C actions to M6.
  - Remove the duplicate item 58 and delete item 31.
  - State that the build halts at M1 if Docker is not running.

### M13. The write allowlist is still incomplete - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness-r2-16`, `egm-style-r2-13`, `egm-style-r2-16`, `egm-codebase-details-r2-8` (part)
- **Affected Scope:** lines 977-981 (RL-M14), 1006-1012 (RL-M22), 814, 896, 949, 984, 702, 1044 (RL-N7)
- **Discrepancy Description:**
  - Test paths are still missing for:
    - `HeaderAuth` and its test;
    - `/auth/session`, `siteUrl()`, `updateSession`, the cron route and the link interceptor (RL-M15 relies on the interceptor test);
    - `email-step`, `google-button` and `turnstile-widget`.
  - Files the log introduces have no item number, no Create/Modify marker and no milestone: `admin.ts` and its test, `packages/ui` `sheet.tsx` and the ui index, `env-check.ts`, `require-patient.ts`, `proxy.test.ts`, `login-drawer-lazy.tsx`, `playwright.auth.config.ts`, the `apps/web/package.json` script, `e2e-auth/*`, `scripts/auth-e2e-env.sh`, `prerender.test.ts`, and the CLAUDE.md docs-rule edit.
  - RL-N7 says the `supabase/.gitignore` entries were "added and verified", but `supabase/.gitignore` lines 1-8 contain neither, and the file is in no list. Item 3 still credits the root `.gitignore`.
- **Rationale & Recommendation:** Add a consolidated "Addendum file list" giving every path with Create/Modify and its milestone. Change RL-N7 into an instruction.

### M14. A 30-day cookie max age cannot be set through `cookieOptions` - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r2-4`
- **Affected Scope:** line 752 (item 17), 1040 (RL-N3)
- **Discrepancy Description:** `@supabase/ssr` 0.12.7 replaces `maxAge` with the 400-day default after spreading `cookieOptions`, in both write paths (`ssr/src/cookies.ts` lines 306-310 and 620-624).
- **Rationale & Recommendation:** In the `setAll` callbacks (`server.ts`, `middleware.ts`), override `options.maxAge` with 30 days when it is greater than 0, and leave removals alone. Test this in `cookies.test.ts`.

### M15. A committed `signing_keys_path` breaks every local CLI command until a key exists - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r2-7`
- **Affected Scope:** lines 929-933 (RL-B9)
- **Discrepancy Description:**
  - CLI 3.2 fails while loading config when the configured file is missing. That breaks `db:start`, `db:reset`, `db:test`, `db:types` and `status` for every developer.
  - RL-B9 adds key generation only for CI.
  - The "if CLI 3.2 lacks this command" fallback is moot, because `supabase gen signing-key` exists.
- **Rationale & Recommendation:**
  - Add a one-time local step (`pnpm supabase gen signing-key --algorithm ES256`) to `docs/AUTH.md` and to the CLAUDE.md command notes.
  - In CI, run it with `--yes` before `supabase start` in both jobs.
  - Remove the fallback text.

### M16. The bottom nav and the interceptor have no session source (RL-M15 is incomplete) - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r2-10`, `egm-implementation-readiness-r2-19` (IR rated Nit)
- **Affected Scope:** lines 982 (RL-M15), 815 (item 50), 808 (item 43)
- **Discrepancy Description:**
  - Item 50 still changes the href to `/login?next=/account`.
  - The interceptor handles only `/login?next=` links.
  - The nav is a prerendered client component with a static href and `aria-current` logic (`mobile-bottom-nav.tsx` lines 10-31).
  - Neither component has a stated session source.
- **Rationale & Recommendation:**
  - Keep `href="/account"`, which keeps `mobile-bottom-nav.test.tsx:20` valid.
  - Expose the `/auth/session` state through `AuthProvider`.
  - When signed out, the Account tab calls `open({ next: "/account" })`. With JavaScript off, the page's own redirect applies.
  - State the `aria-current` behaviour.

### M17. RL-M9's "local/CI" and "production" conditions are undefined - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r2-11`, `egm-style-r2-14`, `egm-implementation-readiness-r2-18` (part, Nit)
- **Affected Scope:** lines 961-963 (RL-M9)
- **Discrepancy Description:**
  - `NODE_ENV` cannot be used, because e2e and CI run `next start`.
  - Preview deployments are not covered.
  - `next start` may set `x-forwarded-for` itself.
- **Rationale & Recommendation:**
  - When `process.env.VERCEL === "1"`, use the first value of `x-forwarded-for`, or `"unknown"` if it is absent.
  - Otherwise use `"local"`.
  - Add a test for each branch.

### M18. The B5 guard has no single home, and `parseAuthMethods` / `env-check.ts` have no defined contracts - Severity: Major

- **Reviewer Lens:** `egm-codebase-details-r2-15`, `egm-style-r2-6`, `egm-implementation-readiness-r2-17` (IR rated Nit)
- **Affected Scope:** lines 905-908 (RL-B5), 896 (RL-B1), 1012 (RL-M22), 744 (item 12), 780 (item 33), 783 (item 36), 747 (item 15)
- **Discrepancy Description:**
  - RL-B5 puts the guard in the pure core function `parseAuthMethods`, with no new signature. Item 12 still says "unset gives `["google"]`".
  - RL-M22 tests `env-check.ts` for "B1, B5", and item 36 still fails the build on placeholder versions. If it does, no production deploy is possible. If it does not, the B5 tests have nothing to test.
  - The variables `env-check.ts` requires are not listed.
  - Importing core into `next.config.ts` is still unverified (round-1 M5).
  - Which `LEGAL_VERSIONS` values count as placeholders is not stated.
  - The UI when the method list is empty (header Login, Account tab, `/login`) is not defined.
- **Rationale & Recommendation:**
  - `env-check.ts` checks only that the listed Supabase env is present when `VERCEL_ENV === "production"`, uses relative imports and does not import core.
  - Give `parseAuthMethods(value, { vercelEnv })`, or put the override in `config/auth-methods.ts`, and rewrite items 12 and 36 to match.
  - Define the placeholders and the empty-method UI.
  - Note in the remote checklist that the guard relies on runtime `VERCEL_ENV`.

### M19. Milestone IDs and finding IDs collide - Severity: Major

- **Reviewer Lens:** `egm-style-r2-1`
- **Affected Scope:** lines 896, 898, 947, 954, 1010, 1012, with 674-682 and 937-944
- **Discrepancy Description:** "(M6)", "from M19" and "proxy.ts (M2)" can be read as milestones or as findings.
- **Rationale & Recommendation:** Rename the milestones (for example "Phase 1-7"), or prefix the findings ("RL-M6"), and rewrite the bare references.

### M20. Superseded plan text is not marked - Severity: Major

- **Reviewer Lens:** `egm-style-r2-2`
- **Affected Scope:** lines 690-866 against 894-1050. Affected: item 1 (691-697), items 18, 20, 24, 31, 36, 38, 44, 45, 54, 55, 59, and lines 862-863 and 866.
- **Discrepancy Description:** The implementer has to cross-check about 50 log entries against 66 items to find the final instruction.
- **Rationale & Recommendation:** Tag each affected item "Superseded by RL-xx". Better, fold the resolutions into the items and keep the log as history only.

### M21. RL-B2 "the `e2e/` folder is not changed" contradicts RL-M2 and RL-M25 - Severity: Major

- **Reviewer Lens:** `egm-style-r2-3`
- **Affected Scope:** line 902 against 947 and 1020-1024
- **Discrepancy Description:** RL-M2 and RL-M25 edit `e2e/home.spec.ts`, `patient-only.spec.ts` and `footer.spec.ts`.
- **Rationale & Recommendation:** Narrow RL-B2 to "no auth specs or auth webServer are added to `playwright.config.ts` or `e2e/`".

### M22. Item 55 conflicts with the T1-T9 table and with RL-M23 - Severity: Major

- **Reviewer Lens:** `egm-style-r2-10`
- **Affected Scope:** lines 833, 836 against 870-882 and 1013
- **Discrepancy Description:**
  - Item 55 says tests 3-8 run with codes and test 9 runs in e2e. The table says T7 is manual and T9 is action and limiter tests.
  - Item 55 keeps "Home still prerendered" in e2e, while RL-M23 moves it to Vitest.
- **Rationale & Recommendation:** State that the table's "How it runs" column supersedes item 55. Align the prerender bullet with whatever M8 decides.

### M23. The Verification Plan is stale - Severity: Major

- **Reviewer Lens:** `egm-style-r2-11`
- **Affected Scope:** lines 862-863
- **Discrepancy Description:**
  - The auth suite is still run through `pnpm test:e2e` "plus the `auth` project", but RL-B2 made it the separate `test:e2e:auth`.
  - The test list still includes item 16 (no test) and item 31 (removed).
  - The tests added by RL-M2, RL-M22 and RL-M23 are omitted.
- **Rationale & Recommendation:** Rewrite both lines with the final commands and test files.

### M24. Log entries read as already done, but the plan text is unchanged - Severity: Major

- **Reviewer Lens:** `egm-style-r2-15`
- **Affected Scope:** lines 1038 (RL-N1), 1044 (RL-N7), 1050 (RL-N13), 904 (RL-B4)
- **Discrepancy Description:**
  - RL-N1 says "item 61 is Modify", but line 845 still says Create.
  - RL-N13 says the intro "is shortened", but line 674 is unchanged.
  - RL-N7 says "added and verified".
  - RL-B4 says "File list addition" for item 65, which already exists.
- **Rationale & Recommendation:** Phrase every resolution as an imperative instruction, or apply the edit to the plan text.

### M25. T1/T2: a mocked callback test cannot prove "one account" - Severity: Major

- **Reviewer Lens:** `egm-style-r2-17`, `egm-implementation-readiness-r2-22` (IR rated Nit)
- **Affected Scope:** lines 874-875
- **Discrepancy Description:** Account linking happens inside GoTrue, so a mocked exchange tests only how the app handles the result.
- **Rationale & Recommendation:** Say: "The callback unit test covers the app's handling; one-account linking is verified only by the manual checklist."

---

## Nits

### N1. `--local` on `gen types` is deprecated in CLI 3.2 - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details-r2-17`
- **Affected Scope:** line 839 (item 58), 938 (RL-M1)
- **Discrepancy Description:** The CLI 3.2 strings say "--local isn't needed (local is the default) and will be removed in v4". The round-1 premise that `db:types` may hit the remote project is therefore false. This contradicts round-1 M1; noted as a disagreement with round 1.
- **Rationale & Recommendation:** Keep the script as it is, or keep `--local` and note the deprecation warning.

### N2. The RL-M24 code list drops one code and repeats another - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details-r2-18`, `egm-style-r2-22`
- **Affected Scope:** lines 1014-1017, 745
- **Discrepancy Description:** `manual_linking_disabled` is dropped (auth-js `error-codes.ts` line 46). `over_request_rate_limit` is listed again although item 13 already has it.
- **Rationale & Recommendation:** Map `manual_linking_disabled` to `unavailable` for `connectGoogle`, and remove the duplicate.

### N3. `auth-e2e-env.sh` runs outside the Supabase workdir - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details-r2-19`
- **Affected Scope:** line 994 (RL-M19)
- **Discrepancy Description:** The script lives in `apps/web/scripts`, but the CLI and `supabase/` are at the repo root.
- **Rationale & Recommendation:** Use `pnpm -w exec supabase status -o env` (or `--workdir ../..`), and strip the quotes from the values.

### N4. turbo.json details for `test:e2e:auth` and the `NEXT_PUBLIC_*` entries - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details-r2-20`, `egm-style-r2-21`
- **Affected Scope:** lines 900, 954
- **Discrepancy Description:** The new task needs `passThroughEnv: ["CI", "PLAYWRIGHT_*", "HOME"]`, as `test:e2e` has (`turbo.json` line 43). `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are already matched by `NEXT_PUBLIC_*`.
- **Rationale & Recommendation:** Add the `passThroughEnv`, and apply the round-1 N5 reasoning consistently.

### N5. The sitemap silently loses Login, Appointments and Account - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details-r2-21`, `egm-implementation-readiness-r2-23`, `egm-style-r2-26`
- **Affected Scope:** line 816 (item 51), 1020-1026 (RL-M25)
- **Discrepancy Description:**
  - `(public)/sitemap/page.tsx` line 23 builds its list from `STUB_PAGES`.
  - `site-footer.test.tsx` and the `StubKey` union are not addressed.
  - "Accepts the real pages" is vague.
- **Rationale & Recommendation:** State the intended change for each, or say that none is needed.

### N6. Limiter details: key format, counting rule, signatures and resend cooldown - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details-r2-22`, `egm-implementation-readiness-r2-18` (part), `egm-style-r2-24`
- **Affected Scope:** lines 955-959 (RL-M7, RL-M8), 707 (item 4). Context lines 293, 426.
- **Discrepancy Description:**
  - `verify:<hmac(dest)>` puts the prefix outside the HMAC, while line 293 hashes the prefixed string.
  - `rate_limit_hit` counts every call, so the rule is "5 attempts", not "5 failures".
  - The signatures of `rate_limit_reset` and `rate_limits_cleanup` are not given, and neither is added to item 4.
  - Whether reset clears only the `verify:` key is not stated.
  - The mechanism for the 30 s resend cooldown is not named.
  - Whether the `supabase_auth_admin` grant stays after RL-N8 is not stated.
  - "Either path works" is vague.
- **Rationale & Recommendation:** Pick one key format and one wording. Give the signatures, and say which cleanup path runs in which environment.

### N7. Sync trigger no-op updates, and a null `last_seen_at` - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness-r2-21`
- **Affected Scope:** line 920 (RL-B7). Context lines 325-328.
- **Discrepancy Description:** The sync trigger can write `contact.changed` audit rows on updates that change nothing. The behaviour of `touch_last_seen` and the 90-day check when `last_seen_at` is null is not defined.
- **Rationale & Recommendation:** Add `when (old.email is distinct from new.email or old.phone is distinct from new.phone)` to the trigger, and define the null case.

### N8. Line 892 is stale session narrative - Severity: Nit

- **Reviewer Lens:** `egm-style-r2-18`
- **Affected Scope:** line 892
- **Discrepancy Description:** The text "not run in this session (paused for context)" is out of date. The handoff file it cites is in no file list.
- **Rationale & Recommendation:** Drop the line, or point it to this round-2 report.

### N9. Vague or redundant phrasing - Severity: Nit

- **Reviewer Lens:** `egm-style-r2-19`
- **Affected Scope:** lines 886, 888, 905
- **Discrepancy Description:** "None was contested" is redundant. "Will not cause problems later" is vague. "Simpler and safer than a build failure" is an unsupported comparative.
- **Rationale & Recommendation:** Drop or calibrate each one.

### N10. RL-N4 "tested as POST-only" - Severity: Nit

- **Reviewer Lens:** `egm-style-r2-25`
- **Affected Scope:** line 1041
- **Discrepancy Description:** "POST-only" is trivially true for a server action, as round 1 noted.
- **Rationale & Recommendation:** Restate it as "no GET route exists; session cookies are cleared".

### N11. "Free" and "taken" are informal - Severity: Nit

- **Reviewer Lens:** `egm-style-r2-27`
- **Affected Scope:** lines 876-879
- **Discrepancy Description:** The T table uses "free" and "taken" without defining them.
- **Rationale & Recommendation:** Define them once: "not linked to any account" and "linked to another account".

### N12. Item 63 wording, and RL-B4 has no source - Severity: Nit

- **Reviewer Lens:** `egm-style-r2-28`
- **Affected Scope:** lines 853, 904
- **Discrepancy Description:** Item 63 still calls `docs/rls-matrix.md` "the file the docs rule allows us to add". RL-B4 cites the owner's request but gives no source.
- **Rationale & Recommendation:** Reword item 63, and cite the auth task brief.

### N13. Ambiguous "during the build", no record location, Dialog file - Severity: Nit

- **Reviewer Lens:** `egm-style-r2-29`
- **Affected Scope:** lines 933, 984, 992
- **Discrepancy Description:**
  - "During the build" could mean `next build` or the implementation session.
  - Where CLI-capability outcomes are recorded is not stated.
  - "Sheet/Dialog primitives" names only `sheet.tsx`.
- **Rationale & Recommendation:** Clarify each, and pick one record location (the spec or `docs/AUTH.md`).

### N14. Reviewer-confirmed claims (no change needed, recorded for the implementer) - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details` (verification notes)
- **Affected Scope:** Review Log generally
- **Discrepancy Description:** The following were verified against the repo:
  - `supabase gen signing-key` exists in CLI 3.2.
  - `env()` on a string in a disabled provider only warns; an unset `env()` on a boolean or number is an error. This supports RL-B9's static `enabled = false`.
  - `supabase status -o env` prints `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` and `MAILPIT_URL`.
  - Every RL-M24 code exists in auth-js.
  - `radix-ui` is already a `packages/ui` dependency.
  - Bare digit keys in `[auth.sms.test_otp]` are valid TOML.
  - The root `.gitignore` `.env*` pattern already ignores `apps/web/.env.test.local` and `supabase/.env`.
- **Rationale & Recommendation:** None. Recorded here so these resolutions are not reopened.

---

## Highest-leverage fixes

1. Make the auth e2e suite actually receive its env and its own build (B1). Fold in M2 (helper grants and user cleanup), M3 (drop the override) and M4 (expired codes in action tests).
2. Close the step-up bypass with database-side or service-role checks, and specify the second-factor API (B2). Fix `source` derivation (M1) and the consent semantics (M9) in the same migration pass.
3. Replace the implicit client with `appendPkceFlowIdToRedirects` and the `sb_flow_id` callback handling (B3). Fix the 30-day `maxAge` override (M14).
4. Fold the Review Log into the plan items, or tag the superseded text. Publish one consolidated file list per milestone and fix the milestone order (M12, M13, M19-M24).
5. Write the exact `config.toml` TOML, including the local signing-key step (M5, M15).
