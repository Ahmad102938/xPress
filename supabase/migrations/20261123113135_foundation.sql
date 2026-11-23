-- Foundation (docs/specs/auth.md Part A, Review Logs round 1 and 2).
-- Enums, the updated_at helper, the append-only audit log, the Postgres rate limiter and the
-- current legal document versions. No personal data is stored or seeded here.
--
-- Grants are explicit: config.toml sets auto_expose_new_tables = false and every object below also
-- revokes the defaults, so behaviour never depends on that setting.
-- Every SECURITY DEFINER function sets search_path = '' and uses fully qualified names.

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------

-- Roles can only be added (enum values cannot be removed). Staff roles need aal2 (see has_role).
create type public.app_role as enum (
  'patient',
  'clinic_admin',
  'clinic_staff',
  'doctor',
  'pharmacy_staff',
  'shop_partner',
  'delivery_partner',
  'support',
  'admin'
);
comment on type public.app_role is 'Platform roles. A user may hold several. Non-patient roles require MFA (aal2) in has_role().';

create type public.consent_type as enum ('terms_privacy', 'marketing');
comment on type public.consent_type is 'Consent kinds recorded in public.consents.';

-- How a consent row was given: the sign-in method used at Finish sign-up, or the Profile toggle.
create type public.consent_source as enum ('phone', 'email', 'google', 'profile');
comment on type public.consent_source is 'Origin of a consent row: sign-in method at Finish sign-up, or profile (marketing toggle).';

-- ---------------------------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
comment on function public.set_updated_at() is 'BEFORE UPDATE trigger: stamps updated_at.';
revoke execute on function public.set_updated_at() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Append-only guard (shared by audit_log; consents has its own guard with one exception)
-- ---------------------------------------------------------------------------------------------

create function public.reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op
    using errcode = '42501';
end;
$$;
comment on function public.reject_mutation() is 'Trigger guard for append-only tables: rejects UPDATE, DELETE and TRUNCATE.';
revoke execute on function public.reject_mutation() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- audit_log (append-only, SUPABASE.md §9)
-- ---------------------------------------------------------------------------------------------

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  -- Opaque actor id with NO foreign key (R1-B8): deleting a user never touches this table.
  actor_id uuid,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  subject_type text check (subject_type is null or subject_type ~ '^[a-z_]+$'),
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
comment on table public.audit_log is 'Append-only audit trail. Written only by SECURITY DEFINER functions. Never holds personal data (ids and enum-like values only). No updated_at: rows never change.';
comment on column public.audit_log.actor_id is 'auth.users id of the actor, kept as an opaque uuid without a foreign key so user deletion never rewrites audit rows.';
comment on column public.audit_log.metadata is 'Non-personal context only, e.g. {"type":"marketing"} or {"field":"phone"}. Never contact values, codes or tokens.';

create index audit_log_actor_id_idx on public.audit_log (actor_id);
create index audit_log_created_at_idx on public.audit_log (created_at);

revoke all on table public.audit_log from public, anon, authenticated, service_role;
-- Read-only for server jobs and test helpers (R2-M9). No client role can write or change rows.
grant select on table public.audit_log to service_role;

create trigger audit_log_append_only
  before update or delete on public.audit_log
  for each row execute function public.reject_mutation();
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.reject_mutation();

-- Internal writer used by other definer functions. Not callable by any API role.
create function public.write_audit(
  p_actor_id uuid,
  p_action text,
  p_subject_type text,
  p_subject_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, subject_type, subject_id, metadata)
  values (p_actor_id, p_action, p_subject_type, p_subject_id, coalesce(p_metadata, '{}'::jsonb));
$$;
comment on function public.write_audit(uuid, text, text, uuid, jsonb) is 'Internal: appends an audit row. Called only from other SECURITY DEFINER functions; no API role may execute it.';
revoke execute on function public.write_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Rate limiter (Q4b, R2-M11)
-- ---------------------------------------------------------------------------------------------

