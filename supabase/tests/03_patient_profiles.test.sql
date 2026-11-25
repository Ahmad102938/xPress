-- Patient profiles tests (docs/specs/signed-in-home.md item 4): self profile creation and backfill,
-- RLS allow/deny between two accounts, write-function rules, restrict, audit metadata, settings.
-- Synthetic users only (example.test emails, fake +91 900 numbers). Rolled back at the end.
begin;
create extension if not exists pgtap with schema extensions;

select plan(76);

-- ---------------------------------------------------------------------------------------------
-- Fixtures (as postgres): A email user, B phone user, S a staff-like user with no profiles row.
-- ---------------------------------------------------------------------------------------------
insert into auth.users (id, aud, role, email, phone, email_confirmed_at, phone_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('a1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'pp.a@example.test', null, now(), null, '{}', now(), now()),
  ('b2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', null, '919000000002', null, now(), '{}', now(), now()),
  ('c3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'pp.staff@example.test', null, now(), null, '{}', now(), now());
insert into auth.identities (user_id, provider, provider_id, identity_data, created_at, updated_at) values
  ('a1111111-1111-4111-8111-111111111111', 'email', 'a1111111-1111-4111-8111-111111111111', '{"sub":"a1111111-1111-4111-8111-111111111111"}', now(), now()),
  ('b2222222-2222-4222-8222-222222222222', 'phone', 'b2222222-2222-4222-8222-222222222222', '{"sub":"b2222222-2222-4222-8222-222222222222"}', now(), now()),
  ('c3333333-3333-4333-8333-333333333333', 'email', 'c3333333-3333-4333-8333-333333333333', '{"sub":"c3333333-3333-4333-8333-333333333333"}', now(), now());

create temporary table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, anon;

-- ---------------------------------------------------------------------------------------------
-- RLS on, grants
-- ---------------------------------------------------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'public.patient_profiles'::regclass), 'patient_profiles has RLS on');
select ok((select relrowsecurity from pg_class where oid = 'public.profile_access'::regclass), 'profile_access has RLS on');
select ok((select relrowsecurity from pg_class where oid = 'public.patient_addresses'::regclass), 'patient_addresses has RLS on');
select ok((select relrowsecurity from pg_class where oid = 'public.app_settings'::regclass), 'app_settings has RLS on');
select table_privs_are('public', 'patient_profiles', 'anon', array[]::text[], 'anon has no privileges on patient_profiles');
select table_privs_are('public', 'profile_access', 'anon', array[]::text[], 'anon has no privileges on profile_access');
select table_privs_are('public', 'patient_addresses', 'anon', array[]::text[], 'anon has no privileges on patient_addresses');
select table_privs_are('public', 'app_settings', 'anon', array[]::text[], 'anon has no privileges on app_settings');
select table_privs_are('public', 'patient_profiles', 'authenticated', array['SELECT'], 'authenticated can only read patient_profiles');
select table_privs_are('public', 'patient_addresses', 'authenticated', array['SELECT'], 'authenticated can only read patient_addresses');
select ok(
  not exists (
    select 1 from unnest(array[
      'public.create_dependent(text, date, public.profile_relationship, public.profile_gender, text, text, boolean)',
      'public.update_patient_profile(uuid, text, date, public.profile_gender, text, text, text[], boolean)',
      'public.archive_dependent(uuid)', 'public.restore_dependent(uuid)',
      'public.upsert_patient_address(uuid, text, text, text, text, text, uuid, text, text, double precision, double precision, text[])',
      'public.delete_patient_address(uuid)', 'public.set_default_address(uuid)',
      'public.actable_profile_ids(public.profile_capability)', 'public.can_act_for(uuid, public.profile_capability)'
    ]) f where has_function_privilege('anon', f, 'execute')
  ),
  'anon cannot execute any of the 9 patient-profile functions'
);
select ok(not has_function_privilege('authenticated', 'public.ensure_self_profile(uuid)', 'execute'), 'ensure_self_profile is internal');
select ok(not has_function_privilege('authenticated', 'public.mirror_profile_name()', 'execute'), 'mirror_profile_name is internal');

-- ---------------------------------------------------------------------------------------------
-- Self profile via finish_signup
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$ select public.finish_signup('Test Patient A', false, 'email') $$, 'A finishes sign-up');
select is((select count(*)::int from public.profile_access where relationship = 'self'), 1, 'finish_signup creates one self grant');
select is((select full_name from public.patient_profiles), 'Test Patient A', 'the self profile copies the name');
select lives_ok($$ select public.finish_signup('Test Patient A', false, 'email') $$, 'a repeat finish_signup is accepted');
select is((select count(*)::int from public.profile_access), 1, 'a repeat finish_signup adds no grant');
insert into ids select 'a_self', patient_profile_id from public.profile_access;
select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$ select public.finish_signup('Test Patient B', true, 'phone') $$, 'B finishes sign-up');
insert into ids select 'b_self', patient_profile_id from public.profile_access;
reset role;

