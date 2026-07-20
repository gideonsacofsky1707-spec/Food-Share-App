-- Milestone 2: auth + profile support.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`).

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  rating_avg numeric not null default 0,
  rating_count integer not null default 0,
  is_verified boolean not null default false
);

alter table public.users enable row level security;

create policy "Profiles are viewable by everyone"
  on public.users for select
  using (true);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up, using the
-- display_name passed in signUp()'s options.data. SECURITY DEFINER so it
-- runs regardless of RLS, and fires even before email confirmation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Avatar storage: public bucket, but each user may only write inside a
-- folder named after their own uid (avatars/<uid>/<filename>).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
