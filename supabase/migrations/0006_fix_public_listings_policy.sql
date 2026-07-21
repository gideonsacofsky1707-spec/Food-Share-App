-- Fix: listings from one account weren't showing up on /browse for other
-- accounts. The "Active listings are viewable by everyone" policy from
-- 0003_public_active_listings.sql was missing on the live database (RLS on
-- public.listings only had the owner-only policy from 0002 in effect),
-- so a viewer only ever saw their own rows there. Re-applying idempotently
-- rather than assuming why it didn't take.

alter table public.listings enable row level security;

drop policy if exists "Active listings are viewable by everyone" on public.listings;
create policy "Active listings are viewable by everyone"
  on public.listings for select
  using (status = 'active');
