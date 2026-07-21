import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          🍲 FoodShare
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/browse" className="font-medium">
            Browse
          </Link>
          {user ? (
            <>
              <Link href="/listings" className="font-medium">
                My listings
              </Link>
              <Link href="/requests" className="font-medium">
                My requests
              </Link>
              <Link href="/notifications" className="relative font-medium" aria-label="Notifications">
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="font-medium underline">
                Profile
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-zinc-900 px-4 py-1.5 font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
