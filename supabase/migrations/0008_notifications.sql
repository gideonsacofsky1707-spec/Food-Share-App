-- In-app notifications for the claim flow.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001-0007.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  message text not null,
  link text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can mark their own notifications as read"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No INSERT policy for anon/authenticated on purpose: notifications are
-- only ever created by the SECURITY DEFINER trigger functions below, never
-- directly by a client, so nobody can plant a fake notification for
-- another user.

create or replace function public.notify_owner_on_claim_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_listing_title text;
begin
  select owner_id, title into v_owner_id, v_listing_title
  from public.listings
  where id = new.listing_id;

  if v_owner_id is not null then
    insert into public.notifications (user_id, message, link)
    values (
      v_owner_id,
      'Someone requested "' || v_listing_title || '"',
      '/listings/' || new.listing_id || '/requests'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_claim_requested on public.claims;
create trigger on_claim_requested
  after insert on public.claims
  for each row execute procedure public.notify_owner_on_claim_request();

create or replace function public.notify_claimer_on_claim_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_title text;
begin
  if new.status is distinct from old.status and new.status in ('accepted', 'declined') then
    select title into v_listing_title from public.listings where id = new.listing_id;

    insert into public.notifications (user_id, message, link)
    values (
      new.claimer_id,
      case
        when new.status = 'accepted' then 'Your request for "' || v_listing_title || '" was accepted'
        else 'Your request for "' || v_listing_title || '" was declined'
      end,
      '/requests'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_claim_status_changed on public.claims;
create trigger on_claim_status_changed
  after update on public.claims
  for each row execute procedure public.notify_claimer_on_claim_decision();
