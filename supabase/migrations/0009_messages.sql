-- Milestone 6: simple chat thread tied to an accepted claim.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001-0008.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_claim_id_idx on public.messages (claim_id);

alter table public.messages enable row level security;

-- Same SECURITY DEFINER escape hatch as 0007 (user_owns_listing,
-- user_has_claim_on_listing): a function that queries claims/listings
-- internally bypasses their RLS since it runs as the table owner, so a
-- messages policy can check claim participation without risking a cycle
-- back through claims'/listings' own cross-table policies. Chat is scoped
-- to *accepted* claims per the task, so that's baked into the one check
-- both the select and insert policies use.
create or replace function public.user_is_accepted_claim_participant(p_claim_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.claims c
    join public.listings l on l.id = c.listing_id
    where c.id = p_claim_id
      and c.status = 'accepted'
      and (c.claimer_id = p_user_id or l.owner_id = p_user_id)
  );
$$;

grant execute on function public.user_is_accepted_claim_participant(uuid, uuid) to authenticated;

create policy "Claim participants can view messages on accepted claims"
  on public.messages for select
  using (public.user_is_accepted_claim_participant(claim_id, auth.uid()));

create policy "Claim participants can send messages on accepted claims"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.user_is_accepted_claim_participant(claim_id, auth.uid())
  );

-- Notify whichever participant didn't send the message.
create or replace function public.notify_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimer_id uuid;
  v_owner_id uuid;
  v_listing_title text;
  v_recipient_id uuid;
begin
  select c.claimer_id, l.owner_id, l.title
    into v_claimer_id, v_owner_id, v_listing_title
  from public.claims c
  join public.listings l on l.id = c.listing_id
  where c.id = new.claim_id;

  if v_claimer_id is null then
    return new;
  end if;

  v_recipient_id := case when new.sender_id = v_claimer_id then v_owner_id else v_claimer_id end;

  insert into public.notifications (user_id, message, link)
  values (
    v_recipient_id,
    'New message about "' || v_listing_title || '"',
    '/claims/' || new.claim_id
  );

  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute procedure public.notify_on_new_message();
