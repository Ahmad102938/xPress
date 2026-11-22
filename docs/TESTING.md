# Testing Rules (A-CureXpress)

Required reading for every contributor and for Claude Code. **No feature, fix or database change is finished until its tests exist and pass.** Tests are written together with the code, from the first commit, not added later.

Why: this is a healthcare and payments platform. A silent bug can double-book a doctor, leak a prescription or lose money. Tests are how we prove the rules in `docs/ACureXpress_Product_Context.md` still hold after every change.

---

## 1. The rule for Claude Code

For every task, before saying it is done:

1. **Write the tests with the code.** For logic, rules and bug fixes, write the failing test first, then the code (test-first). For UI, write the tests in the same change.
2. **Run the full check** and report the real output: `pnpm lint && pnpm typecheck && pnpm test && pnpm db:test` (and `pnpm test:e2e` when a user flow changed).
3. **Never** delete, skip (`.skip`, `.only`, `xit`), loosen or comment out a test to make it pass. If a test is wrong, fix it and explain why in the summary.
4. **A bug fix starts with a test that reproduces the bug.** The fix is done when that test goes from red to green.
5. If something cannot be tested, say so and why, and add it to the "Known gaps" list at the end of your report. Do not stay silent.
6. Keep tests deterministic: no real network, no real payments, no real SMS, no dependence on the current time or random values (inject a fake clock and seeded data).

If you finish a task and there is no new or changed test file in the diff, you are probably not done. Check again.

---

## 2. What to test, by layer

| Layer | Tool | Test this | Where |
|---|---|---|---|
| Pure logic (fees, slot calculation, badge rules, formatters, validators) | Vitest | Normal cases, edge cases, invalid input, boundaries (midnight, IST vs UTC, month end, zero, max) | `*.test.ts` next to the file |
| Zod schemas and server actions | Vitest | Valid input passes, each invalid field fails with the right error, unauthorised caller is rejected | next to the file |
| React components | Vitest + Testing Library | Renders each state (loading, empty, error, success), user interaction, labels and roles, the feature-flag on and off versions | `*.test.tsx` next to the component |
| Database: tables, RLS, functions, constraints | pgTAP (`pnpm db:test`) | See section 3. Mandatory for every migration | `supabase/tests/` |
| Full user flows | Playwright | Key journeys end to end, at 360px and 1280px | `apps/<app>/e2e/` |
| Accessibility | axe via Playwright | Zero critical or serious violations on every new page | `apps/<app>/e2e/` |
| Integrations (payments, SMS, video, maps) | Vitest with mocks or provider test mode | Success, failure, timeout, duplicate webhook, bad signature | next to the adapter |

Keep most tests at the cheap layers (logic, components, database). Use Playwright for the journeys that matter most, not for every detail.

---

## 3. Database tests (mandatory with every migration)

Every migration that adds or changes a table, policy, function or constraint ships with pgTAP tests in `supabase/tests/`:

