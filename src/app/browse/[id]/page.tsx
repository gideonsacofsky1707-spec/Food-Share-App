import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestClaimAction } from "@/app/claims/actions";
import { formatDateTime } from "@/lib/format";
import { PUBLIC_LISTING_COLUMNS } from "@/lib/listings";
import type { Claim, ListingPrivateLocation, PublicListing } from "@/types/database";

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .eq("id", id)
    .single<PublicListing>();

  if (!listing) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Empty unless the caller is the owner or an accepted claimer - see
  // get_listing_private_location() in 0004_listing_location_privacy.sql
  // (extended for accepted claimers in 0005_claims.sql).
  const { data: privateLocation } = await supabase
    .rpc("get_listing_private_location", { p_listing_id: id })
    .maybeSingle<ListingPrivateLocation>();

  const isOwner = user?.id === listing.owner_id;

  let myClaim: Claim | null = null;
  if (user && !isOwner) {
    const { data } = await supabase
      .from("claims")
      .select("*")
      .eq("listing_id", id)
      .eq("claimer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Claim>();
    myClaim = data;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <Link href="/browse" className="text-sm underline">
        ← Back to browse
      </Link>

      {listing.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.photo_url}
          alt={listing.title}
          className="h-64 w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-64 w-full items-center justify-center rounded-xl bg-zinc-100 text-5xl dark:bg-zinc-800">
          🍲
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {listing.status}
        </span>
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

      <p className="text-zinc-700 dark:text-zinc-300">{listing.description}</p>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Quantity</dt>
          <dd>{listing.quantity}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Pickup window</dt>
          <dd>
            {formatDateTime(listing.pickup_window_start)} –{" "}
            {formatDateTime(listing.pickup_window_end)}
          </dd>
        </div>
        {listing.best_by && (
          <div className="flex gap-2">
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Best by</dt>
            <dd>{formatDateTime(listing.best_by)}</dd>
          </div>
        )}
        {privateLocation?.exact_address ? (
          <div className="flex gap-2">
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Pickup address</dt>
            <dd>{privateLocation.exact_address}</dd>
          </div>
        ) : (
          listing.approx_location_label && (
            <div className="flex gap-2">
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">General area</dt>
              <dd>{listing.approx_location_label}</dd>
            </div>
          )
        )}
      </dl>

      {isOwner ? (
        <Link
          href={`/listings/${listing.id}/requests`}
          className="self-start rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          View requests
        </Link>
      ) : !user ? (
        <Link href="/login" className="self-start text-sm underline">
          Log in to request this listing
        </Link>
      ) : myClaim ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your request:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{myClaim.status}</span>
        </p>
      ) : listing.status === "active" ? (
        <form action={requestClaimAction}>
          <input type="hidden" name="listing_id" value={listing.id} />
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Request pickup
          </button>
        </form>
      ) : null}
    </main>
  );
}
