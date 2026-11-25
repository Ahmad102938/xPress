-- Patient profiles and family access (docs/specs/signed-in-home.md, Part B; item 2).
--
-- One login (auth.users + profiles, the ACCOUNT) manages many patient profiles (the PEOPLE care is for).
-- "Who a record is about" (patient_profiles) is kept apart from "who may act for them"
-- (profile_access), so a second guardian, a carer or a handover later is a data change, not a
-- migration. Every future health table keys on patient_profile_id and uses actable_profile_ids().
--
-- Additive only: no existing column is changed or dropped. finish_signup keeps its signature.
-- Foreign keys use ON DELETE RESTRICT: deleting an auth user who has patient profiles fails instead
-- of silently erasing family data (no hard delete until HCQ sets retention, TODO_HCQ).

-- ---------------------------------------------------------------------------------------------
-- app_settings: small configuration rows, written by migrations only
-- ---------------------------------------------------------------------------------------------

create table public.app_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{2,62}$'),
  int_value integer,
  text_value text check (text_value is null or char_length(text_value) <= 500),
  -- Public rows may be read by signed-in users (for example the recent sign-in window).
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
comment on table public.app_settings is 'Configuration values (config over code, Product Context §24 rule 11). Written by migrations only. No personal data.';

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

revoke all on table public.app_settings from public, anon, authenticated, service_role;
grant select on table public.app_settings to authenticated, service_role;

create policy app_settings_select_public
  on public.app_settings
  for select
  to authenticated
  using (is_public);

insert into public.app_settings (key, int_value, is_public) values
  ('max_dependents_per_account', 10, false),   -- TODO_HCQ
  ('profile_retention_days', null, false),     -- TODO_HCQ: retention for archived profiles
  ('recent_auth_minutes', 15, true);           -- TODO_HCQ: recent sign-in window

-- ---------------------------------------------------------------------------------------------
-- patient_profiles: one person who can receive care
-- ---------------------------------------------------------------------------------------------

create table public.patient_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 80),
  date_of_birth date check (date_of_birth is null or date_of_birth >= date '1900-01-01'),
  gender public.profile_gender,
  consultation_language text check (consultation_language is null or consultation_language in ('en', 'hi')),
  -- Dependents only (enforced by the write functions). Never used for sign-in.
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+[0-9]{8,15}$'),
  archived_at timestamptz,
  archived_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.patient_profiles enable row level security;
comment on table public.patient_profiles is 'A person who can receive care (self or a dependent). Personal data. Read through actable_profile_ids(); written only by definer functions.';
comment on column public.patient_profiles.full_name is 'Personal data.';
comment on column public.patient_profiles.date_of_birth is 'Personal data. Required for dependents; optional on the self profile.';
comment on column public.patient_profiles.contact_phone is 'Personal data. Optional contact number for a dependent (for example an elderly parent). Not a login.';
comment on column public.patient_profiles.archived_at is 'Set when the account holder archives a dependent. Archived profiles are hidden, kept and restorable (retention TODO_HCQ).';
comment on column public.patient_profiles.archived_by is 'auth.users id that archived the profile, kept without a foreign key (like audit_log.actor_id).';
comment on column public.patient_profiles.created_by is 'auth.users id that created the profile, kept without a foreign key.';

create trigger patient_profiles_set_updated_at
  before update on public.patient_profiles
  for each row execute function public.set_updated_at();

revoke all on table public.patient_profiles from public, anon, authenticated, service_role;
grant select on table public.patient_profiles to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- profile_access: which account may act for which patient profile
-- ---------------------------------------------------------------------------------------------

create table public.profile_access (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete restrict,
  patient_profile_id uuid not null references public.patient_profiles (id) on delete restrict,
  relationship public.profile_relationship not null,
  role public.profile_access_role not null default 'owner',
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (revoked_at is null or revoked_at >= granted_at)
);
alter table public.profile_access enable row level security;
comment on table public.profile_access is 'Access grants: account X may act for patient profile Y with this relationship. Today every profile has exactly one owner grant. Written only by definer functions.';
comment on column public.profile_access.relationship is 'Personal data (family relationship). Never copied into audit metadata.';

