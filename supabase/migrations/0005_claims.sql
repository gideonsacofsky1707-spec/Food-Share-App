-- Milestone 5: claim a listing, owner accepts/declines.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001-0004.

create type public.claim_status as enum ('requested', 'accepted', 'declined', 'completed', 'cancelled');

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  claimer_id uuid not null references public.users (id) on delete cascade,
  status public.claim_status not null default 'requested',
  created_at timestamptz not null default now()
);

create index if not exists claims_listing_id_idx on public.claims (listing_id);
create index if not exists claims_claimer_id_idx on public.claims (claimer_id);

-- One live (requested/accepted) claim per claimer per listing. They can
-- request again after a decline (that just inserts a new row) - nothing in
-- PROJECT.md says a past decline should be permanent.
create unique index if not exists claims_one_live_per_claimer_idx
  on public.claims (listing_id, claimer_id)
  where status in ('requested', 'accepted');

alter table public.claims enable row level security;

create policy "Claimers and listing owners can view relevant claims"
  on public.claims for select
  using (
    claimer_id = auth.uid()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

create policy "Users can request active listings that aren't their own"
  on public.claims for insert
  with check (
    claimer_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'active' and l.owner_id <> auth.uid()
    )
  );

-- Accept/decline go through the functions below (so listing status and
-- competing claims stay consistent); this policy is what lets those
-- SECURITY DEFINER functions' underlying updates count as authorized, and
-- is deliberately not exposed for owners to update claims directly from
-- the client.
create policy "Listing owners can update claims on their listings"
  on public.claims for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- A claimer needs to see the listing they claimed even after its status
-- moves off "active" (claimed/collected/etc.) - the existing "everyone can
-- view active listings" policy from 0003 no longer covers it at that point.
create policy "Claimers can view listings they've requested"
  on public.listings for select
  using (
    exists (
      select 1 from public.claims c
      where c.listing_id = id and c.claimer_id = auth.uid()
    )
  );

-- Now that claims exist, an accepted claimer should see the owner's exact
-- address too - fills in the TODO left in 0004_listing_location_privacy.sql.
create or replace function public.get_listing_private_location(p_listing_id uuid)
returns table (exact_address text, lat double precision, lng double precision)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select l.owner_id into v_owner_id from public.listings l where l.id = p_listing_id;

  if v_owner_id is null then
    return; -- listing doesn't exist: no rows
  end if;

  if auth.uid() is distinct from v_owner_id
     and not exists (
       select 1 from public.claims c
       where c.listing_id = p_listing_id
         and c.claimer_id = auth.uid()
         and c.status = 'accepted'
     )
  then
    return; -- not the owner, and no accepted claim: no rows
  end if;

  return query
    select l.exact_address, st_y(l.location::geometry), st_x(l.location::geometry)
    from public.listings l
    where l.id = p_listing_id;
end;
$$;

create or replace function public.accept_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_owner_id uuid;
  v_listing_status public.listing_status;
begin
  select c.listing_id, l.owner_id, l.status
    into v_listing_id, v_owner_id, v_listing_status
  from public.claims c
  join public.listings l on l.id = c.listing_id
  where c.id = p_claim_id;

  if v_owner_id is null then
    raise exception 'Claim not found';
  end if;

  if auth.uid() is distinct from v_owner_id then
    raise exception 'Not authorized';
  end if;

  if v_listing_status <> 'active' then
    raise exception 'Listing is not active';
  end if;

  update public.claims set status = 'accepted' where id = p_claim_id;
  update public.listings set status = 'claimed' where id = v_listing_id;

  -- The listing is spoken for now, so any other pending request on it is
  -- implicitly declined.
  update public.claims
  set status = 'declined'
  where listing_id = v_listing_id
    and id <> p_claim_id
    and status = 'requested';
end;
$$;

grant execute on function public.accept_claim(uuid) to authenticated;
