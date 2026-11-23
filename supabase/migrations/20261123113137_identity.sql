-- Identity slice (docs/specs/auth.md Part A, Review Logs round 1 and 2).
-- profiles, user_roles and consents with RLS and explicit grants, the role helper, the
-- Finish sign-up gate functions, the session-bound step-up (R2-B1), the contact sync trigger on
-- auth.users (Q8, never raises) and the read-only lookup for the cleanup job.
-- No personal data is stored in migrations or audit metadata.

-- ---------------------------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 80),
  -- Copied from auth.users only once confirmed (finish_signup, sync_contacts_from_auth).
  email text,
  phone text check (phone is null or phone ~ '^\+[0-9]{8,15}$'),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'hi')),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  -- Last activity, for the 90-day step-up (Q13). Null means never stale.
  last_seen_at timestamptz,
  -- auth session id that last passed step-up (R2-B1). Server-managed; no client may write it.
  step_up_cleared_session uuid,
  -- Sessions found stale and not yet cleared. Sticky: activity in another session (for example the
  -- real owner returning) never clears a session that is already pending. Server-managed.
  step_up_pending_sessions uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
comment on table public.profiles is 'Patient profile, created at Finish sign-up by finish_signup(). Holds personal data (name, confirmed email and phone).';
comment on column public.profiles.email is 'Confirmed email copied from auth.users. Personal data.';
comment on column public.profiles.phone is 'Confirmed phone in +<digits> form copied from auth.users. Personal data.';
comment on column public.profiles.step_up_cleared_session is 'auth.sessions id that last completed the 90-day step-up. Written only by the step-up functions.';
comment on column public.profiles.step_up_pending_sessions is 'auth.sessions ids found stale (Q13) and not yet cleared. Written only by touch_last_seen() and the step-up functions.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

revoke all on table public.profiles from public, anon, authenticated, service_role;
grant select on table public.profiles to authenticated, service_role;
grant update (full_name, preferred_language) on table public.profiles to authenticated;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------------------------

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;
comment on table public.user_roles is 'Roles held by a user. Written only by SECURITY DEFINER functions (finish_signup now, admin functions later). No updated_at: rows are inserted or deleted, never changed.';

revoke all on table public.user_roles from public, anon, authenticated, service_role;
grant select on table public.user_roles to authenticated, service_role;

create policy user_roles_select_own
  on public.user_roles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------------------------
-- consents (append-only, Q9 exception for user deletion)
-- ---------------------------------------------------------------------------------------------

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  -- Set to null when the user is deleted, so the proof of consent survives erasure (Q9).
  user_id uuid references auth.users (id) on delete set null,
  consent_type public.consent_type not null,
  document_version text not null check (char_length(document_version) between 1 and 64),
  granted boolean not null,
  source public.consent_source not null,
  created_at timestamptz not null default now()
);
alter table public.consents enable row level security;
comment on table public.consents is 'Append-only consent evidence. Written only by finish_signup() and record_consent(). Version comes from legal_versions, never from the caller. No updated_at: rows never change except user_id -> null on user deletion.';

create index consents_user_type_created_idx on public.consents (user_id, consent_type, created_at desc);

revoke all on table public.consents from public, anon, authenticated, service_role;
grant select on table public.consents to authenticated, service_role;

create policy consents_select_own
  on public.consents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.consents_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- The only allowed change: the foreign key action setting user_id to null on user deletion.
  if tg_op = 'UPDATE'
     and old.user_id is not null
     and new.user_id is null
     and new.id = old.id
     and new.consent_type = old.consent_type
     and new.document_version = old.document_version
     and new.granted = old.granted
     and new.source = old.source
     and new.created_at = old.created_at then
    return new;
  end if;
  raise exception 'consents is append-only: % is not allowed', tg_op using errcode = '42501';
end;
$$;
comment on function public.consents_guard() is 'Append-only guard for consents. Allows only user_id -> null (user deletion, Q9).';
revoke execute on function public.consents_guard() from public, anon, authenticated, service_role;

create trigger consents_append_only
  before update or delete on public.consents
  for each row execute function public.consents_guard();
create trigger consents_no_truncate
  before truncate on public.consents
  for each statement execute function public.reject_mutation();

-- ---------------------------------------------------------------------------------------------
-- has_role: the only way policies and functions check roles (Q3)
-- ---------------------------------------------------------------------------------------------

create function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role = p_role
    )
    and (
      p_role = 'patient'
      or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    );
