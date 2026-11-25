# RLS and grants matrix

Who can do what, per role. Source of truth: the migrations in `supabase/migrations/` and their pgTAP
tests in `supabase/tests/`. Update this file in the same PR as any policy or grant change
(`docs/SUPABASE.md` §8, §15). `anon` has no access to any object below.

Legend: S select, I insert, U update, D delete, X execute. "own" = rows where the user id is
`auth.uid()` (RLS policy). "—" = no grant (denied).

## Tables

| Table | anon | authenticated | service_role | Notes |
|---|---|---|---|---|
| `audit_log` | — | — | S | Append-only: UPDATE/DELETE/TRUNCATE rejected by trigger for every role. Written only by definer functions. No foreign key on `actor_id`. |
| `rate_limits` | — | — | S, D | Keys are HMAC hashes. Written only through `rate_limit_hit()`. |
| `legal_versions` | — | S (all rows) | S | Changed by migrations only. |
| `profiles` | — | S own; U own (`full_name`, `preferred_language` only) | S | Created by `finish_signup()`. Email, phone and step-up columns are server-managed. |
| `user_roles` | — | S own | S | Written only by definer functions. |
| `consents` | — | S own | S | Append-only; only `user_id -> null` on user deletion is allowed. Written only by `finish_signup()` / `record_consent()`. |
| `app_settings` | — | S (rows where `is_public`) | S | Configuration, written by migrations only (`max_dependents_per_account`, `profile_retention_days`, `recent_auth_minutes`). |
| `patient_profiles` | — | S where `id in actable_profile_ids('read')` | S | The person care is for (self or a dependent). Written only by the definer functions below. |
| `profile_access` | — | S own (`account_id = auth.uid()`) | S | Who may act for which profile. One active owner per profile; one self profile per account. Its policy uses no helper, so other policies can call the helpers without recursion. |
| `patient_addresses` | — | S where `patient_profile_id in actable_profile_ids('read')` | S | Saved addresses per patient profile. Written only by the definer functions below. |
| `account_deletion_requests` | — | S own | S | Records intent only; one open request per account. Transitions: requested -> cancelled. |

All foreign keys into `patient_profiles`, `profile_access`, `patient_addresses` and
`account_deletion_requests` use **ON DELETE RESTRICT**: deleting an auth user who has patient
profiles fails instead of erasing family data (retention TODO_HCQ).

**Catalog rule** (`supabase/tests/05_patient_profile_catalog.test.sql`): every `public` table with a
`patient_profile_id` column keeps RLS on, has a select policy calling `actable_profile_ids`, never
keys a policy on `account_id`, and gives `authenticated` no insert, update or delete grant (writes
go through definer functions). `profile_access` is the one exemption. A future module that forgets
this fails CI.

**Capabilities** (`actable_profile_ids(capability)`): `read` includes archived profiles; `manage`
and `book` exclude them; `view_records` is the self profile plus minors (under 18 by date of birth
in IST), never adult dependents, until decision D22. Staff, doctor and admin access will be
separate helpers OR-ed into future policies; these helpers grant nothing to non-patient roles.

## Functions

| Function | anon | authenticated | service_role | Other | Notes |
|---|---|---|---|---|---|
| `has_role(app_role)` | — | X | — | | Own user only; non-patient roles need `aal2`. |
| `my_auth_state()` | — | X | — | | Own user only. |
| `finish_signup(text, boolean, consent_source)` | — | X | — | | Own, confirmed user; source must match an identity. |
| `record_consent(boolean)` | — | X | — | | Marketing only, own user. |
| `touch_last_seen()` | — | X | — | | Own user; records stale sessions as pending. |
| `complete_step_up()` | — | X | — | | Current session only: Google session or phone-only account. |
| `complete_step_up_server(uuid, uuid)` | — | — | X | | Called by the server after an email code. |
| `rate_limit_hit(text, int, int)` | — | — | X | `supabase_auth_admin` X | Shared with the future Send-SMS hook. |
| `rate_limit_reset(text)` | — | — | X | | |
| `rate_limits_cleanup()` | — | — | X | pg_cron | |
| `unconfirmed_users_older_than(interval)` | — | — | X | | Read-only lookup for the cleanup job. |
| `actable_profile_ids(profile_capability)` | — | X | — | | Set-returning; used in policies (once per statement). |
| `can_act_for(uuid, profile_capability)` | — | X | — | | Single-row form. |
| `create_dependent(...)`, `update_patient_profile(...)`, `archive_dependent(uuid)`, `restore_dependent(uuid)` | — | X | — | | Caller needs an active self grant; `manage` (restore: `read` and archived). Errors P0001 with a closed key. Audited with field names only. |
| `upsert_patient_address(...)`, `delete_patient_address(uuid)`, `set_default_address(uuid)` | — | X | — | | `manage` on the address's profile. Audited. |
| `request_account_deletion()`, `cancel_account_deletion()`, `record_sign_out_everywhere()` | — | X | — | | Signed-in caller; the server checks the recent sign-in first (docs/AUTH.md). Audited. |
| `finish_signup(text, boolean, consent_source)` | — | X | — | | Redefined (same signature): also creates the self patient profile. |
| `ensure_self_profile(uuid)`, `self_profile_id(uuid)`, `active_dependent_count(uuid)`, `dependent_cap()`, `raise_profile_error(text)`, `normalise_person_name(text)`, `ist_today()`, `mirror_profile_name()` | — | — | — | | Internal. |
| `write_audit(...)`, `has_current_terms(uuid)`, `current_session_id()`, `step_up_needed(...)`, `set_updated_at()`, `reject_mutation()`, `consents_guard()`, `sync_contacts_from_auth()` | — | — | — | | Internal; called only inside other functions or triggers. |

## Triggers

- `sync_contacts_to_profile` on `auth.users` (after update of email, phone and their confirmations):
  copies newly confirmed values into `profiles` and audits `contact.changed`. Never raises.
- `*_append_only` / `*_no_truncate` guards on `audit_log` and `consents`; `*_set_updated_at` on
  `profiles`, `legal_versions` and the five signed-in-home tables.
- `profiles_mirror_name` on `profiles` (after update of `full_name`): copies a name change to the
  self patient profile (definer, depth-guarded).
