import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteListingAction } from "@/app/listings/actions";
import { DeleteListingForm } from "@/components/listings/delete-listing-button";
import { EmptyState } from "@/components/empty-state";
import { ListingStatusBadge } from "@/components/listings/listing-status-badge";
import { PushPermissionPrompt } from "@/components/push/push-permission-prompt";
import { formatDate, formatDateTime } from "@/lib/format";
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

  // Batched rather than one query per card - see browse/page.tsx for the
  // same pattern; "Requested" vs "Available" isn't stored on the listing
  // itself since several people can request the same active listing before
  // this owner decides.
  const activeListingIds = (listings ?? [])
    .filter((listing) => listing.status === "active")
    .map((listing) => listing.id);
  const { data: pendingClaims } = activeListingIds.length
    ? await supabase
        .from("claims")
        .select("listing_id")
        .eq("status", "requested")
        .in("listing_id", activeListingIds)
    : { data: [] as { listing_id: string }[] };
  const pendingRequestListingIds = new Set((pendingClaims ?? []).map((c) => c.listing_id));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
        <Link
          href="/listings/new"
          className="rounded-full bg-primary-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
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

      <PushPermissionPrompt eligible={success === "Listing created"} />

      {!listings || listings.length === 0 ? (
        <EmptyState
          title="No listings yet"
          description="Got extra food to share? Post your first listing and neighbors nearby will be able to find it."
          action={{ href: "/listings/new", label: "Post your first listing" }}
        />
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

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="min-w-0 break-words font-semibold">{listing.title}</h2>
                  <ListingStatusBadge
                    status={listing.status}
                    hasPendingRequest={pendingRequestListingIds.has(listing.id)}
                  />
                </div>
                <p className="break-words text-sm text-zinc-600 dark:text-zinc-400">{listing.quantity}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  Pickup: {formatDateTime(listing.pickup_window_start)} –{" "}
                  {formatDateTime(listing.pickup_window_end)}
                </p>
                {listing.best_by && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Best by: {formatDate(listing.best_by)}
                  </p>
                )}
                <div className="mt-2 flex gap-3">
                  <Link href={`/listings/${listing.id}/edit`} className="text-sm underline">
                    Edit
                  </Link>
                  <Link href={`/listings/${listing.id}/requests`} className="text-sm underline">
                    Requests
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
