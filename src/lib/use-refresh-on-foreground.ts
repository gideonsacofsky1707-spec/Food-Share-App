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
    function refreshIfVisible() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    // visibilitychange alone turned out not to be reliably firing for a
    // standalone (Home Screen) PWA on iOS resuming from the background - a
    // known WebKit quirk, not specific to this app. pageshow (fired on a
    // bfcache restore, which is closer to what iOS actually does when
    // resuming a suspended standalone app than a fresh navigation) and
    // focus (fired when the webview regains focus, a proxy for the same
    // "came back to foreground" moment) both catch cases the other can
    // miss, so all three are wired to the same handler rather than picking
    // one - each is a no-op call to router.refresh() when redundant.
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("pageshow", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("pageshow", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [router]);
}
