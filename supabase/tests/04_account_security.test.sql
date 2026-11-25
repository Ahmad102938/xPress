-- Account security tests (docs/specs/signed-in-home.md item 5): deletion requests, sign out
-- everywhere audit, RLS between accounts, audit_log append-only. Step 0 chose the server-proof
-- fallback, so recency is enforced on the server (unit tests); here the functions need a signed-in
-- caller. Synthetic users only. Rolled back at the end.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('a4444444-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'as.a@example.test', now(), '{}', now(), now()),
  ('b4444444-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'as.b@example.test', now(), '{}', now(), now());

select ok((select relrowsecurity from pg_class where oid = 'public.account_deletion_requests'::regclass), 'account_deletion_requests has RLS on');
select table_privs_are('public', 'account_deletion_requests', 'anon', array[]::text[], 'anon has no privileges on account_deletion_requests');
select table_privs_are('public', 'account_deletion_requests', 'authenticated', array['SELECT'], 'authenticated can only read account_deletion_requests');
select ok(not has_function_privilege('anon', 'public.request_account_deletion()', 'execute'), 'anon cannot request a deletion');
select ok(not has_function_privilege('anon', 'public.record_sign_out_everywhere()', 'execute'), 'anon cannot record a global sign-out');

-- Unauthenticated callers are refused.
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok($$ select public.request_account_deletion() $$, '42501', null, 'a caller without a user is refused');
select throws_ok($$ select public.record_sign_out_everywhere() $$, '42501', null, 'a global sign-out needs a user');

-- A requests, repeats, and cancels.
select set_config('request.jwt.claims', '{"sub":"a4444444-1111-4111-8111-111111111111","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$ select public.request_account_deletion() $$, 'A requests deletion');
select lives_ok($$ select public.request_account_deletion() $$, 'a repeat request is accepted');
select is((select count(*)::int from public.account_deletion_requests where status = 'requested'), 1, 'only one open request exists');
select lives_ok($$ select public.cancel_account_deletion() $$, 'A cancels');
select is((select status from public.account_deletion_requests), 'cancelled', 'the request is cancelled');
select lives_ok($$ select public.cancel_account_deletion() $$, 'cancelling with no open request returns normally');
select lives_ok($$ select public.record_sign_out_everywhere() $$, 'A records a global sign-out');

-- B cannot see A's requests.
select set_config('request.jwt.claims', '{"sub":"b4444444-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.account_deletion_requests), 0, 'B cannot read A''s deletion requests');
reset role;

-- Audit rows: one per real change, none for the no-op cancel, and audit_log stays append-only.
select results_eq(
  $$ select action, count(*)::int from public.audit_log where actor_id = 'a4444444-1111-4111-8111-111111111111' group by action order by action $$,
  $$ values ('account.deletion_cancelled', 1), ('account.deletion_requested', 1), ('session.sign_out_all', 1) $$,
  'request, cancel and global sign-out are each audited once'
);
select throws_ok($$ delete from public.audit_log where actor_id = 'a4444444-1111-4111-8111-111111111111' $$, null, null, 'audit_log rows cannot be deleted');

select * from finish();
rollback;
