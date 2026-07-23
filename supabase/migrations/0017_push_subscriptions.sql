-- Web Push subscriptions, for real browser/device-level push notifications
-- (separate from the in-app public.notifications table). Run this once in
-- the Supabase project's SQL editor (or via `supabase db push`), after
-- 0001-0016.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- No UPDATE policy on purpose: the app never needs to modify an existing
-- subscription row, only insert a new one (a unique-violation on endpoint
-- from re-subscribing is treated as already-subscribed by the caller) or
-- delete one, both covered above.

-- No SELECT/DELETE access is granted for anon/authenticated to read or
-- remove *another* user's rows - sending a push notification to someone
-- else therefore reads this table with the Supabase service role key from
-- trusted server code (src/lib/push.ts), never through the request-scoped,
-- RLS-bound client used elsewhere in the app.
