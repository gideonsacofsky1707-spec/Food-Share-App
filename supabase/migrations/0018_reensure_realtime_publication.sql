-- Re-applies 0012_ensure_realtime_publication.sql: the Database ->
-- Replication page in the Supabase dashboard was reported showing no
-- tables at all (not just messages/notifications missing - nothing in
-- supabase_realtime, if the publication even still exists), even though
-- 0012 was written to make exactly that state impossible to end up in.
--
-- Nothing in this repo's migration history (0013-0017) touches the
-- publication or drops/recreates the messages/notifications tables - see
-- the "Why this needed re-running" note in the README's "Debugging a
-- stalled subscription" section for what that does and doesn't rule out.
-- This migration doesn't need to know which explanation applies; like
-- 0012, it just re-establishes the end state unconditionally.
--
-- Safe to run any number of times: every check below guards its own
-- statement against the current state rather than assuming anything
-- about how it got there.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

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

-- Confirm it actually took (run this after the block above, in the same
-- SQL editor session) - both rows should come back:
--
--   select schemaname, tablename
--   from pg_publication_tables
--   where pubname = 'supabase_realtime';
