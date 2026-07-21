"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell({
  userId,
  initialUnreadCount,
}: {
  userId: string;
  initialUnreadCount: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

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
