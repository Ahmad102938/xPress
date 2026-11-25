-- Identity tests: RLS allow/deny, grants, finish_signup, record_consent, has_role (aal),
-- session-bound step-up, consents append-only (Q9), contact sync trigger (Q8), cleanup lookup.
-- Synthetic users only (example.test emails, fake +91 900 numbers). Rolled back at the end.
begin;
create extension if not exists pgtap with schema extensions;

select plan(85);

-- ---------------------------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------------------------
-- A: email user, confirmed.          B: phone-only user, confirmed.
-- C: email user, never confirmed.    G: Google user (email identity confirmed via Google).
insert into auth.users (id, aud, role, email, phone, email_confirmed_at, phone_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'a.patient@example.test', null, now(), null, '{}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', null, '919000000001', null, now(), '{}', now(), now()),
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'c.pending@example.test', null, null, null, '{}', now() - interval '2 days', now()),
  ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'g.patient@example.test', null, now(), null,
   '{"avatar_url":"https://example.test/a.png"}', now(), now());

insert into auth.identities (user_id, provider, provider_id, identity_data, created_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', 'email', '11111111-1111-4111-8111-111111111111', '{"sub":"11111111-1111-4111-8111-111111111111"}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'phone', '22222222-2222-4222-8222-222222222222', '{"sub":"22222222-2222-4222-8222-222222222222"}', now(), now()),
  ('33333333-3333-4333-8333-333333333333', 'email', '33333333-3333-4333-8333-333333333333', '{"sub":"33333333-3333-4333-8333-333333333333"}', now(), now()),
  ('44444444-4444-4444-8444-444444444444', 'google', 'google-sub-0001', '{"sub":"google-sub-0001"}', now(), now());

insert into auth.sessions (id, user_id, created_at, updated_at) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', now(), now()),
  ('aaaaaaaa-0000-4000-8000-00000000000b', '11111111-1111-4111-8111-111111111111', now(), now()),
  ('bbbbbbbb-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', now(), now()),
  ('cccccccc-0000-4000-8000-00000000000a', '33333333-3333-4333-8333-333333333333', now(), now()),
  ('dddddddd-0000-4000-8000-00000000000a', '44444444-4444-4444-8444-444444444444', now(), now()),
  ('dddddddd-0000-4000-8000-00000000000b', '44444444-4444-4444-8444-444444444444', now(), now());

-- Session ...0a of G was made with Google; ...0b with an email code (amr otp).
insert into auth.mfa_amr_claims (id, session_id, created_at, updated_at, authentication_method) values
  (gen_random_uuid(), 'dddddddd-0000-4000-8000-00000000000a', now(), now(), 'oauth'),
  (gen_random_uuid(), 'dddddddd-0000-4000-8000-00000000000b', now(), now(), 'otp');

-- ---------------------------------------------------------------------------------------------
-- RLS on and exact grants
-- ---------------------------------------------------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS on');
select ok((select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass), 'user_roles has RLS on');
select ok((select relrowsecurity from pg_class where oid = 'public.consents'::regclass), 'consents has RLS on');

select table_privs_are('public', 'profiles', 'anon', array[]::text[], 'anon has no privileges on profiles');
select table_privs_are('public', 'profiles', 'authenticated', array['SELECT'], 'authenticated has table-level SELECT only on profiles');
select ok(has_column_privilege('authenticated', 'public.profiles', 'full_name', 'update'), 'authenticated may update full_name');
select ok(has_column_privilege('authenticated', 'public.profiles', 'preferred_language', 'update'), 'authenticated may update preferred_language');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'email', 'update'), 'authenticated may not update email');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'phone', 'update'), 'authenticated may not update phone');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'step_up_cleared_session', 'update'), 'authenticated may not update step-up columns');
select table_privs_are('public', 'user_roles', 'anon', array[]::text[], 'anon has no privileges on user_roles');
select table_privs_are('public', 'user_roles', 'authenticated', array['SELECT'], 'authenticated can only read user_roles');
select table_privs_are('public', 'consents', 'anon', array[]::text[], 'anon has no privileges on consents');
select table_privs_are('public', 'consents', 'authenticated', array['SELECT'], 'authenticated can only read consents');
select table_privs_are('public', 'consents', 'service_role', array['SELECT'], 'service_role can only read consents');

select ok(not has_function_privilege('anon', 'public.finish_signup(text, boolean, public.consent_source)', 'execute'), 'anon cannot call finish_signup');
select ok(not has_function_privilege('authenticated', 'public.complete_step_up_server(uuid, uuid)', 'execute'), 'authenticated cannot call complete_step_up_server');
select ok(has_function_privilege('service_role', 'public.complete_step_up_server(uuid, uuid)', 'execute'), 'service_role can call complete_step_up_server');
select ok(not has_function_privilege('authenticated', 'public.unconfirmed_users_older_than(interval)', 'execute'), 'authenticated cannot list unconfirmed users');
select ok(not has_function_privilege('authenticated', 'public.has_current_terms(uuid)', 'execute'), 'authenticated cannot call internal has_current_terms');

