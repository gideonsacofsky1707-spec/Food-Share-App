-- Milestone 8: mark a claim collected, then let both parties rate each other.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001-0013.

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  rater_id uuid not null references public.users (id) on delete cascade,
  ratee_id uuid not null references public.users (id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint ratings_rater_ratee_distinct check (rater_id <> ratee_id)
);

-- "Only allow one rating per person per claim."
create unique index if not exists ratings_one_per_rater_per_claim_idx
  on public.ratings (claim_id, rater_id);

create index if not exists ratings_ratee_id_idx on public.ratings (ratee_id);

alter table public.ratings enable row level security;

-- Same SECURITY DEFINER escape hatch as user_owns_listing/
-- user_is_accepted_claim_participant (0007, 0009): resolves who the *other*
-- participant on a claim is, but only once it's completed - so it doubles
-- as the "claim is done and you were part of it" check and the "you can
-- only rate the person on the other side of this exact claim" check in one
-- expression, with no separate lookup a client could tamper with.
create or replace function public.claim_other_participant(p_claim_id uuid, p_user_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select case
    when c.claimer_id = p_user_id then l.owner_id
    when l.owner_id = p_user_id then c.claimer_id
    else null
  end
  from public.claims c
  join public.listings l on l.id = c.listing_id
  where c.id = p_claim_id and c.status = 'completed';
$$;

grant execute on function public.claim_other_participant(uuid, uuid) to authenticated;

create policy "Raters and ratees can view a rating"
  on public.ratings for select
  using (rater_id = auth.uid() or ratee_id = auth.uid());

create policy "Claim participants can rate each other once, after completion"
  on public.ratings for insert
  with check (
    rater_id = auth.uid()
    and ratee_id = public.claim_other_participant(claim_id, auth.uid())
  );

-- Keeps users.rating_avg/rating_count (shown on /profile) in sync with the
-- ratings table - SECURITY DEFINER the same way notify_on_new_message etc.
-- bypass RLS to write a table the client has no UPDATE policy for.
create or replace function public.update_ratee_rating_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set rating_avg = (select coalesce(avg(score), 0) from public.ratings where ratee_id = new.ratee_id),
      rating_count = (select count(*) from public.ratings where ratee_id = new.ratee_id)
  where id = new.ratee_id;
  return new;
end;
$$;

drop trigger if exists on_rating_created on public.ratings;
create trigger on_rating_created
  after insert on public.ratings
  for each row execute procedure public.update_ratee_rating_stats();

-- get_listing_private_location (0004/0005) only revealed the exact address
-- to an *accepted* claimer - widen it to a *completed* one too, for the
-- same reason as the chat-access function below: after either party marks
-- a claim collected, the claimer shouldn't lose access to the address they
-- picked up from (e.g. viewing it later on /requests).
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
         and c.status in ('accepted', 'completed')
     )
  then
    return; -- not the owner, and no accepted/completed claim: no rows
  end if;

  return query
    select l.exact_address, st_y(l.location::geometry), st_x(l.location::geometry)
    from public.listings l
    where l.id = p_listing_id;
end;
$$;

-- Chat access (0009) was scoped to *accepted* claims only, since that
-- milestone predates a "completed" state - widen it so the thread doesn't
-- vanish out from under both parties the moment either of them marks the
-- claim collected.
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
      and c.status in ('accepted', 'completed')
      and (c.claimer_id = p_user_id or l.owner_id = p_user_id)
  );
$$;

-- Either the listing owner or the claimer can mark an accepted claim
-- collected - flips the listing to `collected` and the claim to
-- `completed` together (same atomic-via-SECURITY-DEFINER pattern as
-- accept_claim), and nudges whichever of them didn't call this to go rate
-- the exchange.
create or replace function public.mark_claim_collected(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_owner_id uuid;
  v_claimer_id uuid;
  v_claim_status public.claim_status;
  v_listing_title text;
  v_recipient_id uuid;
begin
  select c.listing_id, l.owner_id, c.claimer_id, c.status, l.title
    into v_listing_id, v_owner_id, v_claimer_id, v_claim_status, v_listing_title
  from public.claims c
  join public.listings l on l.id = c.listing_id
  where c.id = p_claim_id;

  if v_listing_id is null then
    raise exception 'Claim not found';
  end if;

  if auth.uid() is distinct from v_owner_id and auth.uid() is distinct from v_claimer_id then
    raise exception 'Not authorized';
  end if;

  if v_claim_status <> 'accepted' then
    raise exception 'Claim is not accepted';
  end if;

  update public.claims set status = 'completed' where id = p_claim_id;
  update public.listings set status = 'collected' where id = v_listing_id;

  v_recipient_id := case when auth.uid() = v_claimer_id then v_owner_id else v_claimer_id end;

  insert into public.notifications (user_id, message, link)
  values (
    v_recipient_id,
    '"' || v_listing_title || '" was marked picked up - rate the exchange',
    '/claims/' || p_claim_id
  );
end;
$$;

grant execute on function public.mark_claim_collected(uuid) to authenticated;
