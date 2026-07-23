-- Milestone 9: reporting + blocking.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001-0014.

create type public.report_status as enum ('open', 'reviewed', 'resolved');

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  reported_user_id uuid references public.users (id) on delete cascade,
  reported_listing_id uuid references public.listings (id) on delete cascade,
  reason text not null,
  -- Not in PROJECT.md's original reports schema, but the report form asks
  -- for "reason + optional details" - reason is the fixed dropdown value,
  -- details is the free-text elaboration.
  details text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint reports_reporter_not_self check (reporter_id <> reported_user_id),
  constraint reports_target_required check (
    reported_user_id is not null or reported_listing_id is not null
  )
);

create index if not exists reports_reporter_id_idx on public.reports (reporter_id);

alter table public.reports enable row level security;

-- Reports are trust & safety data - only the reporter can see their own
-- submitted reports (so they get a confirmation trail), not the person or
-- listing being reported. There's no moderator/admin role in this MVP to
-- grant broader read access to; triaging `status` is a future concern.
create policy "Reporters can view their own reports"
  on public.reports for select
  using (reporter_id = auth.uid());

create policy "Users can report listings or other users"
  on public.reports for insert
  with check (reporter_id = auth.uid());

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

-- One block per pair, in a given direction.
create unique index if not exists blocks_blocker_blocked_idx
  on public.blocks (blocker_id, blocked_id);

create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- A user can see and manage their own block list, but not whether they've
-- been blocked by someone else - same "don't reveal who blocked whom"
-- reasoning as most platforms with a block feature.
create policy "Users can view who they've blocked"
  on public.blocks for select
  using (blocker_id = auth.uid());

create policy "Users can block other users"
  on public.blocks for insert
  with check (blocker_id = auth.uid());

create policy "Users can unblock users they've blocked"
  on public.blocks for delete
  using (blocker_id = auth.uid());

-- SECURITY DEFINER so it can be called from listings'/claims'/messages'
-- policies without re-triggering blocks' own RLS (same escape hatch as
-- user_owns_listing etc. in 0007) - and so it works from a policy on
-- anon's behalf too (browsing while logged out never matches a block,
-- since blocker_id/blocked_id are never null there).
create or replace function public.users_have_block(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_user_a and blocked_id = p_user_b)
       or (blocker_id = p_user_b and blocked_id = p_user_a)
  );
$$;

grant execute on function public.users_have_block(uuid, uuid) to anon, authenticated;

-- Resolves who's on the *other* side of a claim, regardless of its status -
-- unlike ratings' claim_other_participant (0014), which only resolves once
-- completed. Used only to find who a message's sender would be messaging,
-- so it doesn't need to double as an authorization check itself.
create or replace function public.claim_counterpart(p_claim_id uuid, p_user_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select case
    when c.claimer_id = p_user_id then l.owner_id
    when l.owner_id = p_user_id then c.claimer_id
    else null
  end
  from public.claims c
  join public.listings l on l.id = c.listing_id
  where c.id = p_claim_id;
$$;

grant execute on function public.claim_counterpart(uuid, uuid) to authenticated;

-- Blocked users' listings are hidden from each other: additive to the
-- "active listings are viewable by everyone" rule, so owners still see
-- their own listings via the separate owner-only policy regardless of who
-- they've blocked or been blocked by.
drop policy if exists "Active listings are viewable by everyone" on public.listings;
create policy "Active listings are viewable by everyone"
  on public.listings for select
  using (status = 'active' and not public.users_have_block(owner_id, auth.uid()));

-- Same exclusion for the map view's pins.
create or replace function public.get_active_listing_map_pins()
returns table (
  id uuid,
  title text,
  photo_url text,
  quantity text,
  approx_lat double precision,
  approx_lng double precision
)
language sql
security definer
stable
set search_path = public
as $$
  select
    l.id,
    l.title,
    l.photo_url,
    l.quantity,
    round(st_y(l.location::geometry)::numeric, 3)::double precision as approx_lat,
    round(st_x(l.location::geometry)::numeric, 3)::double precision as approx_lng
  from public.listings l
  where l.status = 'active'
    and l.location is not null
    and not public.users_have_block(l.owner_id, auth.uid());
$$;

grant execute on function public.get_active_listing_map_pins() to anon, authenticated;

-- Blocked users can't request each other's listings.
drop policy if exists "Users can request active listings that aren't their own" on public.claims;
create policy "Users can request active listings that aren't their own"
  on public.claims for insert
  with check (
    claimer_id = auth.uid()
    and not public.user_owns_listing(listing_id, auth.uid())
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'active'
    )
    and not exists (
      select 1 from public.listings l
      where l.id = listing_id
        and public.users_have_block(l.owner_id, claimer_id)
    )
  );

-- Blocked users can't message each other, even on an already-accepted claim.
drop policy if exists "Claim participants can send messages on accepted claims" on public.messages;
create policy "Claim participants can send messages on accepted claims"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.user_is_accepted_claim_participant(claim_id, auth.uid())
    and not public.users_have_block(sender_id, public.claim_counterpart(claim_id, sender_id))
  );
