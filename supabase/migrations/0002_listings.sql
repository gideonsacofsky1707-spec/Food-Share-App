-- Milestone 3: listings CRUD + photo storage.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001_users_and_avatars.sql.

create extension if not exists postgis;

create type public.listing_status as enum ('active', 'claimed', 'collected', 'expired', 'removed');

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text not null,
  photo_url text,
  quantity text not null,
  best_by timestamptz,
  pickup_window_start timestamptz not null,
  pickup_window_end timestamptz not null,
  location geography(point, 4326),
  approx_location_label text,
  exact_address text,
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists listings_owner_id_idx on public.listings (owner_id);

alter table public.listings enable row level security;

-- Only the owner can see their own listings for now. A "public can view
-- active listings" policy belongs to the browse milestone, once there's a
-- page that needs it.
create policy "Owners can view their own listings"
  on public.listings for select
  using (auth.uid() = owner_id);

create policy "Owners can insert their own listings"
  on public.listings for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their own listings"
  on public.listings for update
  using (auth.uid() = owner_id);

-- Photo storage: public bucket, but each user may only write inside a
-- folder named after their own uid (listing-photos/<uid>/<listing id>.<ext>).
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

create policy "Listing photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "Owners can upload their own listing photos"
  on storage.objects for insert
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owners can update their own listing photos"
  on storage.objects for update
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owners can delete their own listing photos"
  on storage.objects for delete
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