$$;
comment on function public.has_role(public.app_role) is 'True when the calling user holds the role. Any role other than patient also requires an aal2 (MFA) session. Takes no user id.';
revoke execute on function public.has_role(public.app_role) from public, anon, authenticated, service_role;
grant execute on function public.has_role(public.app_role) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Internal helpers (no API role may execute them)
-- ---------------------------------------------------------------------------------------------

-- Current session id from the JWT (null when absent or malformed).
create function public.current_session_id()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_raw text := (select auth.jwt() ->> 'session_id');
begin
  if v_raw is null or v_raw !~ '^[0-9a-fA-F-]{36}$' then
    return null;
  end if;
  return v_raw::uuid;
end;
$$;
comment on function public.current_session_id() is 'Internal: the session_id claim of the current JWT, or null.';
revoke execute on function public.current_session_id() from public, anon, authenticated, service_role;

-- 90-day step-up rule (Q13, R2-B1): stale activity and this session not yet cleared.
create function public.step_up_needed(p_last_seen_at timestamptz, p_cleared uuid, p_session uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_last_seen_at is not null
     and p_last_seen_at < now() - interval '90 days'
     and p_cleared is distinct from p_session;
$$;
comment on function public.step_up_needed(timestamptz, uuid, uuid) is 'Internal: true when last activity is older than 90 days and this session has not passed step-up. Null last_seen_at is never stale.';
revoke execute on function public.step_up_needed(timestamptz, uuid, uuid) from public, anon, authenticated, service_role;

-- True when the current terms_privacy version has a granted row for the user.
create function public.has_current_terms(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.consents c
    join public.legal_versions lv
      on lv.consent_type = c.consent_type
     and lv.version = c.document_version
    where c.user_id = p_user_id
      and c.consent_type = 'terms_privacy'
      and c.granted
  );
$$;
comment on function public.has_current_terms(uuid) is 'Internal: a granted terms_privacy consent exists at the current legal_versions version.';
revoke execute on function public.has_current_terms(uuid) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- my_auth_state: everything the gate needs, for the calling user only
-- ---------------------------------------------------------------------------------------------

create function public.my_auth_state()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  return json_build_object(
    'has_profile', v_profile.id is not null,
    'has_current_terms', public.has_current_terms(v_uid),
    'full_name', v_profile.full_name,
    'last_seen_at', v_profile.last_seen_at,
    'needs_step_up', coalesce(
      public.current_session_id() = any (v_profile.step_up_pending_sessions)
      or public.step_up_needed(v_profile.last_seen_at, v_profile.step_up_cleared_session, public.current_session_id()),
      false
    )
  );
end;
$$;
comment on function public.my_auth_state() is 'Gate state for the calling user: has_profile, has_current_terms, full_name, last_seen_at, needs_step_up. Nothing else.';
revoke execute on function public.my_auth_state() from public, anon, authenticated, service_role;
grant execute on function public.my_auth_state() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- finish_signup: profile + patient role + consents + audit, in one transaction (Q2, R2-M2, R2-M19)
-- ---------------------------------------------------------------------------------------------

create function public.finish_signup(p_full_name text, p_marketing boolean, p_source public.consent_source)
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

  -- Repeat call with the current Terms already recorded: nothing to do (R2-M19).
  if public.has_current_terms(v_uid) then
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
comment on function public.finish_signup(text, boolean, public.consent_source) is 'Finish sign-up for the calling, confirmed user: profile, patient role, Terms and marketing consent at the current versions, audit rows. Repeat calls with current Terms do nothing.';
revoke execute on function public.finish_signup(text, boolean, public.consent_source) from public, anon, authenticated, service_role;
grant execute on function public.finish_signup(text, boolean, public.consent_source) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- record_consent: Profile marketing toggle only (R2-M19)
-- ---------------------------------------------------------------------------------------------

create function public.record_consent(p_granted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_version text;
  v_latest boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_granted is null then
    raise exception 'invalid choice' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) or not public.has_current_terms(v_uid) then
    raise exception 'finish sign-up first' using errcode = '42501';
  end if;

  select c.granted into v_latest
  from public.consents c
  where c.user_id = v_uid and c.consent_type = 'marketing'
  order by c.created_at desc, c.id desc
  limit 1;

  if v_latest is not distinct from p_granted then
    return;
  end if;

  select version into v_version from public.legal_versions where consent_type = 'marketing';

  insert into public.consents (user_id, consent_type, document_version, granted, source)
  values (v_uid, 'marketing', v_version, p_granted, 'profile');

  perform public.write_audit(v_uid, 'consent.recorded', 'user', v_uid, jsonb_build_object('type', 'marketing'));
end;
$$;
comment on function public.record_consent(boolean) is 'Records a marketing choice for the calling user at the current version, only when it differs from the latest one.';
revoke execute on function public.record_consent(boolean) from public, anon, authenticated, service_role;
grant execute on function public.record_consent(boolean) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- touch_last_seen: activity stamp, frozen while step-up is pending (R2-B1)
-- ---------------------------------------------------------------------------------------------

create function public.touch_last_seen()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sid uuid := public.current_session_id();
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if v_profile.id is null then
    return null;
  end if;

  -- Stale session: record it as pending (sticky), drop ids of sessions that no longer exist,
  -- and keep last_seen_at unchanged as evidence.
  if v_sid is not null and (
    v_sid = any (v_profile.step_up_pending_sessions)
    or public.step_up_needed(v_profile.last_seen_at, v_profile.step_up_cleared_session, v_sid)
  ) then
    update public.profiles
    set step_up_pending_sessions = array(
      select distinct x
      from unnest(array_append(v_profile.step_up_pending_sessions, v_sid)) as x
      where exists (select 1 from auth.sessions s where s.id = x and s.user_id = v_uid)
    )
    where id = v_uid;
    return v_profile.last_seen_at;
  end if;

  if v_profile.last_seen_at is null or v_profile.last_seen_at < now() - interval '1 day' then
    update public.profiles set last_seen_at = now() where id = v_uid;
  end if;

  return v_profile.last_seen_at;
end;
$$;
comment on function public.touch_last_seen() is 'Called first by the gate. If this session is stale or already pending, records it as pending and leaves last_seen_at unchanged; otherwise stamps last_seen_at at most once a day. Returns the previous value.';
revoke execute on function public.touch_last_seen() from public, anon, authenticated, service_role;
grant execute on function public.touch_last_seen() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- complete_step_up: clears step-up for THIS session only (R2-B1)
-- ---------------------------------------------------------------------------------------------

create function public.complete_step_up()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_sid uuid := public.current_session_id();
  v_profile public.profiles%rowtype;
  v_session_created timestamptz;
  v_via text;
begin
  if v_uid is null or v_sid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.id is null then
    raise exception 'finish sign-up first' using errcode = '42501';
  end if;

  if not (v_sid = any (v_profile.step_up_pending_sessions)
          or public.step_up_needed(v_profile.last_seen_at, v_profile.step_up_cleared_session, v_sid)) then
    return;
  end if;

  select s.created_at into v_session_created
  from auth.sessions s
  where s.id = v_sid and s.user_id = v_uid;
  if v_session_created is null then
    raise exception 'session not found' using errcode = '42501';
  end if;

  -- Note (OQ7, checked locally 2026-11-23): GoTrue records 'otp' for both phone and email codes
  -- and never updates auth.identities.last_sign_in_at after creation, so an email-code session
  -- cannot be recognised here. Email second factors go through complete_step_up_server().
  if exists (
    -- (a) This session was created by Google (amr method 'oauth') on an account with Google.
    select 1 from auth.mfa_amr_claims m
    where m.session_id = v_sid and m.authentication_method = 'oauth'
  ) and exists (
    select 1 from auth.identities i where i.user_id = v_uid and i.provider = 'google'
  ) then
    v_via := 'google_sign_in';
  elsif not exists (
    -- (b) Phone-only account: the "Yes, this is my account" choice.
    select 1 from auth.identities i where i.user_id = v_uid and i.provider <> 'phone'
  ) and not exists (
    select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null
  ) then
    v_via := 'phone_only_confirmed';
  else
    raise exception 'second factor required' using errcode = 'P0001';
  end if;

  update public.profiles
  set step_up_cleared_session = v_sid,
      step_up_pending_sessions = array_remove(step_up_pending_sessions, v_sid),
      last_seen_at = now()
  where id = v_uid;

  perform public.write_audit(v_uid, 'step_up.completed', 'user', v_uid, jsonb_build_object('via', v_via));
end;
$$;
comment on function public.complete_step_up() is 'Clears the 90-day step-up for the current session only: allowed when this session came from Google, or the account is phone-only (owner confirmation). Otherwise raises. Email-code second factors use complete_step_up_server().';
revoke execute on function public.complete_step_up() from public, anon, authenticated, service_role;
grant execute on function public.complete_step_up() to authenticated;

-- Server attestation (owner decision 2026-11-23): called with the service role ONLY by the
-- verifyOtp server action, right after it verified an EMAIL code and received the new session.
create function public.complete_step_up_server(p_user_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if p_user_id is null or p_session_id is null then
    raise exception 'invalid arguments' using errcode = '22023';
  end if;
  if not exists (
    select 1 from auth.sessions s where s.id = p_session_id and s.user_id = p_user_id
  ) then
    raise exception 'session not found' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users u where u.id = p_user_id and u.email_confirmed_at is not null
  ) then
    raise exception 'no confirmed email' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = p_user_id;
  if v_profile.id is null
     or not (p_session_id = any (v_profile.step_up_pending_sessions)
             or public.step_up_needed(v_profile.last_seen_at, v_profile.step_up_cleared_session, p_session_id)) then
    return;
  end if;

  update public.profiles
  set step_up_cleared_session = p_session_id,
      step_up_pending_sessions = array_remove(step_up_pending_sessions, p_session_id),
      last_seen_at = now()
  where id = p_user_id;

  perform public.write_audit(p_user_id, 'step_up.completed', 'user', p_user_id, jsonb_build_object('via', 'email_code'));
end;
$$;
comment on function public.complete_step_up_server(uuid, uuid) is 'Service role only: clears step-up for a session the server just created by verifying an email code. Requires the session to belong to the user and a confirmed email.';
revoke execute on function public.complete_step_up_server(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.complete_step_up_server(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------------------------
-- sync_contacts_from_auth: the one trigger on auth.users (Q8). Never raises.
-- ---------------------------------------------------------------------------------------------

create function public.sync_contacts_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
begin
  begin
    if new.email is not null
       and new.email_confirmed_at is not null
       and (new.email is distinct from old.email or old.email_confirmed_at is null) then
      update public.profiles
      set email = new.email
      where id = new.id and email is distinct from new.email;
      if found then
        perform public.write_audit(new.id, 'contact.changed', 'user', new.id, jsonb_build_object('field', 'email'));
      end if;
    end if;

    if coalesce(new.phone, '') <> ''
       and new.phone_confirmed_at is not null
       and (new.phone is distinct from old.phone or old.phone_confirmed_at is null) then
      v_phone := '+' || ltrim(new.phone, '+');
      update public.profiles
      set phone = v_phone
      where id = new.id and phone is distinct from v_phone;
      if found then
        perform public.write_audit(new.id, 'contact.changed', 'user', new.id, jsonb_build_object('field', 'phone'));
      end if;
    end if;
  exception
    when others then
      -- Never block an auth.users update (sign-in in all three apps). No values are logged.
      raise warning 'sync_contacts_from_auth skipped (%)', sqlstate;
  end;
  return null;
end;
$$;
comment on function public.sync_contacts_from_auth() is 'AFTER UPDATE trigger on auth.users: copies newly confirmed email or phone into profiles and audits the change. Never raises.';
revoke execute on function public.sync_contacts_from_auth() from public, anon, authenticated, service_role;

create trigger sync_contacts_to_profile
  after update of email, phone, email_confirmed_at, phone_confirmed_at on auth.users
  for each row execute function public.sync_contacts_from_auth();

-- ---------------------------------------------------------------------------------------------
-- unconfirmed_users_older_than: read-only lookup for the daily cleanup job
-- ---------------------------------------------------------------------------------------------

create function public.unconfirmed_users_older_than(p_age interval)
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_age is null or p_age < interval '1 hour' then
    raise exception 'age must be at least 1 hour' using errcode = '22023';
  end if;
  return query
    select u.id
    from auth.users u
    where u.email_confirmed_at is null
      and u.phone_confirmed_at is null
      and coalesce(u.is_anonymous, false) = false
      and u.created_at < now() - p_age
      and not exists (select 1 from public.profiles p where p.id = u.id);
end;
$$;
comment on function public.unconfirmed_users_older_than(interval) is 'Ids of users who never confirmed an email or phone and are older than p_age. Read-only; the cleanup route deletes them through the Auth admin API.';
revoke execute on function public.unconfirmed_users_older_than(interval) from public, anon, authenticated, service_role;
grant execute on function public.unconfirmed_users_older_than(interval) to service_role;
