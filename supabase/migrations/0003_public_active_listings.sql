-- Milestone 4: public browse.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001_users_and_avatars.sql and 0002_listings.sql.
--
-- Additive to the existing owner-only select policy on public.listings
-- (Postgres OR's together multiple policies for the same command), so
-- owners still see all of their own listings while everyone else only
-- sees active ones.

create policy "Active listings are viewable by everyone"
  on public.listings for select
  using (status = 'active');
