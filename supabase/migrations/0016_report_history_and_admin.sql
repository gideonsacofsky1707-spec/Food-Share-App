-- Follow-up to milestone 9: preserve report history through deletion, and a
-- minimal admin/ban system.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001-0015.

-- 1. Preserve report history --------------------------------------------
--
-- A report should survive the deletion of whatever it targeted, so there's
-- still a record that "this user/listing was reported" even after the
-- account or listing is gone. 0015 defined reported_user_id/
-- reported_listing_id inline (via `references ... on delete cascade`)
-- without naming the constraints, so rather than assume what Postgres
-- auto-generated, find and drop whatever FK actually exists on each column
-- before adding its on-delete-set-null replacement. reporter_id is
-- untouched (still cascades) - if the reporter's own account is gone,
-- there's no one to attribute the report to.
do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'public.reports'::regclass
    and contype = 'f'
    and conkey = array[(
      select attnum from pg_attribute
      where attrelid = 'public.reports'::regclass and attname = 'reported_user_id'
    )];
  if v_constraint is not null then
    execute format('alter table public.reports drop constraint %I', v_constraint);
  end if;

  select conname into v_constraint
  from pg_constraint
  where conrelid = 'public.reports'::regclass
    and contype = 'f'
    and conkey = array[(
      select attnum from pg_attribute
      where attrelid = 'public.reports'::regclass and attname = 'reported_listing_id'
    )];
  if v_constraint is not null then
    execute format('alter table public.reports drop constraint %I', v_constraint);
  end if;
end $$;

alter table public.reports
  add constraint reports_reported_user_id_fkey
  foreign key (reported_user_id) references public.users (id) on delete set null;

alter table public.reports
  add constraint reports_reported_listing_id_fkey
  foreign key (reported_listing_id) references public.listings (id) on delete set null;

-- A SET NULL cascade on the sole remaining target would otherwise fail
-- against this check (a delete failing because of an unrelated table's
-- constraint is exactly backwards) - drop it. submitReportAction still
-- requires a target when a report is *created*; this only relaxes what a
-- report can degrade to over time as things it referenced get deleted.
alter table public.reports drop constraint if exists reports_target_required;

-- 2. Minimal admin/ban system ---------------------------------------------

alter table public.users add column if not exists is_admin boolean not null default false;
alter table public.users add column if not exists is_banned boolean not null default false;
alter table public.users add column if not exists banned_at timestamptz;

-- SECURITY DEFINER so it can be used from RLS policies (same escape hatch
-- as user_owns_listing etc., 0007) - it's really just a named, reusable
-- predicate over a column "Profiles are viewable by everyone" (0001)
-- already exposes anyway.
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.users where id = p_user_id), false);
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- Admins can see every report, not just their own (additive to 0015's
-- reporter-only policy).
create policy "Admins can view all reports"
  on public.reports for select
  using (public.is_admin(auth.uid()));

-- An admin reviewing a report about a listing needs to see it regardless of
-- its current status (e.g. it's since been removed) - additive to the
-- existing owner/active/claimer policies on listings.
create policy "Admins can view all listings"
  on public.listings for select
  using (public.is_admin(auth.uid()));

-- Banning goes through this function rather than a broad "admins can
-- update any user" RLS policy, so an admin can only ever flip
-- is_banned/banned_at - never edit someone else's display_name, ratings,
-- etc. Also guards against self-bans, which could otherwise lock an admin
-- out with no unban UI (by design - see PROJECT.md milestone 9 follow-up
-- request) to recover with.
create or replace function public.ban_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot ban yourself';
  end if;

  update public.users
  set is_banned = true, banned_at = now()
  where id = p_user_id;
end;
$$;

grant execute on function public.ban_user(uuid) to authenticated;
