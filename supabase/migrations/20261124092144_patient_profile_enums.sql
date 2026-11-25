-- Patient profiles (docs/specs/signed-in-home.md, Part B): enums only.
-- Kept in their own migration as one concern per file (docs/SUPABASE.md §7).

-- How a dependent relates to the account holder. 'self' is the account holder's own profile.
create type public.profile_relationship as enum (
  'self',
  'child',
  'parent',
  'spouse',
  'sibling',
  'grandparent',
  'other'
);
comment on type public.profile_relationship is 'Relationship of a patient profile to the account that manages it. Exactly one self profile per account.';

create type public.profile_gender as enum ('female', 'male', 'other', 'prefer_not_to_say');
comment on type public.profile_gender is 'Optional gender of a patient profile, for doctor context. Personal data.';

-- Only the owner grant exists today; later roles (second guardian, carer) are new values here.
create type public.profile_access_role as enum ('owner');
comment on type public.profile_access_role is 'Role of an access grant in profile_access. Only owner today.';

-- read: see the profile (archived included). manage: edit it and its addresses. book: book care for it.
-- view_records: see its health records (self and minors only until decision D22).
create type public.profile_capability as enum ('read', 'manage', 'book', 'view_records');
comment on type public.profile_capability is 'What an access helper call asks for. See actable_profile_ids().';