-- ---------------------------------------------------------------------------------------------
-- finish_signup
-- ---------------------------------------------------------------------------------------------
-- C (unconfirmed) is refused.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","aal":"aal1","session_id":"cccccccc-0000-4000-8000-00000000000a"}', true);
select throws_ok($$ select public.finish_signup('Test Pending', false, 'email') $$, '42501', null, 'finish_signup refuses an unconfirmed user');

-- A with a source it has no identity for is refused; 'profile' is never a sign-up source.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1","session_id":"aaaaaaaa-0000-4000-8000-00000000000a"}', true);
select throws_ok($$ select public.finish_signup('Test Patient A', false, 'phone') $$, '22023', null, 'finish_signup rejects a forged source');
select throws_ok($$ select public.finish_signup('Test Patient A', false, 'profile') $$, '22023', null, 'finish_signup rejects the profile source');
select throws_ok($$ select public.finish_signup(' x ', false, 'email') $$, '22023', null, 'finish_signup rejects a one-letter name');

select lives_ok($$ select public.finish_signup('  Test   Patient A ', true, 'email') $$, 'finish_signup succeeds for a confirmed user');
select is((select full_name from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 'Test Patient A', 'the name is trimmed and spaces collapsed');
select is((select email from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 'a.patient@example.test', 'the confirmed email is copied');
select ok((select last_seen_at is not null from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 'last_seen_at starts at sign-up');
select results_eq(
  $$ select role::text from public.user_roles where user_id = '11111111-1111-4111-8111-111111111111' $$,
  $$ values ('patient') $$,
  'the patient role is granted'
);
select results_eq(
  $$ select consent_type::text, granted, source::text, document_version from public.consents
     where user_id = '11111111-1111-4111-8111-111111111111' order by consent_type $$,
  $$ values ('marketing', true, 'email', 'draft-2026-11'), ('terms_privacy', true, 'email', 'draft-2026-11') $$,
  'terms and marketing consents are recorded at the current versions with the verified source'
);
select is((public.my_auth_state() ->> 'has_current_terms')::boolean, true, 'my_auth_state reports current terms');

-- Repeat call: nothing new.
select lives_ok($$ select public.finish_signup('Other Name', false, 'email') $$, 'a repeat finish_signup is accepted');
select is((select count(*)::int from public.consents where user_id = '11111111-1111-4111-8111-111111111111'), 2, 'a repeat finish_signup writes no consent rows');
select is((select full_name from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 'Test Patient A', 'a repeat finish_signup does not change the name');

-- B (phone) and G (Google) finish too.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1","session_id":"bbbbbbbb-0000-4000-8000-00000000000a"}', true);
select lives_ok($$ select public.finish_signup('Test Patient B', false, 'phone') $$, 'a phone user can finish sign-up');
select is((select phone from public.profiles where id = '22222222-2222-4222-8222-222222222222'), '+919000000001', 'the confirmed phone is stored in + form');
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","aal":"aal1","session_id":"dddddddd-0000-4000-8000-00000000000a"}', true);
select lives_ok($$ select public.finish_signup('Test Patient G', false, 'google') $$, 'a Google user can finish sign-up');
select is((select avatar_url from public.profiles where id = '44444444-4444-4444-8444-444444444444'), 'https://example.test/a.png', 'the Google avatar is the initial avatar');

-- ---------------------------------------------------------------------------------------------
-- RLS: own rows only, no client writes
-- ---------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1","session_id":"aaaaaaaa-0000-4000-8000-00000000000a"}', true);
select is((select count(*)::int from public.profiles), 1, 'a user sees only their own profile');
select is((select count(*)::int from public.consents), 2, 'a user sees only their own consents');
select is((select count(*)::int from public.user_roles), 1, 'a user sees only their own roles');
select lives_ok($$ update public.profiles set preferred_language = 'hi' where id = '11111111-1111-4111-8111-111111111111' $$, 'a user may change their language');
update public.profiles set full_name = 'Hijack' where id = '22222222-2222-4222-8222-222222222222';
reset role;
select is((select full_name from public.profiles where id = '22222222-2222-4222-8222-222222222222'), 'Test Patient B', 'a user cannot change another user''s profile');
set local role authenticated;
select throws_ok($$ update public.profiles set email = 'x@example.test' where id = '11111111-1111-4111-8111-111111111111' $$, '42501', null, 'a user cannot change their email column');
select throws_ok($$ insert into public.user_roles (user_id, role) values ('11111111-1111-4111-8111-111111111111', 'admin') $$, '42501', null, 'a user cannot grant themselves a role');
select throws_ok(
  $$ insert into public.consents (user_id, consent_type, document_version, granted, source) values ('11111111-1111-4111-8111-111111111111', 'terms_privacy', 'forged', true, 'email') $$,
  '42501', null, 'a user cannot insert a consent row'
);
select throws_ok($$ delete from public.consents $$, '42501', null, 'a user cannot delete consents');
reset role;

set local role anon;
select throws_ok($$ select count(*) from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select public.my_auth_state() $$, '42501', null, 'anon cannot call my_auth_state');
reset role;

-- ---------------------------------------------------------------------------------------------
-- has_role: staff roles need aal2
-- ---------------------------------------------------------------------------------------------
insert into public.user_roles (user_id, role) values ('11111111-1111-4111-8111-111111111111', 'admin');
set local role authenticated;
select is(public.has_role('patient'), true, 'patient role works at aal1');
select is(public.has_role('admin'), false, 'a staff role is refused at aal1');
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal2","session_id":"aaaaaaaa-0000-4000-8000-00000000000a"}', true);
select is(public.has_role('admin'), true, 'a staff role is accepted at aal2');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal2","session_id":"bbbbbbbb-0000-4000-8000-00000000000a"}', true);
select is(public.has_role('admin'), false, 'a role the user does not hold is refused');
reset role;

-- ---------------------------------------------------------------------------------------------
-- record_consent (marketing only, only on change)
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1","session_id":"bbbbbbbb-0000-4000-8000-00000000000a"}', true);
select lives_ok($$ select public.record_consent(false) $$, 'recording the same marketing choice is accepted');
select is((select count(*)::int from public.consents where consent_type = 'marketing'), 1, 'an unchanged marketing choice writes no row');
select lives_ok($$ select public.record_consent(true) $$, 'changing the marketing choice is accepted');
-- Both marketing rows share one now() inside this transaction, so ordering by created_at (then a
-- random uuid) was flaky. Assert the new row directly: exactly one profile-sourced row, granted.
select results_eq(
  $$ select granted, source::text from public.consents where consent_type = 'marketing' and source = 'profile' $$,
  $$ values (true, 'profile') $$,
  'the new marketing row uses the profile source'
);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","aal":"aal1","session_id":"cccccccc-0000-4000-8000-00000000000a"}', true);
select throws_ok($$ select public.record_consent(true) $$, '42501', null, 'record_consent requires a finished sign-up');
reset role;

-- ---------------------------------------------------------------------------------------------
-- A Terms version change re-asks (Q12)
-- ---------------------------------------------------------------------------------------------
update public.legal_versions set version = 'draft-2026-12' where consent_type = 'terms_privacy';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1","session_id":"bbbbbbbb-0000-4000-8000-00000000000a"}', true);
select is((public.my_auth_state() ->> 'has_current_terms')::boolean, false, 'a new Terms version needs consent again');
select lives_ok($$ select public.finish_signup('Test Patient B', false, 'phone') $$, 'finish_signup records the new version');
select is((select count(*)::int from public.consents where consent_type = 'terms_privacy'), 2, 'the old Terms row is kept and a new one added');
select is((select count(*)::int from public.user_roles), 1, 'the patient role is not duplicated');
reset role;
update public.legal_versions set version = 'draft-2026-11' where consent_type = 'terms_privacy';

-- ---------------------------------------------------------------------------------------------
-- Step-up (Q13, R2-B1, owner decision on OQ7)
-- ---------------------------------------------------------------------------------------------
update public.profiles set last_seen_at = now() - interval '100 days'
where id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '44444444-4444-4444-8444-444444444444');

-- A (has email): session ...0a is stale; the user cannot clear it themselves.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1","session_id":"aaaaaaaa-0000-4000-8000-00000000000a"}', true);
select is((public.my_auth_state() ->> 'needs_step_up')::boolean, true, 'a session after 90 idle days needs step-up');
select ok(public.touch_last_seen() < now() - interval '90 days', 'touch_last_seen leaves last_seen_at unchanged while stale');
select throws_ok($$ select public.complete_step_up() $$, 'P0001', null, 'an account with email cannot self-confirm a code session');
reset role;

-- The server confirms an email code for session ...0b only.
set local role service_role;
select lives_ok(
  $$ select public.complete_step_up_server('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-00000000000b') $$,
  'the server can confirm an email-code session'
);
select throws_ok(
  $$ select public.complete_step_up_server('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-0000-4000-8000-00000000000a') $$,
  '42501', null, 'the server cannot confirm another user''s session'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1","session_id":"aaaaaaaa-0000-4000-8000-00000000000b"}', true);
select is((public.my_auth_state() ->> 'needs_step_up')::boolean, false, 'the confirmed session passes');
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1","session_id":"aaaaaaaa-0000-4000-8000-00000000000a"}', true);
select is((public.my_auth_state() ->> 'needs_step_up')::boolean, true, 'a session already pending stays blocked after the owner passes elsewhere');

-- G: a Google session clears itself; an email-code session of the same account does not.
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","aal":"aal1","session_id":"dddddddd-0000-4000-8000-00000000000b"}', true);
select throws_ok($$ select public.complete_step_up() $$, 'P0001', null, 'an otp session cannot self-confirm on a Google account');
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","aal":"aal1","session_id":"dddddddd-0000-4000-8000-00000000000a"}', true);
select lives_ok($$ select public.complete_step_up() $$, 'a Google session completes step-up');
select is((public.my_auth_state() ->> 'needs_step_up')::boolean, false, 'the Google session is now clear');

-- B (phone-only): the owner-confirmation choice.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1","session_id":"bbbbbbbb-0000-4000-8000-00000000000a"}', true);
select lives_ok($$ select public.complete_step_up() $$, 'a phone-only account can confirm ownership');
select is((public.my_auth_state() ->> 'needs_step_up')::boolean, false, 'the phone-only session is now clear');
reset role;

select is(
  (select count(*)::int from public.audit_log where action = 'step_up.completed'),
  3, 'each completed step-up writes one audit row'
);

-- ---------------------------------------------------------------------------------------------
-- Contact sync trigger (Q8): confirmed values only, audits real changes only, never raises
-- ---------------------------------------------------------------------------------------------
update auth.users set last_sign_in_at = now() where id = '11111111-1111-4111-8111-111111111111';
select is((select count(*)::int from public.audit_log where action = 'contact.changed'), 0, 'a sign-in style update writes no contact audit');

update auth.users set phone = '919000000002', phone_confirmed_at = null where id = '11111111-1111-4111-8111-111111111111';
select is((select phone from public.profiles where id = '11111111-1111-4111-8111-111111111111'), null, 'a pending phone is not copied');

update auth.users set phone_confirmed_at = now() where id = '11111111-1111-4111-8111-111111111111';
select is((select phone from public.profiles where id = '11111111-1111-4111-8111-111111111111'), '+919000000002', 'a confirmed phone is copied');
select is(
  (select metadata from public.audit_log where action = 'contact.changed'),
  '{"field": "phone"}'::jsonb, 'the change is audited without the value'
);
select lives_ok(
  $$ update auth.users set email = 'c.other@example.test' where id = '33333333-3333-4333-8333-333333333333' $$,
  'an update for a user without a profile does not fail'
);

-- ---------------------------------------------------------------------------------------------
-- Cleanup lookup and user deletion (Q9, R1-B8)
-- ---------------------------------------------------------------------------------------------
select results_eq(
  $$ select * from public.unconfirmed_users_older_than('24 hours') $$,
  $$ values ('33333333-3333-4333-8333-333333333333'::uuid) $$,
  'only the old unconfirmed user is listed for cleanup'
);
select throws_ok($$ select * from public.unconfirmed_users_older_than('5 minutes') $$, '22023', null, 'the cleanup age has a floor');

select throws_ok(
  $$ update public.consents set granted = false where user_id = '11111111-1111-4111-8111-111111111111' $$,
  '42501', null, 'consents cannot be changed, even by the owner role'
);

-- Since the patient-profiles migration, finish_signup also creates a self patient profile and an
-- owner grant, and those keys use ON DELETE RESTRICT (no silent loss of family data). Remove that
-- user's patient-profile rows first, as an operator would, so this test keeps checking what it is
-- about: consents survive a user deletion. The restrict itself is tested in 03_patient_profiles.
delete from public.patient_addresses where patient_profile_id in
  (select patient_profile_id from public.profile_access where account_id = '11111111-1111-4111-8111-111111111111');
create temporary table _a_profiles on commit drop as
  select patient_profile_id from public.profile_access where account_id = '11111111-1111-4111-8111-111111111111';
delete from public.profile_access where account_id = '11111111-1111-4111-8111-111111111111';
delete from public.patient_profiles where id in (select patient_profile_id from _a_profiles);
delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
select is(
  (select count(*)::int from public.consents where user_id is null),
  2, 'deleting a user keeps their consent rows with user_id set to null'
);
select ok(
  (select count(*) > 0 from public.audit_log where actor_id = '11111111-1111-4111-8111-111111111111'),
  'deleting a user keeps audit rows'
);

select * from finish();
rollback;