create table public.rate_limits (
  -- HMAC-SHA256 (hex) of "ip:<addr>", "dest:<normalised>", "verify:<normalised>" or "user:<uuid>",
  -- computed on the server with RATE_LIMIT_HMAC_SECRET. Never a raw phone, email or IP.
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hits integer not null check (hits >= 0)
);
alter table public.rate_limits enable row level security;
comment on table public.rate_limits is 'Fixed-window counters keyed by an HMAC hash. A window starts at the first hit for a key. No personal data. No updated_at: window_start carries the timing.';

create index rate_limits_window_start_idx on public.rate_limits (window_start);

revoke all on table public.rate_limits from public, anon, authenticated, service_role;
-- service_role may read and clear counters (cleanup job, e2e helpers). No client grants.
grant select, delete on table public.rate_limits to service_role;

create function public.rate_limit_hit(p_key_hash text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid key' using errcode = '22023';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 604800 then
    raise exception 'invalid window' using errcode = '22023';
  end if;
  if p_max is null or p_max < 1 or p_max > 100000 then
    raise exception 'invalid max' using errcode = '22023';
  end if;

  insert into public.rate_limits as r (key_hash, window_start, hits)
  values (p_key_hash, now(), 1)
  on conflict (key_hash) do update
    set window_start = case
          when r.window_start + make_interval(secs => p_window_seconds) <= now() then now()
          else r.window_start
        end,
        hits = case
          when r.window_start + make_interval(secs => p_window_seconds) <= now() then 1
          else r.hits + 1
        end
  returning hits into v_hits;

  return v_hits <= p_max;
end;
$$;
comment on function public.rate_limit_hit(text, integer, integer) is 'Counts one hit for the key and returns true while the key is within p_max hits in its current window. Atomic.';
revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated, service_role;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

create function public.rate_limit_reset(p_key_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limits where key_hash = p_key_hash;
$$;
comment on function public.rate_limit_reset(text) is 'Clears one key. Used after a successful code send to reset that destination''s verify-attempt key only.';
revoke execute on function public.rate_limit_reset(text) from public, anon, authenticated, service_role;
grant execute on function public.rate_limit_reset(text) to service_role;

create function public.rate_limits_cleanup()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
comment on function public.rate_limits_cleanup() is 'Deletes counters whose window started more than 1 day ago. Run by pg_cron and by the daily cleanup route.';
revoke execute on function public.rate_limits_cleanup() from public, anon, authenticated, service_role;
grant execute on function public.rate_limits_cleanup() to service_role;

-- The Send-SMS hook (phone go-live, later) runs as supabase_auth_admin and shares the limiter.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.rate_limit_hit(text, integer, integer) to supabase_auth_admin;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Legal document versions (written by migrations only)
-- ---------------------------------------------------------------------------------------------

create table public.legal_versions (
  consent_type public.consent_type primary key,
  version text not null check (char_length(version) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.legal_versions enable row level security;
comment on table public.legal_versions is 'Current version of each legal document. Changed only by migrations. Must match LEGAL_VERSIONS in packages/core (checked by tests). "draft-" versions are placeholders: production hides sign-in while any is a placeholder.';

create trigger legal_versions_set_updated_at
  before update on public.legal_versions
  for each row execute function public.set_updated_at();

revoke all on table public.legal_versions from public, anon, authenticated, service_role;
grant select on table public.legal_versions to authenticated, service_role;

create policy legal_versions_select_authenticated
  on public.legal_versions
  for select
  to authenticated
  using (true);

-- TODO(HCQ): placeholder versions until HCQ supplies the real Terms and Privacy documents.
insert into public.legal_versions (consent_type, version) values
  ('terms_privacy', 'draft-2026-11'),
  ('marketing', 'draft-2026-11');

-- ---------------------------------------------------------------------------------------------
-- Scheduled cleanup (R1-M7). Skipped with a notice where pg_cron is unavailable; the daily
-- cron route calls rate_limits_cleanup() as well, so either path works.
-- ---------------------------------------------------------------------------------------------

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('rate-limits-cleanup', '17 3 * * *', 'select public.rate_limits_cleanup()');
exception
  when others then
    raise notice 'pg_cron unavailable (%); the auth-cleanup route handles rate_limits instead', sqlstate;
end;
$$;