-- A repeat call repairs a missing self profile (early-return path).
delete from public.profile_access where account_id = 'a1111111-1111-4111-8111-111111111111';
delete from public.patient_profiles where id = (select id from ids where name = 'a_self');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$ select public.finish_signup('Test Patient A', false, 'email') $$, 'finish_signup runs again after Terms are recorded');
select is((select count(*)::int from public.profile_access where relationship = 'self'), 1, 'the repeat call repaired the missing self profile');
reset role;
update ids set id = (select patient_profile_id from public.profile_access where account_id = 'a1111111-1111-4111-8111-111111111111') where name = 'a_self';

-- Backfill helper is idempotent and gives nothing to a user without a profiles row.
select public.ensure_self_profile(p.id) from public.profiles p where p.id in ('a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222');
select is((select count(*)::int from public.profile_access where account_id in ('a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222')), 2, 'running the backfill again adds nothing');
select public.ensure_self_profile('c3333333-3333-4333-8333-333333333333');
select is((select count(*)::int from public.profile_access where account_id = 'c3333333-3333-4333-8333-333333333333'), 0, 'a user without a profiles row gets no patient profile');

-- ---------------------------------------------------------------------------------------------
-- Dependents for A
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}', true);
select lives_ok(
  $$ insert into ids select 'a_child', public.create_dependent('Test Child', (current_date - interval '6 years')::date, 'child') $$,
  'A adds a child'
);
select throws_ok(
  $$ select public.create_dependent('Test Parent', date '1950-01-01', 'parent') $$,
  'P0001', 'adult_permission_required', 'an adult dependent needs permission'
);
select lives_ok(
  $$ insert into ids select 'a_parent', public.create_dependent('Test Parent', date '1950-01-01', 'parent', null, 'hi', '+919000000003', true) $$,
  'A adds an adult parent with permission'
);
select throws_ok($$ select public.create_dependent('Test Self', date '2000-01-01', 'self', null, null, null, true) $$, 'P0001', 'invalid_input', 'a dependent cannot be self');
select throws_ok($$ select public.create_dependent('X', date '2010-01-01', 'child') $$, 'P0001', 'invalid_input', 'a one-letter name is rejected');
select throws_ok($$ select public.create_dependent('Test Future', (current_date + 10)::date, 'child') $$, 'P0001', 'invalid_input', 'a future date of birth is rejected');
select throws_ok($$ select public.create_dependent('Test Old', date '1899-12-31', 'grandparent', null, null, null, true) $$, 'P0001', 'invalid_input', 'a date before 1900 is rejected');
select throws_ok($$ select public.create_dependent('Test Phone', date '2015-01-01', 'child', null, null, '9000000003') $$, 'P0001', 'invalid_input', 'a contact number must be E.164');
reset role;
select is(
  (select metadata from public.audit_log where action = 'patient_profile.created' and subject_id = (select id from ids where name = 'a_parent')),
  '{"fields": ["full_name", "date_of_birth", "relationship", "consultation_language", "contact_phone"], "adult_permission": true}'::jsonb,
  'creating an adult is audited with field names and adult_permission only'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.patient_profiles), 3, 'A reads self, child and parent');