- **RLS allowed case:** the role that should have access gets it.
- **RLS denied case:** a role that must not have access is blocked (another patient, another clinic's staff, anon, delivery partner, support without grant).
- **Constraints:** one test that the rule works and one that a violation is rejected (for example, two bookings for the same doctor and overlapping time: the second fails).
- **Functions:** normal path, wrong caller role, invalid input, repeated call (idempotency).
- **Append-only tables:** UPDATE and DELETE are rejected for `audit_log`, `ledger_entries`, `doctor_status_history`, `prescription_access_log`, `webhook_events`.
- **Ledger:** entries for one transaction balance to zero.
- **Doctor status and badge:** a doctor who is not approved is never returned by the public search or bookable.

Use synthetic data created inside the test. Never use real patient data.

---

## 4. Rules that must always have tests (the critical list)

These are the rules that must never break. Any change near them needs tests for all listed cases.

- **Booking:** two patients taking the last slot (one wins, one gets "slot taken"); slot hold expiry; hold extended while payment is pending; cancellation and reschedule rules; booking an unapproved or suspended doctor is blocked.
- **Payments:** duplicate webhook does nothing; bad signature rejected; payment success and failure; refund; commission split; ledger balances.
- **Prescriptions and health data:** only the patient and the treating doctor can read; every access by anyone else is logged; support sees masked data; delivery partners see none.
- **Medicines (when the flag is on):** cannot oversell; expired batch not sellable; reservation released on timeout; prescription-required items blocked without a valid prescription.
- **Verification:** shop and pharmacy approvals are separate; licence fields and expiry are checked; an expired licence changes status.
- **Roles and auth:** every admin action is rejected for non-admins; MFA-required roles; OTP rate limit.
- **Feature flags:** with each flag off, the related UI and endpoints are absent or return a clean "not available". With it on, they work.

---

## 5. Frontend test rules

- Query by role and label (`getByRole`, `getByLabelText`), not by CSS class or test ids, unless there is no alternative. This also keeps the UI accessible.
- Every new component test covers: default, loading, empty, error, and (if relevant) the flag-off state.
- Every form test covers: valid submit, each validation error, double-click submit, and server error.
- Test in both languages where text matters (en and hi): no hard-coded strings; no missing keys.
- Every new page gets a Playwright smoke test (it loads, key content visible, no console errors) at 360px and 1280px, plus an axe scan.
- Do not test implementation details (internal state, private functions). Test what the user sees and what the function returns.

---

## 6. Test data and mocks

- Fake data lives in one place: `apps/web/src/lib/mock` for the UI and `supabase/seed.sql` plus test-local fixtures for the database. Names, phones and emails are obviously fake (for example `test.patient@example.test`, phone `9000000001`).
- Create small factory helpers (`makeDoctor()`, `makeBooking()`) with sensible defaults and overridable fields. Do not copy-paste large objects.
- Mock only at the boundary (the payment, SMS, video or maps adapter), never the code under test.
- Time: inject a clock. Money: store as integer paise. Dates: test IST and UTC boundaries.
- Payment providers: use their test mode and published test card numbers only.

---

## 7. Quality bar

- Coverage target: **80% lines and branches overall, 95% for the critical list in section 4** (booking, payments, ledger, access control). Coverage is a floor, not the goal; a test must actually assert behaviour.
- Test names say what happens: `rejects booking when the slot hold has expired`, not `test1`.
- One behaviour per test. Arrange, act, assert. No logic (loops, ifs) inside tests.
- No flaky tests. A test that fails randomly is a bug: fix it or delete it with a written reason, never retry it into passing.
- Tests must be fast. Unit and component tests run in seconds. Mark slow tests clearly.
- Snapshot tests only for small, stable output. Never snapshot large HTML.

---

## 8. Commands

| Command | Purpose |
|---|---|
| `pnpm test` | Run unit and component tests (Vitest) in every app and package (from the repo root, via turbo) |
| `pnpm test -- --coverage` | Same, with the coverage report |
| `pnpm test:e2e` | Run Playwright end to end and axe tests for every app (web, partner, admin) |
| `pnpm turbo run test --filter=@acurexpress/<name>` | Unit tests for one app or package (same with `test:e2e`) |
| `pnpm db:test` | Run the pgTAP database tests (needs local Supabase running) |
| `pnpm lint` and `pnpm typecheck` | Static checks |

CI runs all of these on every pull request and blocks the merge if any fail or if coverage drops below the target.

---

## 9. Definition of done (copy into every PR)

- [ ] New or changed behaviour has tests (unit, component, database, e2e as relevant)
- [ ] Bug fix has a regression test that failed before the fix
- [ ] Database change has allowed and denied RLS tests and constraint tests
- [ ] Critical-list rules touched have all their cases covered
- [ ] Feature-flag on and off states tested
- [ ] Accessibility scan passes on new pages
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:test` all pass, output shown
- [ ] No test skipped, loosened or deleted without a written reason
- [ ] Known gaps listed in the PR description

---

## 10. Code review (before every commit or PR)

Run a review of your own changes and fix what it finds before asking a human:

1. Run the local code review (`/coderabbit:review` if installed, otherwise Claude Code's built-in `/review`).
2. For any change touching auth, RLS, payments, uploads or health data, also run `/security-review`.
3. Fix real findings and re-run the tests. For findings you disagree with, note the reason in the PR.
4. A review does not replace tests. Passing a review is not proof the code works; passing tests is.