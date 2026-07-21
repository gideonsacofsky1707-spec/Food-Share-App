-- Fix: "infinite recursion detected in policy for relation listings" when
-- creating a listing.
--
-- Root cause: an INSERT ... RETURNING (which is what
-- `.insert(...).select("id")` compiles to) makes Postgres check the
-- table's SELECT policies against the returned row, same as a plain
-- SELECT would. One of listings' SELECT policies
-- ("Claimers can view listings they've requested", from 0005) queries
-- public.claims - and claims' SELECT/INSERT/UPDATE policies query back
-- into public.listings. Evaluating either table's policy chases into the
-- other's, forever: a genuine cycle between the two tables' RLS policies,
-- not just a performance problem.
--
-- Fix: move the cross-table checks into SECURITY DEFINER functions.
-- Postgres skips RLS when the *table owner* queries a table directly
-- (unless FORCE ROW LEVEL SECURITY is set, which we don't use anywhere
-- here), so a SECURITY DEFINER function owned by the table owner can look
-- at the other table without re-triggering its RLS policies - breaking the
-- cycle while keeping the exact same access rules. This is the same escape
-- hatch get_listing_private_location() and accept_claim() already use.

create or replace function public.user_owns_listing(p_listing_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.owner_id = p_user_id
  );
$$;

create or replace function public.user_has_claim_on_listing(p_listing_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.claims c
    where c.listing_id = p_listing_id and c.claimer_id = p_user_id
  );
$$;

grant execute on function public.user_owns_listing(uuid, uuid) to anon, authenticated;
grant execute on function public.user_has_claim_on_listing(uuid, uuid) to anon, authenticated;

-- listings: stop querying claims directly.
drop policy if exists "Claimers can view listings they've requested" on public.listings;
create policy "Claimers can view listings they've requested"
  on public.listings for select
  using (public.user_has_claim_on_listing(id, auth.uid()));

-- claims: stop querying listings directly for ownership checks (the
-- "listing must be active" part of the insert check isn't part of the
-- cycle - listings' policies never reference claims anymore after the
-- change above - so it's left as a plain subquery).
drop policy if exists "Claimers and listing owners can view relevant claims" on public.claims;
create policy "Claimers and listing owners can view relevant claims"
  on public.claims for select
  using (
    claimer_id = auth.uid()
    or public.user_owns_listing(listing_id, auth.uid())
  );

drop policy if exists "Users can request active listings that aren't their own" on public.claims;
create policy "Users can request active listings that aren't their own"
  on public.claims for insert
  with check (
    claimer_id = auth.uid()
    and not public.user_owns_listing(listing_id, auth.uid())
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'active'
    )
  );

drop policy if exists "Listing owners can update claims on their listings" on public.claims;
create policy "Listing owners can update claims on their listings"
  on public.claims for update
  using (public.user_owns_listing(listing_id, auth.uid()));
