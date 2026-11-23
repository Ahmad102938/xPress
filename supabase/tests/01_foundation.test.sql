-- Foundation tests: grants, append-only audit log, rate limiter, legal versions, cleanup schedule.
-- Synthetic data only. Everything runs in one transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(40);

-- ---------------------------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass), 'audit_log has RLS on');
select ok((select relrowsecurity from pg_class where oid = 'public.rate_limits'::regclass), 'rate_limits has RLS on');
select ok((select relrowsecurity from pg_class where oid = 'public.legal_versions'::regclass), 'legal_versions has RLS on');

select table_privs_are('public', 'audit_log', 'anon', array[]::text[], 'anon has no privileges on audit_log');
select table_privs_are('public', 'audit_log', 'authenticated', array[]::text[], 'authenticated has no privileges on audit_log');
select table_privs_are('public', 'audit_log', 'service_role', array['SELECT'], 'service_role can only read audit_log');

select table_privs_are('public', 'rate_limits', 'anon', array[]::text[], 'anon has no privileges on rate_limits');
select table_privs_are('public', 'rate_limits', 'authenticated', array[]::text[], 'authenticated has no privileges on rate_limits');
select table_privs_are('public', 'rate_limits', 'service_role', array['DELETE', 'SELECT'], 'service_role can read and clear rate_limits');

select table_privs_are('public', 'legal_versions', 'anon', array[]::text[], 'anon has no privileges on legal_versions');
select table_privs_are('public', 'legal_versions', 'authenticated', array['SELECT'], 'authenticated can only read legal_versions');

select ok(not has_function_privilege('authenticated', 'public.rate_limit_hit(text, integer, integer)', 'execute'), 'authenticated cannot call rate_limit_hit');
select ok(not has_function_privilege('anon', 'public.rate_limit_hit(text, integer, integer)', 'execute'), 'anon cannot call rate_limit_hit');
select ok(has_function_privilege('service_role', 'public.rate_limit_hit(text, integer, integer)', 'execute'), 'service_role can call rate_limit_hit');
select ok(has_function_privilege('supabase_auth_admin', 'public.rate_limit_hit(text, integer, integer)', 'execute'), 'the SMS hook role can call rate_limit_hit');
select ok(not has_function_privilege('authenticated', 'public.rate_limit_reset(text)', 'execute'), 'authenticated cannot call rate_limit_reset');
select ok(not has_function_privilege('authenticated', 'public.rate_limits_cleanup()', 'execute'), 'authenticated cannot call rate_limits_cleanup');
select ok(not has_function_privilege('service_role', 'public.write_audit(uuid, text, text, uuid, jsonb)', 'execute'), 'no API role can call write_audit');
select ok(not has_function_privilege('authenticated', 'public.write_audit(uuid, text, text, uuid, jsonb)', 'execute'), 'authenticated cannot call write_audit');

-- ---------------------------------------------------------------------------------------------
-- audit_log is append-only
-- ---------------------------------------------------------------------------------------------
select lives_ok(
  $$ select public.write_audit('00000000-0000-4000-8000-0000000000a1', 'test.event', 'user', null, '{"k":"v"}') $$,
  'write_audit appends a row'
);
select is((select count(*)::int from public.audit_log where action = 'test.event'), 1, 'the audit row exists');
select throws_ok(
  $$ update public.audit_log set action = 'test.changed' where action = 'test.event' $$,
  '42501', null, 'UPDATE on audit_log is rejected even for the owner'
);
select throws_ok(
  $$ delete from public.audit_log where action = 'test.event' $$,
  '42501', null, 'DELETE on audit_log is rejected even for the owner'
);
select throws_ok($$ truncate public.audit_log $$, '42501', null, 'TRUNCATE on audit_log is rejected');
select throws_ok(
  $$ insert into public.audit_log (action) values ('Bad Action') $$,
  '23514', null, 'audit actions must be lower-case dotted names'
);

set local role authenticated;
select throws_ok($$ select count(*) from public.audit_log $$, '42501', null, 'authenticated cannot read audit_log');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Rate limiter
-- ---------------------------------------------------------------------------------------------
select is(public.rate_limit_hit(repeat('a', 64), 600, 3), true, 'hit 1 of 3 is allowed');
select is(public.rate_limit_hit(repeat('a', 64), 600, 3), true, 'hit 2 of 3 is allowed');
select is(public.rate_limit_hit(repeat('a', 64), 600, 3), true, 'hit 3 of 3 is allowed');
select is(public.rate_limit_hit(repeat('a', 64), 600, 3), false, 'hit 4 is blocked');

-- Move the window into the past: the next hit starts a new window.
update public.rate_limits set window_start = now() - interval '11 minutes' where key_hash = repeat('a', 64);
select is(public.rate_limit_hit(repeat('a', 64), 600, 3), true, 'a new window starts after the old one expires');
select is((select hits from public.rate_limits where key_hash = repeat('a', 64)), 1, 'the new window counts from 1');

select lives_ok($$ select public.rate_limit_reset(repeat('a', 64)) $$, 'rate_limit_reset runs');
select is((select count(*)::int from public.rate_limits where key_hash = repeat('a', 64)), 0, 'rate_limit_reset removes only that key');

select throws_ok($$ select public.rate_limit_hit('dest:+919000000001', 600, 3) $$, '22023', null, 'raw (unhashed) keys are rejected');
select throws_ok($$ select public.rate_limit_hit(repeat('b', 64), 0, 3) $$, '22023', null, 'a zero window is rejected');

insert into public.rate_limits (key_hash, window_start, hits) values (repeat('c', 64), now() - interval '2 days', 9);
select is(public.rate_limits_cleanup(), 1, 'cleanup deletes windows older than one day');

-- ---------------------------------------------------------------------------------------------
-- legal_versions
-- ---------------------------------------------------------------------------------------------
set local role authenticated;
select results_eq(
  $$ select consent_type::text, version from public.legal_versions order by 1 $$,
  $$ values ('marketing', 'draft-2026-11'), ('terms_privacy', 'draft-2026-11') $$,
  'legal_versions holds the placeholder versions that packages/core LEGAL_VERSIONS mirrors'
);
select throws_ok(
  $$ update public.legal_versions set version = 'forged' $$,
  '42501', null, 'authenticated cannot change legal versions'
);
reset role;

-- ---------------------------------------------------------------------------------------------
-- Scheduled cleanup
-- ---------------------------------------------------------------------------------------------
select ok(exists (select 1 from cron.job where jobname = 'rate-limits-cleanup'), 'pg_cron schedules the rate limit cleanup');

select * from finish();
rollback;
