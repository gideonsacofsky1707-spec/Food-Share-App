-- Front-loaded geo work for milestone 7: real coordinates + address privacy.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001-0003.
--
-- `location` (lat/lng) and `exact_address` already exist as columns on
-- public.listings (added in 0002, unused until now). Both are exactly as
-- sensitive as a street address pinned on a map, so per PROJECT.md ("Exact
-- address never shown publicly - only after a claim is accepted"), we lock
-- them down at the column-privilege level rather than trusting the
-- application layer alone: no role can SELECT them directly, only the
-- get_listing_private_location() function below (SECURITY DEFINER, so it
-- runs as the table owner and bypasses the revoke) can, and only for the
-- listing's owner.
--
-- There's no claims table yet (that's milestone 5), so the "accepted
-- claimer" branch of the visibility rule is stubbed out below - extend the
-- `if` in get_listing_private_location() with an EXISTS check against
-- claims once that table lands.

revoke select (location, exact_address) on public.listings from anon, authenticated;

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

  if auth.uid() is distinct from v_owner_id then
    -- Milestone 5 TODO: also allow an accepted claimer, e.g.
    --   or exists (
    --     select 1 from public.claims c
    --     where c.listing_id = p_listing_id
    --       and c.claimer_id = auth.uid()
    --       and c.status = 'accepted'
    --   )
    return; -- not the owner (yet): no rows
  end if;

  return query
    select l.exact_address, st_y(l.location::geometry), st_x(l.location::geometry)
    from public.listings l
    where l.id = p_listing_id;
end;
$$;

grant execute on function public.get_listing_private_location(uuid) to anon, authenticated;
