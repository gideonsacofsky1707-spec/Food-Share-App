import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PUBLIC_LISTING_COLUMNS } from "@/lib/listings";
import type { PublicListing } from "@/types/database";

export default async function BrowsePage() {
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .returns<PublicListing[]>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Browse listings</h1>

      {!listings || listings.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nothing available right now. Check back soon.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Link
                href={`/browse/${listing.id}`}
                className="flex gap-4 rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                {listing.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.photo_url}
                    alt={listing.title}
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-2xl dark:bg-zinc-800">
                    🍲
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-1">
                  <h2 className="font-semibold">{listing.title}</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{listing.quantity}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Pickup: {formatDateTime(listing.pickup_window_start)} –{" "}
                    {formatDateTime(listing.pickup_window_end)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
