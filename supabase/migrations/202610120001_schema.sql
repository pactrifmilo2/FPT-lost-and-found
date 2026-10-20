-- Application tables; apply to a Supabase project with Auth and Storage enabled.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 1 and 120),
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);
create table public.categories (
  id text primary key,
  name text not null check (length(btrim(name)) between 1 and 120),
  emoji text not null default '📦',
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$')
);
create table public.locations (
  id text primary key,
  name text not null check (length(btrim(name)) between 1 and 120),
  kind text not null check (kind in ('building', 'area'))
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('lost', 'found')),
  item_name text not null check (length(btrim(item_name)) between 1 and 200),
  category_id text not null references public.categories(id) on delete restrict,
  description text not null check (length(btrim(description)) between 1 and 5000),
  date date not null,
  time time,
  location_id text not null references public.locations(id) on delete restrict,
  building text not null default '',
  floor_room text not null default '',
  image_path text unique,
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  reporter_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  status text not null,
  distinguishing_characteristics text not null default '',
  contact_preference text not null default '',
  current_holder text check (current_holder in ('finder', 'security-desk', 'student-services')),
  moderation_status text not null default 'VISIBLE' check (moderation_status in ('VISIBLE', 'HIDDEN')),
  moderated_by uuid references public.profiles(id) on delete restrict,
  moderated_at timestamptz,
  moderation_reason text,
  check ((kind = 'lost' and status in ('LOST','CLAIM_IN_PROGRESS','RETURNED','CLOSED')
    and length(btrim(distinguishing_characteristics)) > 0 and length(btrim(contact_preference)) > 0 and current_holder is null)
    or (kind = 'found' and status in ('AVAILABLE','CLAIM_IN_PROGRESS','RETURNED','CLOSED') and current_holder is not null)),
  check (moderation_status <> 'HIDDEN' or (moderated_by is not null and moderated_at is not null and length(btrim(moderation_reason)) > 0))
);
create table public.report_private (
  report_id uuid primary key references public.reports(id) on delete cascade,
  private_verification_info text not null check (length(btrim(private_verification_info)) between 1 and 5000)
);
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  found_item_id uuid not null references public.reports(id) on delete restrict,
  lost_item_id uuid references public.reports(id) on delete restrict,
  claimant_id uuid not null references public.profiles(id) on delete restrict,
  claimant_name text not null,
  explanation text not null check (length(btrim(explanation)) between 1 and 5000),
  distinguishing_characteristics text not null check (length(btrim(distinguishing_characteristics)) between 1 and 5000),
  proof_of_ownership text,
  contact_info text not null check (length(btrim(contact_info)) between 1 and 500),
  status text not null default 'PENDING' check (status in ('PENDING','UNDER_REVIEW','APPROVED','REJECTED','COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  staff_note text,
  check (found_item_id <> lost_item_id)
);
create index reports_reporter_idx on public.reports(reporter_id);
create index reports_feed_idx on public.reports(moderation_status, created_at desc, id);
create index reports_category_idx on public.reports(category_id);
create index reports_location_idx on public.reports(location_id);
create index claims_claimant_idx on public.claims(claimant_id, created_at desc);
create index claims_found_idx on public.claims(found_item_id, status);
create index claims_lost_idx on public.claims(lost_item_id, status);
create unique index claims_one_active_per_user on public.claims(found_item_id, claimant_id)
  where status in ('PENDING','UNDER_REVIEW','APPROVED');
create unique index claims_one_found_winner on public.claims(found_item_id)
  where status in ('APPROVED','COMPLETED');
create unique index claims_one_lost_winner on public.claims(lost_item_id)
  where lost_item_id is not null and status in ('APPROVED','COMPLETED');

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create function private.require_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;
create function private.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_user();
  if not private.is_admin() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
end;
$$;
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), 'Thành viên'), 120), 'member');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.locations enable row level security;
alter table public.reports enable row level security;
alter table public.report_private enable row level security;
alter table public.claims enable row level security;
revoke all on public.profiles, public.categories, public.locations, public.reports, public.report_private, public.claims from anon, authenticated;
grant select on public.profiles, public.categories, public.locations, public.reports, public.report_private, public.claims to authenticated;
grant insert, update, delete on public.categories, public.locations to authenticated;
grant all on public.profiles, public.categories, public.locations, public.reports, public.report_private, public.claims to service_role;

create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy categories_read on public.categories for select to authenticated using (true);
create policy categories_admin on public.categories for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy locations_read on public.locations for select to authenticated using (true);
create policy locations_admin on public.locations for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy claims_read on public.claims for select to authenticated
  using (claimant_id = (select auth.uid()) or (select private.is_admin()));
create policy reports_read on public.reports for select to authenticated using (
  moderation_status = 'VISIBLE' or reporter_id = (select auth.uid()) or (select private.is_admin())
  or exists(select 1 from public.claims c where c.claimant_id = (select auth.uid())
    and (c.found_item_id = reports.id or c.lost_item_id = reports.id))
);
create policy report_private_admin_read on public.report_private for select to authenticated
  using ((select private.is_admin()));

-- Only these helpers are needed by RLS. Other private functions are internal.
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;