-- Address for the child.
select lives_ok(
  $$ insert into ids select 'a_child_addr', public.upsert_patient_address((select id from ids where name = 'a_child'), 'Home', '12 Test Street', 'Bhopal', 'Madhya Pradesh', '462001') $$,
  'A adds an address for the child'
);
select is((select is_default from public.patient_addresses), true, 'the first address becomes the default');
select throws_ok(
  $$ select public.upsert_patient_address((select id from ids where name = 'a_child'), 'Home', '12 Test Street', 'Bhopal', 'Madhya Pradesh', '062001') $$,
  'P0001', 'invalid_input', 'a PIN code must be 6 digits not starting with 0'
);
select lives_ok(
  $$ select public.upsert_patient_address((select id from ids where name = 'a_child'), 'Home', '12 Test Street', 'Bhopal', 'Madhya Pradesh', '462001', (select id from ids where name = 'a_child_addr'), 'Flat 2') $$,
  'A edits the address'
);
select is((select line2 from public.patient_addresses), 'Flat 2', 'the edit is saved');
select lives_ok(
  $$ select public.upsert_patient_address((select id from ids where name = 'a_child'), 'Home', '12 Test Street', 'Bhopal', 'Madhya Pradesh', '462001', (select id from ids where name = 'a_child_addr'), p_clear => array['line2']) $$,
  'A clears an optional address field'
);
select is((select line2 from public.patient_addresses), null, 'line2 was cleared');

-- Rules on the self profile.
select throws_ok($$ select public.archive_dependent((select id from ids where name = 'a_self')) $$, 'P0001', 'self_profile', 'the self profile cannot be archived');
select throws_ok($$ select public.update_patient_profile((select id from ids where name = 'a_self'), p_contact_phone => '+919000000004') $$, 'P0001', 'invalid_input', 'the self profile cannot have a contact number');
select throws_ok($$ select public.update_patient_profile((select id from ids where name = 'a_child'), p_clear => array['date_of_birth']) $$, 'P0001', 'invalid_input', 'a dependent keeps its date of birth');
select throws_ok($$ select public.update_patient_profile((select id from ids where name = 'a_child'), p_clear => array['full_name']) $$, 'P0001', 'invalid_input', 'only optional fields can be cleared');
select lives_ok($$ select public.update_patient_profile((select id from ids where name = 'a_self'), p_full_name => 'Test Patient Renamed') $$, 'A renames the self profile');
select is((select full_name from public.profiles where id = 'a1111111-1111-4111-8111-111111111111'), 'Test Patient Renamed', 'the self rename reaches profiles.full_name');
select throws_ok($$ select public.update_patient_profile((select id from ids where name = 'a_child'), p_date_of_birth => date '1990-01-01') $$, 'P0001', 'adult_permission_required', 'a date of birth that makes a dependent adult needs permission');

-- Capabilities.
select ok((select id from ids where name = 'a_child') in (select public.actable_profile_ids('view_records')), 'view_records includes a minor');
select ok((select id from ids where name = 'a_self') in (select public.actable_profile_ids('view_records')), 'view_records includes self');
select ok((select id from ids where name = 'a_parent') not in (select public.actable_profile_ids('view_records')), 'view_records excludes an adult dependent');

-- Archive and restore.
select lives_ok($$ select public.archive_dependent((select id from ids where name = 'a_parent')) $$, 'A archives the parent');
select ok((select id from ids where name = 'a_parent') in (select public.actable_profile_ids('read')), 'an archived profile can still be read');
select ok((select id from ids where name = 'a_parent') not in (select public.actable_profile_ids('manage')), 'an archived profile cannot be managed');
select throws_ok($$ select public.archive_dependent((select id from ids where name = 'a_parent')) $$, 'P0001', 'not_found', 'archiving twice is not_found');
select lives_ok($$ select public.restore_dependent((select id from ids where name = 'a_parent')) $$, 'A restores the parent');
select throws_ok($$ select public.restore_dependent((select id from ids where name = 'a_parent')) $$, 'P0001', 'not_found', 'restoring a profile that is not archived is not_found');
reset role;

