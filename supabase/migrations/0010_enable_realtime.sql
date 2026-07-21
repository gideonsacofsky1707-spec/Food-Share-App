-- Enable Supabase Realtime (postgres_changes) on messages and notifications.
-- Run this once in the Supabase project's SQL editor (or via `supabase db push`),
-- after 0001-0009.
--
-- Realtime's postgres_changes respects RLS: it evaluates each change
-- against the *same* SELECT policies used for normal queries, using the
-- subscribing client's JWT (auth.uid()). Nothing needs to change on the
-- policies themselves for that to be safe:
--   - messages: "Claim participants can view messages on accepted claims"
--     already scopes to user_is_accepted_claim_participant(claim_id, auth.uid()).
--   - notifications: "Users can view their own notifications" already
--     scopes to user_id = auth.uid().
-- Both were already correctly scoped per-user before this migration; this
-- migration only turns on replication so changes get broadcast at all.
--
-- Idempotent: ALTER PUBLICATION ... ADD TABLE errors if the table is
-- already a member, so guard with a check against pg_publication_tables
-- rather than assuming this hasn't been run before.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
