import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notification-bell";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";

export async function NavHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unreadCount = 0;
  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    unreadCount = count ?? 0;
  }

  // Rendered twice below (desktop row + mobile dropdown) since Tailwind's
  // responsive classes can't change *which* element wraps a link, only how
  // it looks - but NotificationBell itself is rendered once, outside both,
  // so its realtime subscription never gets duplicated.
  const links = user ? (
    <>
      <Link href="/browse" className="font-medium">
        Browse
      </Link>
      <Link href="/listings" className="font-medium">
        My listings
      </Link>
      <Link href="/requests" className="font-medium">
        My requests
      </Link>
      <Link href="/profile" className="font-medium underline">
        Profile
      </Link>
    </>
  ) : (
    <>
      <Link href="/browse" className="font-medium">
        Browse
      </Link>
      <Link href="/login" className="font-medium">
        Log in
      </Link>
    </>
  );

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-base dark:bg-primary-500">
            🍲
          </span>
          Food<span className="text-primary-600 dark:text-primary-400">Share</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Rendered exactly once, regardless of viewport - it sits next to
              whichever of the two nav variants below is CSS-visible, rather
              than living inside either one. Both variants stay mounted at
              all times (Tailwind's hidden/sm:hidden only toggles display),
              so putting NotificationBell inside both would mount two
              instances that fight over the same realtime channel topic. */}
          {user && <NotificationBell userId={user.id} initialUnreadCount={unreadCount} />}

          <nav className="hidden items-center gap-4 text-sm sm:flex">
            {links}
            {!user && (
              <Link
                href="/signup"
                className="rounded-full bg-primary-600 px-4 py-1.5 font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
              >
                Sign up
              </Link>
            )}
          </nav>

          <div className="sm:hidden">
            <MobileNavToggle>
              {links}
              {!user && (
                <Link href="/signup" className="font-medium">
                  Sign up
                </Link>
              )}
            </MobileNavToggle>
          </div>
        </div>
      </div>
    </header>
  );
}
