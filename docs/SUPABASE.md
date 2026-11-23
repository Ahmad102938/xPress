# Supabase and Database Guide (A-CureXpress)

Read this before you touch anything in `supabase/`, any SQL, any RLS policy, or any Supabase client code. This file is for new team members and for Claude Code. Product rules live in `docs/ACureXpress_Product_Context.md`; this file is how we work with the database.

Why we are strict: this is a healthcare platform. A wrong policy can expose patient data, a wrong constraint can double-book a doctor, and a wrong ledger entry loses money. The database is the last line of defence, so we put the important rules there.

---

## 1. Golden rules

1. **Local first.** You develop against your own local Supabase (Docker). You never experiment on staging or production.
2. **Schema changes only through migration files.** Never use the Studio table editor on staging or production. Never edit an existing migration. Create a new one.
3. **Remote databases are changed by CI only.** Staging and production get migrations from the pipeline, not from a laptop. Nobody runs `db push` against production by hand.
4. **Every table has RLS turned on in the same migration that creates it.** Default is deny. No exceptions, including "internal" tables.
5. **The service role key never reaches the browser.** It lives in server-side environment variables only. Never prefix it with `NEXT_PUBLIC_`.
6. **No real patient data outside production.** Local and staging use synthetic seed data only.
7. **Append-only means append-only.** Audit and ledger tables never get UPDATE or DELETE. Fix mistakes with a new reversing row.
8. **Business rules that must be atomic live in Postgres**: booking, slot hold, stock reservation, ledger writes, doctor status and badge logic. The UI is never the only enforcement.
9. **Every database change ships with tests** (allowed case and denied case for RLS; the rule and a violation for constraints).
10. **No health data in logs, analytics events, notification text or migration files.**

---

## 2. Environments

| Environment | Where | Who changes the schema | Data |
|---|---|---|---|
| Local | Docker on your machine (`supabase start`) | You, via migration files | Synthetic seed (`supabase/seed.sql`) |
| Staging | Supabase project `<STAGING_PROJECT_REF>`, Mumbai region | CI, after merge to `main` | Synthetic or anonymised test data only |
| Production | Supabase project `<PRODUCTION_PROJECT_REF>`, Mumbai region | CI, after manual approval by the project lead | Real data. Backups and PITR on |

Secrets and project refs are in the team vault. Ask the project lead for access. Do not paste keys into chat, tickets, commits or screenshots.

---

## 3. Prerequisites

- Node.js 20 or newer and pnpm.
- Docker Desktop, running.
- Supabase CLI. Install it as a project dev dependency (the CLI does not support a global `npm install -g`). It is already in `package.json`, so run commands with `pnpm supabase ...`. If you prefer a system install, use Homebrew (macOS/Linux) or Scoop (Windows).

---

## 4. First-time setup (every new team member)

**1. Clone and install**
```bash
git clone <REPO_URL>
cd acurexpress
pnpm install
```