create index profile_access_account_id_idx on public.profile_access (account_id);
create index profile_access_patient_profile_id_idx on public.profile_access (patient_profile_id);
create index profile_access_active_account_idx on public.profile_access (account_id) where revoked_at is null;
-- One active owner per profile, and one active self profile per account.
create unique index profile_access_one_owner_idx
  on public.profile_access (patient_profile_id) where role = 'owner' and revoked_at is null;
create unique index profile_access_one_self_idx
  on public.profile_access (account_id) where relationship = 'self' and revoked_at is null;

create trigger profile_access_set_updated_at
  before update on public.profile_access
  for each row execute function public.set_updated_at();

revoke all on table public.profile_access from public, anon, authenticated, service_role;
grant select on table public.profile_access to authenticated, service_role;

-- Own grants only. No helper here, so policies on other tables can call the helpers without recursion.
create policy profile_access_select_own
  on public.profile_access
  for select
  to authenticated
  using (account_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- patient_addresses: saved addresses per patient profile
-- ---------------------------------------------------------------------------------------------

create table public.patient_addresses (
  id uuid primary key default gen_random_uuid(),
  patient_profile_id uuid not null references public.patient_profiles (id) on delete restrict,
  label text not null check (char_length(btrim(label)) between 1 and 30),
  line1 text not null check (char_length(btrim(line1)) between 2 and 120),
  line2 text check (line2 is null or char_length(line2) <= 120),
  landmark text check (landmark is null or char_length(landmark) <= 80),
  city text not null check (char_length(btrim(city)) between 2 and 60),
  state text not null check (char_length(btrim(state)) between 2 and 60),
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);
alter table public.patient_addresses enable row level security;
comment on table public.patient_addresses is 'Saved addresses of a patient profile. Personal data (not health data). Written only by definer functions.';

create index patient_addresses_patient_profile_id_idx on public.patient_addresses (patient_profile_id);
create unique index patient_addresses_one_default_idx
  on public.patient_addresses (patient_profile_id) where is_default;

create trigger patient_addresses_set_updated_at
  before update on public.patient_addresses
  for each row execute function public.set_updated_at();

revoke all on table public.patient_addresses from public, anon, authenticated, service_role;
grant select on table public.patient_addresses to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------------------------

-- The patient profiles the caller may act for with this capability. Used in policies as
-- `patient_profile_id in (select public.actable_profile_ids('read'))`, which runs once per statement.
create function public.actable_profile_ids(p_capability public.profile_capability)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select pa.patient_profile_id
  from public.profile_access pa
  join public.patient_profiles pp on pp.id = pa.patient_profile_id
  where pa.account_id = (select auth.uid())
    and pa.revoked_at is null
    and (
      p_capability = 'read'
      or (p_capability in ('manage', 'book') and pp.archived_at is null)
      or (
        p_capability = 'view_records'
        and pp.archived_at is null
        and (
          pa.relationship = 'self'
          -- Minors only (under 18 by date of birth in IST) until decision D22 covers adults.
          or (
            pp.date_of_birth is not null
            and pp.date_of_birth > ((now() at time zone 'Asia/Kolkata')::date - interval '18 years')
          )
        )
      )
    );
$$;
comment on function public.actable_profile_ids(public.profile_capability) is 'Patient profile ids the caller may act for: read (archived included), manage/book (not archived), view_records (self and minors). Policies call this; never widen it for staff roles.';
revoke execute on function public.actable_profile_ids(public.profile_capability) from public, anon, authenticated, service_role;
grant execute on function public.actable_profile_ids(public.profile_capability) to authenticated;

create function public.can_act_for(p_profile uuid, p_capability public.profile_capability)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile is not null
    and exists (select 1 from public.actable_profile_ids(p_capability) id where id = p_profile);
$$;
comment on function public.can_act_for(uuid, public.profile_capability) is 'Single-row form of actable_profile_ids() for checks inside other functions.';
revoke execute on function public.can_act_for(uuid, public.profile_capability) from public, anon, authenticated, service_role;
grant execute on function public.can_act_for(uuid, public.profile_capability) to authenticated;

create policy patient_profiles_select_actable
  on public.patient_profiles
  for select
  to authenticated
  using (id in (select public.actable_profile_ids('read')));

create policy patient_addresses_select_actable
  on public.patient_addresses
  for select
  to authenticated
  using (patient_profile_id in (select public.actable_profile_ids('read')));

-- ---------------------------------------------------------------------------------------------
-- Internal helpers (no API role may execute them)
-- ---------------------------------------------------------------------------------------------

create function public.self_profile_id(p_account uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select pa.patient_profile_id
  from public.profile_access pa
  where pa.account_id = p_account and pa.relationship = 'self' and pa.revoked_at is null
  limit 1;
$$;
comment on function public.self_profile_id(uuid) is 'Internal: the active self profile of an account, or null.';
revoke execute on function public.self_profile_id(uuid) from public, anon, authenticated, service_role;

create function public.raise_profile_error(p_key text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_key using errcode = 'P0001';
end;
$$;
comment on function public.raise_profile_error(text) is 'Internal: raises a closed error key (not_found, invalid_input, limit_reached, self_profile, adult_permission_required) with errcode P0001.';
revoke execute on function public.raise_profile_error(text) from public, anon, authenticated, service_role;

create function public.normalise_person_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
$$;
comment on function public.normalise_person_name(text) is 'Internal: trims and collapses whitespace in a person name.';
revoke execute on function public.normalise_person_name(text) from public, anon, authenticated, service_role;

create function public.ist_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;
comment on function public.ist_today() is 'Internal: today''s date in India (IST).';
revoke execute on function public.ist_today() from public, anon, authenticated, service_role;

-- Creates the self profile and owner grant for an account that has a profiles row and no self grant.
create function public.ensure_self_profile(p_account uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  if p_account is null or public.self_profile_id(p_account) is not null then
    return;
  end if;
  if not exists (select 1 from public.profiles where id = p_account) then
    return;
  end if;

  insert into public.patient_profiles (full_name, consultation_language, created_by)
  select p.full_name, p.preferred_language, p_account
  from public.profiles p
  where p.id = p_account
  returning id into v_profile_id;

  insert into public.profile_access (account_id, patient_profile_id, relationship, role)
  values (p_account, v_profile_id, 'self', 'owner');

  perform public.write_audit(
    p_account, 'patient_profile.created', 'patient_profile', v_profile_id,
    jsonb_build_object('fields', jsonb_build_array('full_name', 'consultation_language'))
  );
end;
$$;
comment on function public.ensure_self_profile(uuid) is 'Internal: idempotently creates the self patient profile and owner grant for an account that has a profiles row. Called by finish_signup and the backfill.';
revoke execute on function public.ensure_self_profile(uuid) from public, anon, authenticated, service_role;

create function public.active_dependent_count(p_account uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.profile_access pa
  join public.patient_profiles pp on pp.id = pa.patient_profile_id
  where pa.account_id = p_account
    and pa.relationship <> 'self'
    and pa.revoked_at is null
    and pp.archived_at is null;
$$;
comment on function public.active_dependent_count(uuid) is 'Internal: non-archived dependents of an account (the cap counts only these).';
revoke execute on function public.active_dependent_count(uuid) from public, anon, authenticated, service_role;

create function public.dependent_cap()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select int_value from public.app_settings where key = 'max_dependents_per_account'), 10);
$$;
comment on function public.dependent_cap() is 'Internal: max non-archived dependents per account (app_settings, TODO_HCQ).';
revoke execute on function public.dependent_cap() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Write functions (the only way to change these tables). Errors: P0001 with a closed key.
-- A profile the caller cannot act for raises not_found, never "forbidden".
-- ---------------------------------------------------------------------------------------------

create function public.create_dependent(
  p_full_name text,
  p_date_of_birth date,
  p_relationship public.profile_relationship,
  p_gender public.profile_gender default null,
  p_consultation_language text default null,
  p_contact_phone text default null,
  p_adult_permission boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := public.normalise_person_name(p_full_name);
  v_adult boolean;
  v_profile_id uuid;
  v_fields jsonb := jsonb_build_array('full_name', 'date_of_birth', 'relationship');
  v_meta jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- Only patient accounts (they hold an active self grant) may add dependents.
  if public.self_profile_id(v_uid) is null then
    perform public.raise_profile_error('not_found');
  end if;
  if char_length(v_name) not between 2 and 80
    or p_date_of_birth is null
    or p_date_of_birth < date '1900-01-01'
    or p_date_of_birth > public.ist_today()
    or p_relationship is null
    or p_relationship = 'self'
    or (p_consultation_language is not null and p_consultation_language not in ('en', 'hi'))
    or (p_contact_phone is not null and p_contact_phone !~ '^\+[0-9]{8,15}$')
  then
    perform public.raise_profile_error('invalid_input');
  end if;

  v_adult := p_date_of_birth <= (public.ist_today() - interval '18 years')::date;
  if v_adult and not coalesce(p_adult_permission, false) then
    perform public.raise_profile_error('adult_permission_required');
  end if;
  if public.active_dependent_count(v_uid) >= public.dependent_cap() then
    perform public.raise_profile_error('limit_reached');
  end if;

  insert into public.patient_profiles (full_name, date_of_birth, gender, consultation_language, contact_phone, created_by)
  values (v_name, p_date_of_birth, p_gender, p_consultation_language, p_contact_phone, v_uid)
  returning id into v_profile_id;

  insert into public.profile_access (account_id, patient_profile_id, relationship, role)
  values (v_uid, v_profile_id, p_relationship, 'owner');

  if p_gender is not null then v_fields := v_fields || '"gender"'::jsonb; end if;
  if p_consultation_language is not null then v_fields := v_fields || '"consultation_language"'::jsonb; end if;
  if p_contact_phone is not null then v_fields := v_fields || '"contact_phone"'::jsonb; end if;
  v_meta := jsonb_build_object('fields', v_fields);
  if v_adult then
    v_meta := v_meta || jsonb_build_object('adult_permission', true);
  end if;
  perform public.write_audit(v_uid, 'patient_profile.created', 'patient_profile', v_profile_id, v_meta);
  return v_profile_id;
end;
$$;
comment on function public.create_dependent(text, date, public.profile_relationship, public.profile_gender, text, text, boolean) is 'Adds a dependent patient profile and its owner grant for the calling patient account. Adults (18+) need p_adult_permission. Audited without values.';
revoke execute on function public.create_dependent(text, date, public.profile_relationship, public.profile_gender, text, text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.create_dependent(text, date, public.profile_relationship, public.profile_gender, text, text, boolean) to authenticated;

create function public.update_patient_profile(
  p_profile_id uuid,
  p_full_name text default null,
  p_date_of_birth date default null,
  p_gender public.profile_gender default null,
  p_consultation_language text default null,
  p_contact_phone text default null,
  p_clear text[] default '{}',
  p_adult_permission boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.patient_profiles%rowtype;
  v_is_self boolean;
  v_clear text[] := coalesce(p_clear, '{}');
  v_name text;
  v_new_dob date;
  v_fields jsonb := '[]'::jsonb;
  v_was_adult boolean;
  v_now_adult boolean;
  v_meta jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.can_act_for(p_profile_id, 'manage') then
    perform public.raise_profile_error('not_found');
  end if;
  select * into v_row from public.patient_profiles where id = p_profile_id;
  v_is_self := public.self_profile_id(v_uid) = p_profile_id;

  -- Only these optional fields can be cleared; a dependent always keeps a date of birth and the
  -- self profile never has a contact number (it uses the account's phone).
  if not (v_clear <@ array['date_of_birth', 'gender', 'consultation_language', 'contact_phone'])
    or ('date_of_birth' = any (v_clear) and not v_is_self)
    or (v_is_self and (p_contact_phone is not null or 'contact_phone' = any (v_clear)))
  then
    perform public.raise_profile_error('invalid_input');
  end if;

  if p_full_name is not null then
    v_name := public.normalise_person_name(p_full_name);
    if char_length(v_name) not between 2 and 80 then
      perform public.raise_profile_error('invalid_input');
    end if;
  end if;
  if (p_date_of_birth is not null and (p_date_of_birth < date '1900-01-01' or p_date_of_birth > public.ist_today()))
    or (p_consultation_language is not null and p_consultation_language not in ('en', 'hi'))
    or (p_contact_phone is not null and p_contact_phone !~ '^\+[0-9]{8,15}$')
  then
    perform public.raise_profile_error('invalid_input');
  end if;

  -- A dependent whose new date of birth makes them an adult needs the same permission as at creation.
  if not v_is_self and p_date_of_birth is not null then
    v_was_adult := v_row.date_of_birth is not null and v_row.date_of_birth <= (public.ist_today() - interval '18 years')::date;
    v_now_adult := p_date_of_birth <= (public.ist_today() - interval '18 years')::date;
    if v_now_adult and not v_was_adult and not coalesce(p_adult_permission, false) then
      perform public.raise_profile_error('adult_permission_required');
    end if;
  end if;

  v_new_dob := case when 'date_of_birth' = any (v_clear) then null else coalesce(p_date_of_birth, v_row.date_of_birth) end;

  update public.patient_profiles set
    full_name = coalesce(v_name, full_name),
    date_of_birth = v_new_dob,
    gender = case when 'gender' = any (v_clear) then null else coalesce(p_gender, gender) end,
    consultation_language = case when 'consultation_language' = any (v_clear) then null else coalesce(p_consultation_language, consultation_language) end,
    contact_phone = case when 'contact_phone' = any (v_clear) then null else coalesce(p_contact_phone, contact_phone) end
  where id = p_profile_id;

  if v_name is not null then v_fields := v_fields || '"full_name"'::jsonb; end if;
  if p_date_of_birth is not null or 'date_of_birth' = any (v_clear) then v_fields := v_fields || '"date_of_birth"'::jsonb; end if;
  if p_gender is not null or 'gender' = any (v_clear) then v_fields := v_fields || '"gender"'::jsonb; end if;
  if p_consultation_language is not null or 'consultation_language' = any (v_clear) then v_fields := v_fields || '"consultation_language"'::jsonb; end if;
  if p_contact_phone is not null or 'contact_phone' = any (v_clear) then v_fields := v_fields || '"contact_phone"'::jsonb; end if;

  -- The header and my_auth_state still read profiles.full_name: keep it in step for the self profile.
  if v_is_self and v_name is not null then
    update public.profiles set full_name = v_name where id = v_uid and full_name is distinct from v_name;
  end if;

  v_meta := jsonb_build_object('fields', v_fields);
  if coalesce(v_now_adult, false) and not coalesce(v_was_adult, true) then
    v_meta := v_meta || jsonb_build_object('adult_permission', true);
  end if;
  perform public.write_audit(v_uid, 'patient_profile.updated', 'patient_profile', p_profile_id, v_meta);
end;
$$;
comment on function public.update_patient_profile(uuid, text, date, public.profile_gender, text, text, text[], boolean) is 'Updates a patient profile the caller may manage. Null means unchanged; p_clear names optional fields to clear. Audited with field names only.';
revoke execute on function public.update_patient_profile(uuid, text, date, public.profile_gender, text, text, text[], boolean) from public, anon, authenticated, service_role;
grant execute on function public.update_patient_profile(uuid, text, date, public.profile_gender, text, text, text[], boolean) to authenticated;

create function public.archive_dependent(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.can_act_for(p_profile_id, 'manage') then
    perform public.raise_profile_error('not_found');
  end if;
  if public.self_profile_id(v_uid) = p_profile_id then
    perform public.raise_profile_error('self_profile');
  end if;
  update public.patient_profiles set archived_at = now(), archived_by = v_uid where id = p_profile_id;
  perform public.write_audit(v_uid, 'patient_profile.archived', 'patient_profile', p_profile_id, jsonb_build_object('fields', jsonb_build_array('archived_at')));
end;
$$;
comment on function public.archive_dependent(uuid) is 'Archives (hides, keeps) a dependent. The self profile can never be archived.';
revoke execute on function public.archive_dependent(uuid) from public, anon, authenticated, service_role;
grant execute on function public.archive_dependent(uuid) to authenticated;

create function public.restore_dependent(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.can_act_for(p_profile_id, 'read')
    or not exists (select 1 from public.patient_profiles where id = p_profile_id and archived_at is not null)
  then
    perform public.raise_profile_error('not_found');
  end if;
  if public.active_dependent_count(v_uid) >= public.dependent_cap() then
    perform public.raise_profile_error('limit_reached');
  end if;
  update public.patient_profiles set archived_at = null, archived_by = null where id = p_profile_id;
  perform public.write_audit(v_uid, 'patient_profile.restored', 'patient_profile', p_profile_id, jsonb_build_object('fields', jsonb_build_array('archived_at')));
end;
$$;
comment on function public.restore_dependent(uuid) is 'Restores an archived dependent, checking the dependent cap again.';
revoke execute on function public.restore_dependent(uuid) from public, anon, authenticated, service_role;
grant execute on function public.restore_dependent(uuid) to authenticated;

create function public.upsert_patient_address(
  p_profile_id uuid,
  p_label text,
  p_line1 text,
  p_city text,
  p_state text,
  p_pincode text,
  p_address_id uuid default null,
  p_line2 text default null,
  p_landmark text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_clear text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_clear text[] := coalesce(p_clear, '{}');
  v_id uuid;
  v_is_first boolean;
  v_action text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.can_act_for(p_profile_id, 'manage') then
    perform public.raise_profile_error('not_found');
  end if;
  if not (v_clear <@ array['line2', 'landmark', 'latitude', 'longitude'])
    or (('latitude' = any (v_clear)) <> ('longitude' = any (v_clear)))
    or ((p_latitude is null) <> (p_longitude is null))
    or char_length(btrim(coalesce(p_label, ''))) not between 1 and 30
    or char_length(btrim(coalesce(p_line1, ''))) not between 2 and 120
    or char_length(btrim(coalesce(p_city, ''))) not between 2 and 60
    or char_length(btrim(coalesce(p_state, ''))) not between 2 and 60
    or coalesce(p_pincode, '') !~ '^[1-9][0-9]{5}$'
    or (p_line2 is not null and char_length(p_line2) > 120)
    or (p_landmark is not null and char_length(p_landmark) > 80)
    or (p_latitude is not null and p_latitude not between -90 and 90)
    or (p_longitude is not null and p_longitude not between -180 and 180)
  then
    perform public.raise_profile_error('invalid_input');
  end if;

  if p_address_id is null then
    v_is_first := not exists (select 1 from public.patient_addresses where patient_profile_id = p_profile_id);
    insert into public.patient_addresses (patient_profile_id, label, line1, line2, landmark, city, state, pincode, latitude, longitude, is_default)
    values (p_profile_id, btrim(p_label), btrim(p_line1), p_line2, p_landmark, btrim(p_city), btrim(p_state), p_pincode, p_latitude, p_longitude, v_is_first)
    returning id into v_id;
    v_action := 'patient_address.created';
  else
    update public.patient_addresses set
      label = btrim(p_label),
      line1 = btrim(p_line1),
      line2 = case when 'line2' = any (v_clear) then null else coalesce(p_line2, line2) end,
      landmark = case when 'landmark' = any (v_clear) then null else coalesce(p_landmark, landmark) end,
      city = btrim(p_city),
      state = btrim(p_state),
      pincode = p_pincode,
      latitude = case when 'latitude' = any (v_clear) then null else coalesce(p_latitude, latitude) end,
      longitude = case when 'longitude' = any (v_clear) then null else coalesce(p_longitude, longitude) end
    where id = p_address_id and patient_profile_id = p_profile_id
    returning id into v_id;
    if v_id is null then
      perform public.raise_profile_error('not_found');
    end if;
    v_action := 'patient_address.updated';
  end if;

  perform public.write_audit(v_uid, v_action, 'patient_address', v_id,
    jsonb_build_object('fields', jsonb_build_array('label', 'line1', 'city', 'state', 'pincode')));
  return v_id;
end;
$$;
comment on function public.upsert_patient_address(uuid, text, text, text, text, text, uuid, text, text, double precision, double precision, text[]) is 'Adds or edits an address of a patient profile the caller may manage. The first address becomes the default.';
revoke execute on function public.upsert_patient_address(uuid, text, text, text, text, text, uuid, text, text, double precision, double precision, text[]) from public, anon, authenticated, service_role;
grant execute on function public.upsert_patient_address(uuid, text, text, text, text, text, uuid, text, text, double precision, double precision, text[]) to authenticated;

create function public.delete_patient_address(p_address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.patient_addresses%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_row from public.patient_addresses where id = p_address_id;
  if v_row.id is null or not public.can_act_for(v_row.patient_profile_id, 'manage') then
    perform public.raise_profile_error('not_found');
  end if;
  delete from public.patient_addresses where id = p_address_id;
  -- Keep one default when addresses remain: promote the most recently updated one.
  if v_row.is_default then
    update public.patient_addresses set is_default = true
    where id = (
      select id from public.patient_addresses
      where patient_profile_id = v_row.patient_profile_id
      order by updated_at desc limit 1
    );
  end if;
  perform public.write_audit(v_uid, 'patient_address.deleted', 'patient_address', p_address_id, jsonb_build_object('fields', '[]'::jsonb));
end;
$$;
comment on function public.delete_patient_address(uuid) is 'Deletes an address of a patient profile the caller may manage (addresses are not health data).';
revoke execute on function public.delete_patient_address(uuid) from public, anon, authenticated, service_role;
grant execute on function public.delete_patient_address(uuid) to authenticated;

create function public.set_default_address(p_address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select patient_profile_id into v_profile from public.patient_addresses where id = p_address_id;
  if v_profile is null or not public.can_act_for(v_profile, 'manage') then
    perform public.raise_profile_error('not_found');
  end if;
  update public.patient_addresses set is_default = false where patient_profile_id = v_profile and is_default and id <> p_address_id;
  update public.patient_addresses set is_default = true where id = p_address_id;
  perform public.write_audit(v_uid, 'patient_address.updated', 'patient_address', p_address_id, jsonb_build_object('fields', jsonb_build_array('is_default')));
end;
$$;
comment on function public.set_default_address(uuid) is 'Makes an address the default for its patient profile.';
revoke execute on function public.set_default_address(uuid) from public, anon, authenticated, service_role;
grant execute on function public.set_default_address(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- profiles.full_name stays the mirror the deployed code reads; keep the self profile in step.
-- ---------------------------------------------------------------------------------------------

create function public.mirror_profile_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.full_name is distinct from old.full_name then
    update public.patient_profiles pp
    set full_name = new.full_name
    where pp.id = public.self_profile_id(new.id)
      and pp.full_name is distinct from new.full_name;
  end if;
  return new;
end;
$$;
comment on function public.mirror_profile_name() is 'Trigger: copies a profiles.full_name change (the deployed /account name update) to the self patient profile.';
revoke execute on function public.mirror_profile_name() from public, anon, authenticated, service_role;

create trigger profiles_mirror_name
  after update of full_name on public.profiles
  for each row execute function public.mirror_profile_name();

-- ---------------------------------------------------------------------------------------------
-- finish_signup: same signature and body as the identity migration, plus the self profile.
-- ---------------------------------------------------------------------------------------------

create or replace function public.finish_signup(p_full_name text, p_marketing boolean, p_source public.consent_source)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_user auth.users%rowtype;
  v_name text;
  v_terms_version text;
  v_marketing_version text;
  v_avatar text;
  v_roles_added integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_source is null or p_source = 'profile' then
    raise exception 'invalid source' using errcode = '22023';
  end if;
  if p_marketing is null then
    raise exception 'invalid marketing choice' using errcode = '22023';
  end if;

  v_name := btrim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'invalid name' using errcode = '22023';
  end if;

  select * into v_user from auth.users where id = v_uid;
  if v_user.id is null or (v_user.email_confirmed_at is null and v_user.phone_confirmed_at is null) then
    raise exception 'identity not confirmed' using errcode = '42501';
  end if;

  -- The source must be a method this user actually has (R2-M2).
  if not exists (
    select 1 from auth.identities i
    where i.user_id = v_uid and i.provider = p_source::text
  ) then
    raise exception 'source does not match an identity' using errcode = '22023';
  end if;

  -- Repeat call with the current Terms already recorded: nothing to do (R2-M19), except repairing
  -- a missing self profile (signed-in-home spec, item 2).
  if public.has_current_terms(v_uid) then
    perform public.ensure_self_profile(v_uid);
    return;
  end if;

  select version into v_terms_version from public.legal_versions where consent_type = 'terms_privacy';
  select version into v_marketing_version from public.legal_versions where consent_type = 'marketing';
  if v_terms_version is null or v_marketing_version is null then
    raise exception 'legal versions missing' using errcode = 'P0001';
  end if;

  v_avatar := v_user.raw_user_meta_data ->> 'avatar_url';
  if v_avatar is not null and v_avatar !~ '^https://' then
    v_avatar := null;
  end if;

  insert into public.profiles (id, full_name, email, phone, avatar_url, last_seen_at)
  values (
    v_uid,
    v_name,
    case when v_user.email_confirmed_at is not null then v_user.email end,
    case
      when v_user.phone_confirmed_at is not null and coalesce(v_user.phone, '') <> ''
        then '+' || ltrim(v_user.phone, '+')
    end,
    v_avatar,
    now()
  )
  on conflict (id) do update set full_name = excluded.full_name;

  perform public.ensure_self_profile(v_uid);

  insert into public.user_roles (user_id, role)
  values (v_uid, 'patient')
  on conflict do nothing;
  get diagnostics v_roles_added = row_count;
  if v_roles_added > 0 then
    perform public.write_audit(v_uid, 'role.granted', 'user', v_uid, jsonb_build_object('role', 'patient'));
  end if;

  insert into public.consents (user_id, consent_type, document_version, granted, source)
  values
    (v_uid, 'terms_privacy', v_terms_version, true, p_source),
    (v_uid, 'marketing', v_marketing_version, p_marketing, p_source);

  perform public.write_audit(v_uid, 'consent.recorded', 'user', v_uid, jsonb_build_object('type', 'terms_privacy'));
  perform public.write_audit(v_uid, 'consent.recorded', 'user', v_uid, jsonb_build_object('type', 'marketing'));
end;
$$;
comment on function public.finish_signup(text, boolean, public.consent_source) is 'Finish sign-up for the calling, confirmed user: profile, self patient profile, patient role, Terms and marketing consent at the current versions, audit rows. Repeat calls with current Terms only repair a missing self profile.';
revoke execute on function public.finish_signup(text, boolean, public.consent_source) from public, anon, authenticated, service_role;
grant execute on function public.finish_signup(text, boolean, public.consent_source) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Backfill: a self profile for every existing account (copies from profiles, never auth.users,
-- so partner and admin staff without a profiles row get nothing). Safe to run twice.
-- ---------------------------------------------------------------------------------------------

select public.ensure_self_profile(p.id) from public.profiles p;
