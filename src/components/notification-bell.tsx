"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NOTIFICATIONS_PATH = "/notifications";

export function NotificationBell({
  userId,
  initialUnreadCount,
}: {
  userId: string;
  initialUnreadCount: number;
}) {
  const pathname = usePathname();

  // If this mounts already on /notifications (a hard load or refresh), skip
  // straight to 0 - the page marks everything read before it even renders,
  // so there's no stale count worth showing first.
  const [unreadCount, setUnreadCount] = useState(
    pathname === NOTIFICATIONS_PATH ? 0 : initialUnreadCount,
  );

  // Stay in sync with the server-computed count across navigations (e.g.
  // after visiting /notifications marks some as read). Adjusting state
  // during render (React's documented pattern for this,
  // https://react.dev/learn/you-might-not-need-an-effect) instead of in a
  // useEffect avoids an extra render pass.
  const [prevInitialUnreadCount, setPrevInitialUnreadCount] = useState(initialUnreadCount);
  if (initialUnreadCount !== prevInitialUnreadCount) {
    setPrevInitialUnreadCount(initialUnreadCount);
    setUnreadCount(initialUnreadCount);
  }

  // NotificationBell lives in the root layout, which - unlike a page -
  // doesn't get a fresh server render on every client-side navigation, so
  // arriving at /notifications this way would otherwise leave the badge
  // showing its pre-visit count until something else happened to trigger a
  // layout refresh. Clearing it the moment the route itself changes to
  // /notifications makes it immediate regardless of how the user got here.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (pathname === NOTIFICATIONS_PATH) {
      setUnreadCount(0);
    }
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:user:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadCount((count) => count + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link href="/notifications" className="relative font-medium" aria-label="Notifications">
      🔔
      {unreadCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
