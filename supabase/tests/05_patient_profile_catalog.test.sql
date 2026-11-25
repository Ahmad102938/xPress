-- Catalog test (docs/specs/signed-in-home.md item 6). Every public table with a patient_profile_id
-- column must keep RLS on, read through actable_profile_ids(), never key a policy on account_id,
-- and give authenticated no direct write grant (writes go through definer functions).
-- profile_access is the one exemption: its own policy is account_id = auth.uid().
-- A future module that forgets this fails CI here.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

create temporary view profile_tables as
  select c.oid, c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attname = 'patient_profile_id' and not a.attisdropped
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'profile_access';

select ok((select count(*) > 0 from profile_tables), 'at least one table is keyed on patient_profile_id');

select is(
  (select array_agg(t.relname order by t.relname) from profile_tables t join pg_class c on c.oid = t.oid where not c.relrowsecurity),
  null, 'every patient_profile_id table has RLS on'
);

select is(
  (select array_agg(t.relname order by t.relname) from profile_tables t
   where not exists (
     select 1 from pg_policies p
     where p.schemaname = 'public' and p.tablename = t.relname and p.cmd in ('SELECT', 'ALL')
       and p.qual like '%actable_profile_ids%'
   )),
  null, 'every patient_profile_id table has a select policy calling actable_profile_ids'
);

select is(
  (select array_agg(p.policyname order by p.policyname) from pg_policies p
   join profile_tables t on t.relname = p.tablename
   where p.schemaname = 'public'
     and (coalesce(p.qual, '') like '%account_id%' or coalesce(p.with_check, '') like '%account_id%')),
  null, 'no policy on a patient_profile_id table keys on account_id'
);

select is(
  (select array_agg(t.relname || ':' || priv order by t.relname, priv) from profile_tables t,
     unnest(array['INSERT', 'UPDATE', 'DELETE']) priv
   where has_table_privilege('authenticated', t.oid, priv)),
  null, 'authenticated has no insert, update or delete grant on any patient_profile_id table'
);

select is(
  (select string_agg(policyname::text || ' ' || cmd || ' ' || coalesce(qual, ''), '; ')
   from pg_policies where schemaname = 'public' and tablename = 'profile_access'),
  'profile_access_select_own SELECT (account_id = ( SELECT auth.uid() AS uid))',
  'profile_access has only its own-account select policy'
);

select * from finish();
rollback;
