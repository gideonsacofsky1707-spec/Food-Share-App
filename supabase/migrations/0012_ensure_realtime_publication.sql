-- 0010_enable_realtime.sql's ALTER PUBLICATION statements didn't take -
-- pg_publication_tables came back empty for supabase_realtime entirely,
-- not just missing messages/notifications. That's consistent with either
-- (a) 0010 simply never ran, or (b) the supabase_realtime publication
-- doesn't exist in this project at all (ALTER PUBLICATION on a
-- nonexistent publication errors immediately, so if 0010 was run and
-- silently produced no error, (a) is more likely - but this migration
-- covers both without needing to know which).

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
