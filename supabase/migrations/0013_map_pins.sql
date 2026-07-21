-- Milestone 7: map view with approximate pins.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001-0012.
--
-- PROJECT.md is explicit: "Map view showing approximate pins (exact
-- address hidden until claimed)". Raw lat/lng is exactly as precise as a
-- street address - pinning it on a public map would defeat the whole
-- point of approx_location_label existing and violate the non-negotiable
-- "exact address never shown publicly" rule from section 5. So this
-- function, like get_listing_private_location(), is SECURITY DEFINER
-- (bypasses the column-level revoke on `location` from
-- 0004_listing_location_privacy.sql) - but unlike that one, it's public
-- to everyone and only ever returns *rounded* coordinates (~111m/0.001°),
-- never the real ones, for every active listing rather than gating on
-- ownership/acceptance.

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
  where l.status = 'active' and l.location is not null;
$$;

grant execute on function public.get_active_listing_map_pins() to anon, authenticated;