**2. Environment variables**
```bash
cp apps/web/.env.example apps/web/.env.local   # same for apps/partner and apps/admin when you run them
```
Fill the values. For local development, `pnpm supabase status` after step 3 prints the local URL and keys. Required Supabase variables:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # anon / publishable key, safe for the browser
SUPABASE_SERVICE_ROLE_KEY=              # server only. NEVER expose to the browser
```
Other variables (payments, SMS, maps, video, AI) are listed with comments in `apps/web/.env.example` (the root `.env.example` lists every app's variables). Use test or sandbox keys only.

**3. Start local Supabase and build the database**
```bash
pnpm supabase start
pnpm supabase db reset        # replays all migrations, then runs seed.sql
pnpm supabase status          # local URLs and keys
```

**4. Generate types and run the app**
```bash
pnpm db:types                 # wraps: supabase gen types typescript --local
pnpm dev                      # all apps: web :3000, partner :3001, admin :3002
```

**5. (Optional, read-only) link to staging**
```bash
pnpm supabase login
pnpm supabase link --project-ref <STAGING_PROJECT_REF>
pnpm supabase migration list  # compare local and staging migration status
```
Do not link your laptop to production.

---

## 5. Daily workflow

After every `git pull` that contains new files in `supabase/migrations/`:
```bash
pnpm supabase migration up    # applies only the new migrations to your local DB (keeps your data)
# or, for a clean slate:
pnpm supabase db reset
pnpm db:types
```
If the types file changes, commit it in the same PR as the migration.

---

## 6. Writing a migration (SOP)

1. Create a branch.
2. Create the file:
   ```bash
   pnpm supabase migration new add_clinic_doctors
   ```
   This creates `supabase/migrations/<TIMESTAMP>_add_clinic_doctors.sql`. Do not rename it; the timestamp sets the order.
3. Write the SQL (see the rules in section 7).
4. Apply it locally from scratch to prove the whole history works:
   ```bash
   pnpm supabase db reset
   ```
5. Write or update tests in `supabase/tests/` (pgTAP) and run them:
   ```bash
   pnpm supabase test db
   pnpm supabase db lint
   ```
6. Regenerate types: `pnpm db:types`.
7. Commit the migration, tests and types together. Open a PR using the checklist in section 15.
8. CI applies it to staging after merge. The project lead approves the production run.

If you made changes in your **local** Studio while exploring, capture them as a migration with `pnpm supabase db diff -f <name>`, then review and clean the generated SQL by hand. Never commit a diff without reading it.

**An existing migration is never edited once it is on `main`.** If it was wrong, write a new migration that fixes it.

---

## 7. Migration file rules

- One concern per migration (one module or one change).
- Primary keys are `uuid` with `default gen_random_uuid()`. Timestamps are `timestamptz` (stored in UTC; the app shows IST).
- Every table has `created_at` and `updated_at` (with an updated_at trigger). Add `created_by` where an actor matters.
- Create the table, `alter table ... enable row level security`, and its policies **in the same migration**.
- Every migration that creates a table also grants the exact privileges needed to `anon`, `authenticated` or `service_role`, and nothing more (revoke the defaults first; `config.toml` sets `auto_expose_new_tables = false`).
- Index every foreign key and every column used in a policy or a frequent filter. Add the index in the same migration.
- Use enums or lookup tables for statuses. Document the allowed transitions in a comment and enforce them in a function or trigger.
- Add `comment on table` and `comment on column` for anything non-obvious, especially anything holding patient data.
- **Destructive changes use expand, then contract**: add the new column or table, backfill, switch the code, and only in a later release drop the old one. Never drop or rename a column in the same release the code stops using it.
- Make long operations safe: add indexes with `create index concurrently` where the table is large (outside a transaction block, so put it in its own migration), and avoid long locks.
- Never put real names, phone numbers, prescriptions or any patient data in a migration.

### Planned migration order (modules; the CLI adds the timestamps)
```
foundation              extensions, enums, helper functions, updated_at trigger, audit_log
identity                profiles, roles, user_roles, consents
clinics_and_doctors     clinics, doctors, clinic_doctors, verification states, status_history, agreements
availability_booking    availability rules and exceptions, slots, slot_holds, bookings, no-overlap constraint
consult_prescriptions   consultations, prescriptions, review history, prescription_access_log
shops_and_geo           shop_partners (PostGIS), hours, services, licence details, verification
catalogue_inventory     products, batches, stock_movements, reservations
orders_delivery         orders, order_items, deliveries, proof of delivery
payments_ledger         transactions, ledger_entries, settlements, refunds, webhook_events (idempotency)
notifications_support   notification_templates, notification_queue, tickets
ai_consultant           conversations, messages, share_consents, safety_events
content_reports         CMS tables if stored here, reporting views
```
Modules behind feature flags (medicine sales, online prescribing, AI consultant) still get their schema early so the model stays consistent. Their features stay off until HCQ Care clears the launch gate.

---

## 8. Row level security (RLS) SOP

Where policies live: **next to the table, in the migration that creates it** (not in one giant file). Keep `docs/rls-matrix.md` updated: a table of roles against tables showing who can select, insert, update and delete.

Rules:
1. RLS enabled on every table in `public`. Without a policy, access is denied. Good.
2. Never trust `user_metadata` for authorisation (users can edit it). Roles come from the `user_roles` table and, if we add a token hook, from `app_metadata` claims.
3. Use small helper functions such as `public.has_role(...)`, `public.is_clinic_member(...)`, `public.is_treating_doctor(...)`. Policies call the helpers, not copy-pasted subqueries.
4. `SECURITY DEFINER` functions: always `set search_path = ''`, use fully qualified names, validate inputs, check the caller's role inside, and `revoke execute ... from public, anon` then grant only to the roles that need it.
5. Views that read RLS-protected tables use `with (security_invoker = true)`.
6. Policy names follow `<table>_<action>_<who>`, for example `bookings_select_patient_own`.
7. Patient health data (prescriptions, consultation notes, AI chats, health records) is readable only by the patient and the treating doctor, plus narrow, logged pharmacy and support access. Support sees masked data. Delivery partners never see clinical data.
8. **Test every policy twice**: the role that should get in, and a role that must be denied. Tests go in `supabase/tests/`.
9. Never use the service role in a code path that serves a signed-in user's own request. Use the user's session so RLS applies. The service role is for webhooks, background jobs and admin tasks, on the server only.
10. If access behaves unexpectedly, check the policy and the table grants first. `permission denied` usually means a missing grant; `new row violates row-level security policy` means a policy check failed.

---

## 9. Append-only tables

These tables never allow UPDATE or DELETE: `audit_log`, `ledger_entries`, `doctor_status_history`, `prescription_access_log`, `webhook_events`.

How we enforce it:
- Revoke UPDATE and DELETE from `anon`, `authenticated` and `service_role` on these tables.
- Add a trigger that raises an exception on UPDATE or DELETE, as a second guard.
- Corrections are new rows (a reversing ledger entry, a new status-history row).
- Every sensitive action writes an audit row: actor, action, record, old state, new state, reason, time. Reasons are required for rejection, suspension, revocation, refunds and manual settlement changes.

---

## 10. Rules that must live in the database

| Rule | How |
|---|---|
| No double booking | Exclusion constraint using `btree_gist` on `(doctor_id, tstzrange(start, end))` for active bookings. Two patients taking the last slot: one gets a constraint error that the app turns into "slot just taken" |
| Slot hold at checkout | `slot_holds` with an expiry (default 10 minutes, extended while payment is pending). A scheduled job releases expired holds. Booking confirmation consumes the hold in one transaction |
| Stock cannot oversell | Reservation function locks the batch row (`for update`) and checks available quantity. Expired batches are never sellable |
| Money is a ledger | Double-entry `ledger_entries`; a constraint trigger checks each transaction's entries balance to zero. Dashboards read from the ledger |
| Webhooks are idempotent | Unique key on the provider event id in `webhook_events`. A repeated webhook does nothing |
| Doctor status and badge | One function or view decides "is this doctor publicly visible and bookable". Public search and booking call it. Statuses: pending, approved-registered, company-verified, rejected, suspended, expired. A doctor without an approved status can never be booked, whatever the UI shows |
| Status transitions | Booking and doctor status changes go through functions that check the allowed transition and the actor, and write status history |
| Config, not constants | Fees, commissions, cancellation rules, buffers and hold duration are rows in config tables |

---

## 11. Storage (files)

- Buckets are **private by default**. Health documents (prescriptions, reports, doctor credential scans, shop licence scans) are never in a public bucket.
- Public buckets only for public marketing images (clinic photos, product images, banners).
- Path convention for private files: `<bucket>/<owner_id>/<uuid>.<ext>` so policies can check ownership from the path.
- Access with short-lived signed URLs. Storage policies are written and tested like table policies.
- Enforce file type and size limits at upload. Uploaded files go through virus scanning before staff can open them.
- Deleting a user's file follows the retention rules (see the context file, section 14), not an ad-hoc delete.

---

## 12. Auth

- Patients: phone OTP. Staff, doctors and admins: email plus TOTP MFA, enforced for admin and verification roles.
- Roles live in `user_roles`. A person can hold several roles.
- OTP and login attempts are rate limited. Never log OTPs.
- India SMS needs DLT-registered sender and templates, sent through our SMS provider hook.

---

## 13. Types, seeds, Edge Functions, secrets

- **Types:** `pnpm db:types` writes `packages/db/src/database.types.ts` (package `@acurexpress/db`, shared by all apps). Commit it. CI fails if it is out of date. Use the generated types; no `any`.
- **Seeds:** `supabase/seed.sql` holds synthetic data only (fake clinics, doctors, shops, products). Use obviously fake names and numbers. Never copy production data down.
- **Edge Functions:** live in `supabase/functions/`. Deploy through CI. Keep them thin: webhooks, integrations, scheduled work.
- **Secrets for functions:** `pnpm supabase secrets set NAME=value` for non-production only, from your own terminal. Production secrets are set by the project lead.
- **Connection pooling:** the Supabase JS client uses HTTP and needs nothing special. If any server code connects to Postgres directly, use the pooler connection string, not the direct one.

---

## 14. Release, backup and rollback

**Release flow**
1. PR opened. CI runs: `supabase db reset`, `supabase test db`, `supabase db lint`, types-up-to-date check, lint, typecheck, app tests.
2. Merge to `main`. CI applies pending migrations to **staging** and runs smoke tests.
3. Project lead approves. CI applies the same migrations to **production**.

**Rollback**
- Migrations are forward-only. To undo a change, write a new migration. Do not delete a migration that has already run anywhere.
- For a serious data incident, restore production from a point-in-time backup (PITR). Only the project lead does this.
- Take a backup or PITR marker before any risky production migration.

**Backups**
- Production has daily backups and PITR enabled.
- Restore is rehearsed on staging at least once per quarter, and the result is recorded. The client brief requires proof that backups can be restored.

---

## 15. Pull request checklist for database changes

- [ ] New migration file created with `migration new`; no existing migration edited
- [ ] `supabase db reset` runs clean from zero
- [ ] RLS enabled on every new table; policies written; `docs/rls-matrix.md` updated
- [ ] Tests added: allowed case and denied case; constraint violation case
- [ ] Indexes added for new foreign keys and policy columns
- [ ] `SECURITY DEFINER` functions set `search_path = ''` and check the caller's role
- [ ] Append-only tables have revoked grants and a guard trigger
- [ ] No patient data or secrets in the migration or seed
- [ ] Types regenerated and committed
- [ ] Destructive change uses expand then contract
- [ ] No health data written to logs or analytics

---

## 16. Commands reference

| Command | What it does |
|---|---|
| `pnpm supabase start` | Start the local stack (needs Docker) |
| `pnpm supabase stop` | Stop the local stack |
| `pnpm supabase status` | Show local URLs and keys |
| `pnpm supabase db reset` | Wipe local DB, replay all migrations, run `seed.sql` |
| `pnpm supabase migration up` | Apply only new migrations to the local DB (keeps data) |
| `pnpm supabase migration new <name>` | Create a new empty migration file |
| `pnpm supabase migration list` | Show local and remote migration status (needs a link) |
| `pnpm supabase db diff -f <name>` | Turn local schema changes into a migration file (review it) |
| `pnpm supabase db lint` | Lint the schema and functions |
| `pnpm supabase test db` | Run the pgTAP tests in `supabase/tests/` |
| `pnpm db:types` | Regenerate TypeScript types from the local DB |
| `pnpm supabase link --project-ref <ref>` | Link to a remote project (staging only on laptops) |
| `pnpm supabase db pull` | Pull remote schema into a migration (rare; ask the lead first) |
| `pnpm supabase db push` | Apply migrations to a linked remote. **CI only. Never on production from a laptop** |
| `pnpm supabase migration repair` | Fix migration history mismatches (ask the lead first) |
| `pnpm supabase functions deploy <name>` | Deploy an Edge Function (CI only for staging and production) |

---

## 17. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `db reset` fails halfway | The newest migration has an error. Read the message, fix with a new migration if it is already on `main`, or fix the file if it is only on your branch |
| Docker or port errors on `start` | Docker is not running, or another Supabase stack is using the ports. `pnpm supabase stop`, then start again |
| Migration conflict after a merge (two files touch the same thing) | Do not edit the other person's file. Add a new migration that resolves it, and tell the author |
| `permission denied for table` | Missing grant, or you used the wrong role. Check grants and the role your code runs as |
| `new row violates row-level security policy` | A policy check failed. Check the policy and the data you are inserting; write a test that reproduces it |
| Types differ from the database | Run `pnpm db:types` and commit the result |
| `migration list` shows remote and local out of sync | Do not repair on your own. Ask the project lead |
| Query is slow | Run `explain analyze`, add a missing index in a new migration, never leave a sequential scan on a big table |

---

## 18. Rules for Claude Code and other AI agents

- Read `docs/ACureXpress_Product_Context.md` and this file before changing the database.
- Work only on the local database. Never run `db push`, `db reset`, `db pull`, `migration repair` or any destructive SQL against a linked remote project.
- Never create a table without RLS and policies in the same migration. Never write a policy without a test.
- Never use or print the service role key in client code or output. Never put secrets in files that are committed.
- Never edit an existing migration. Add a new one.
- Ask before any destructive change (drop table, drop column, data rewrite), and propose the expand-then-contract steps.
- Put atomic business rules in Postgres functions and constraints, as in section 10.
- When you finish, run `db reset`, `test db`, `db lint` and the type generation, and report the results.
