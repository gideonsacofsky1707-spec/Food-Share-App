"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Supabase's postgres_changes never backfills what a channel missed while
// disconnected - it only pushes events that happen while the socket is
// live. iOS aggressively suspends a backgrounded PWA's JS (and with it,
// the realtime websocket), so anything sent while the app wasn't in the
// foreground is simply gone from that channel's perspective; resuming
// doesn't replay it, and if iOS resumed the same in-memory page rather
// than a fresh reload, the stale state just sits there with nothing to
// tell it otherwise.
//
// router.refresh() re-runs the page's server components and streams down
// fresh props (initialMessages / initialUnreadCount) without a full page
// reload - both NotificationBell and ChatThread already sync their local
// state from those props changing (see each component's own comment on
// that), so this is enough to catch up on anything missed, on top of (not
// instead of) the live channel handling everything that happens while the
// app stays foregrounded.
export function useRefreshOnForeground() {
  const router = useRouter();

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);
}
