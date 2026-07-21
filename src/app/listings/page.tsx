import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteListingAction } from "@/app/listings/actions";
import { DeleteListingForm } from "@/components/listings/delete-listing-button";
import { formatDateTime } from "@/lib/format";
import { PUBLIC_LISTING_COLUMNS } from "@/lib/listings";
import type { PublicListing } from "@/types/database";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: listings } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .eq("owner_id", user.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false })
    .returns<PublicListing[]>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
        <Link
          href="/listings/new"
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          New listing
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {success}
        </p>
      )}

      {!listings || listings.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You haven&apos;t posted anything yet.{" "}
          <Link href="/listings/new" className="underline">
            Create your first listing
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="flex gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
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
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{listing.title}</h2>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {listing.status}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{listing.quantity}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  Pickup: {formatDateTime(listing.pickup_window_start)} –{" "}
                  {formatDateTime(listing.pickup_window_end)}
                </p>
                {listing.best_by && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Best by: {formatDateTime(listing.best_by)}
                  </p>
                )}
                <div className="mt-2 flex gap-3">
                  <Link href={`/listings/${listing.id}/edit`} className="text-sm underline">
                    Edit
                  </Link>
                  <DeleteListingForm id={listing.id} action={deleteListingAction} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
