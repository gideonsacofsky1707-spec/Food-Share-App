import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function NavHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