-- The cap counts non-archived dependents, and restore checks it again.
update public.app_settings set int_value = 2 where key = 'max_dependents_per_account';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.create_dependent('Test Third', date '2018-01-01', 'child') $$, 'P0001', 'limit_reached', 'the dependent cap is enforced');
select lives_ok($$ select public.archive_dependent((select id from ids where name = 'a_parent')) $$, 'archiving frees a place');
select lives_ok($$ insert into ids select 'a_third', public.create_dependent('Test Third', date '2018-01-01', 'child') $$, 'archived dependents do not count');
select throws_ok($$ select public.restore_dependent((select id from ids where name = 'a_parent')) $$, 'P0001', 'limit_reached', 'restore over the cap is refused');
reset role;
update public.app_settings set int_value = 10 where key = 'max_dependents_per_account';

-- ---------------------------------------------------------------------------------------------
-- Isolation: B cannot read or change A's data
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.patient_profiles), 1, 'B reads only its own self profile');
select is((select count(*)::int from public.profile_access), 1, 'B reads only its own grant');
select is((select count(*)::int from public.patient_addresses), 0, 'B cannot read A''s addresses');
select is((select count(*)::int from public.consents where user_id = 'a1111111-1111-4111-8111-111111111111'), 0, 'B cannot read A''s consents');
select throws_ok($$ select public.update_patient_profile((select id from ids where name = 'a_child'), p_full_name => 'Hacked Name') $$, 'P0001', 'not_found', 'B cannot update A''s child');
select throws_ok($$ select public.archive_dependent((select id from ids where name = 'a_child')) $$, 'P0001', 'not_found', 'B cannot archive A''s child');
select throws_ok(
  $$ select public.upsert_patient_address((select id from ids where name = 'a_child'), 'Home', '1 Other Street', 'Bhopal', 'Madhya Pradesh', '462001') $$,
  'P0001', 'not_found', 'B cannot add an address to A''s child'
);
select throws_ok($$ select public.delete_patient_address((select id from ids where name = 'a_child_addr')) $$, 'P0001', 'not_found', 'B cannot delete A''s address');
reset role;

-- A user with no self grant (for example staff) cannot add dependents.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.create_dependent('Test Child', date '2018-01-01', 'child') $$, 'P0001', 'not_found', 'a user with no self grant cannot create a dependent');
select is((select count(*)::int from public.app_settings), 1, 'authenticated sees only public settings');
reset role;

-- Anon reads nothing.
set local role anon;
select throws_ok($$ select count(*) from public.patient_profiles $$, '42501', null, 'anon cannot read patient_profiles');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Name mirror, restrict, cleanup lookup, audit metadata
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$ update public.profiles set full_name = 'Test Patient B Two' where id = 'b2222222-2222-4222-8222-222222222222' $$, 'a client name update on profiles still works');
select is((select full_name from public.patient_profiles), 'Test Patient B Two', 'the name is mirrored to the self profile');
reset role;

select throws_ok($$ delete from auth.users where id = 'a1111111-1111-4111-8111-111111111111' $$, '23503', null, 'a user with patient profiles cannot be deleted (restrict)');
select ok(
  not exists (
    select 1 from public.unconfirmed_users_older_than('1 hour') u
    join public.profile_access pa on pa.account_id = u
  ),
  'the cleanup lookup never returns a user with a grant'
);
select ok(
  not exists (
    select 1 from public.audit_log a, jsonb_object_keys(a.metadata) k
    where (a.action like 'patient_profile.%' or a.action like 'patient_address.%')
      and k not in ('fields', 'adult_permission')
  ),
  'profile and address audit metadata holds only fields and adult_permission'
);

select * from finish();
rollback;
