-- Role assignment remains visible on a user's own profile so they can enroll.
-- Every elevated read and write uses this helper, including Storage and RPCs.
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()->>'aal') = 'aal2', false)
    and exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    );
$$;
