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
| `write_audit(...)`, `has_current_terms(uuid)`, `current_session_id()`, `step_up_needed(...)`, `set_updated_at()`, `reject_mutation()`, `consents_guard()`, `sync_contacts_from_auth()` | — | — | — | | Internal; called only inside other functions or triggers. |

## Triggers

- `sync_contacts_to_profile` on `auth.users` (after update of email, phone and their confirmations):
  copies newly confirmed values into `profiles` and audits `contact.changed`. Never raises.
- `*_append_only` / `*_no_truncate` guards on `audit_log` and `consents`; `*_set_updated_at` on
  `profiles` and `legal_versions`.
