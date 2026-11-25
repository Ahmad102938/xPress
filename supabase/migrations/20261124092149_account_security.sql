-- Account security (docs/specs/signed-in-home.md, Part C; item 3).
--
-- Step 0 found that verifying a phone_change code writes a fresh `amr` timestamp, so `amr` cannot
-- prove a recent sign-in. The recent sign-in check therefore lives on the server (a signed,
-- session-bound httpOnly cookie, `acx_recent`). These functions only require a signed-in caller;
-- the gap (a direct database call skips the recent check) is documented in docs/AUTH.md.
--
-- Nothing here deletes data. A deletion request only records intent for HCQ support (retention
-- rule TODO_HCQ).

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete restrict,
  status text not null default 'requested' check (status in ('requested', 'cancelled')),
  requested_at timestamptz not null default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'cancelled') = (cancelled_at is not null))
);
alter table public.account_deletion_requests enable row level security;
comment on table public.account_deletion_requests is 'An account holder''s request to delete their account. Records intent only; HCQ support acts on it under the retention rule (TODO_HCQ). Transitions: requested -> cancelled.';

create index account_deletion_requests_account_id_idx on public.account_deletion_requests (account_id);
create unique index account_deletion_requests_one_open_idx
  on public.account_deletion_requests (account_id) where status = 'requested';

create trigger account_deletion_requests_set_updated_at
  before update on public.account_deletion_requests
  for each row execute function public.set_updated_at();

revoke all on table public.account_deletion_requests from public, anon, authenticated, service_role;
grant select on table public.account_deletion_requests to authenticated, service_role;

create policy account_deletion_requests_select_own
  on public.account_deletion_requests
  for select
  to authenticated
  using (account_id = (select auth.uid()));

create function public.request_account_deletion()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select id into v_id from public.account_deletion_requests where account_id = v_uid and status = 'requested';
  if v_id is not null then
    return v_id;
  end if;
  insert into public.account_deletion_requests (account_id) values (v_uid) returning id into v_id;
  perform public.write_audit(v_uid, 'account.deletion_requested', 'user', v_uid, '{}'::jsonb);
  return v_id;
end;
$$;
comment on function public.request_account_deletion() is 'Records a deletion request for the calling account (idempotent: returns the open request). Deletes nothing. The server checks the recent sign-in first.';
revoke execute on function public.request_account_deletion() from public, anon, authenticated, service_role;
grant execute on function public.request_account_deletion() to authenticated;

create function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  update public.account_deletion_requests
  set status = 'cancelled', cancelled_at = now()
  where account_id = v_uid and status = 'requested'
  returning id into v_id;
  -- No open request: nothing to do, no error and no audit row.
  if v_id is not null then
    perform public.write_audit(v_uid, 'account.deletion_cancelled', 'user', v_uid, '{}'::jsonb);
  end if;
end;
$$;
comment on function public.cancel_account_deletion() is 'Withdraws the calling account''s open deletion request. A call with no open request does nothing.';
revoke execute on function public.cancel_account_deletion() from public, anon, authenticated, service_role;
grant execute on function public.cancel_account_deletion() to authenticated;

-- Written before the global sign-out, while the session still exists (no second call is possible after).
create function public.record_sign_out_everywhere()
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
  perform public.write_audit(v_uid, 'session.sign_out_all', 'user', v_uid, '{}'::jsonb);
end;
$$;
comment on function public.record_sign_out_everywhere() is 'Audits a sign-out-everywhere for the calling account, just before the server signs out all sessions.';
revoke execute on function public.record_sign_out_everywhere() from public, anon, authenticated, service_role;
grant execute on function public.record_sign_out_everywhere() to authenticated;
