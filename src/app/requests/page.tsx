import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import type { ClaimWithListing } from "@/types/database";

export default async function MyRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: claims } = await supabase
    .from("claims")
    .select(
      "*, listing:listings(id, title, photo_url, status, pickup_window_start, pickup_window_end)",
    )
    .eq("claimer_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ClaimWithListing[]>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">My requests</h1>

      {!claims || claims.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You haven&apos;t requested anything yet.{" "}
          <Link href="/browse" className="underline">
            Browse listings
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {claims.map((claim) => (
            <li key={claim.id}>
              <Link
                href={`/browse/${claim.listing.id}`}
                className="flex gap-4 rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                {claim.listing.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={claim.listing.photo_url}
                    alt={claim.listing.title}
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-2xl dark:bg-zinc-800">
                    🍲
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold">{claim.listing.title}</h2>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {claim.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Pickup: {formatDateTime(claim.listing.pickup_window_start)} –{" "}
                    {formatDateTime(claim.listing.pickup_window_end)}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Requested {formatDateTime(claim.created_at)}
                  </p>
                  {claim.status === "accepted" && (
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Accepted — the pickup address is on the listing page.
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
