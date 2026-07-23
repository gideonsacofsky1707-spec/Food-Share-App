import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestClaimAction } from "@/app/claims/actions";
import { ReportButton } from "@/components/reports/report-button";
import { PushPermissionPrompt } from "@/components/push/push-permission-prompt";
import { ListingStatusBadge } from "@/components/listings/listing-status-badge";
import { SubmitButton } from "@/components/submit-button";
import { formatDate, formatDateTime } from "@/lib/format";
import { PUBLIC_LISTING_COLUMNS } from "@/lib/listings";
import type { Claim, ListingPrivateLocation, PublicListing, User } from "@/types/database";

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

  // Only meaningful (and only worth the query) while the listing is still
  // active - "Requested" vs "Available" is the one nuance the status enum
  // itself can't tell us, since several people can request the same active
  // listing before the owner decides. Visible to any viewer, not just the
  // owner - it's just a demand signal, not private information.
  let hasPendingRequest = false;
  if (listing.status === "active") {
    const { count } = await supabase
      .from("claims")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", id)
      .eq("status", "requested");
    hasPendingRequest = (count ?? 0) > 0;
  }

  const { data: owner } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", listing.owner_id)
    .maybeSingle<Pick<User, "display_name">>();

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
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight break-words">
          {listing.title}
        </h1>
        <ListingStatusBadge status={listing.status} hasPendingRequest={hasPendingRequest} />
      </div>

      {owner && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Posted by{" "}
          <Link href={`/users/${listing.owner_id}`} className="break-words underline">
            {owner.display_name}
          </Link>
        </p>
      )}

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

      <PushPermissionPrompt eligible={success === "Request sent to the owner."} />

      <p className="break-words text-zinc-700 dark:text-zinc-300">{listing.description}</p>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-zinc-500 dark:text-zinc-400">Quantity</dt>
          <dd className="min-w-0 break-words">{listing.quantity}</dd>
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
            <dd>{formatDate(listing.best_by)}</dd>
          </div>
        )}
        {privateLocation?.exact_address ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-zinc-500 dark:text-zinc-400">Pickup address</dt>
            <dd className="min-w-0 break-words">{privateLocation.exact_address}</dd>
          </div>
        ) : (
          listing.approx_location_label && (
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-zinc-500 dark:text-zinc-400">General area</dt>
              <dd className="min-w-0 break-words">{listing.approx_location_label}</dd>
            </div>
          )
        )}
      </dl>

      {isOwner ? (
        <Link
          href={`/listings/${listing.id}/requests`}
          className="self-start rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
        >
          View requests
        </Link>
      ) : !user ? (
        <Link href="/login" className="self-start text-sm underline">
          Log in to request this listing
        </Link>
      ) : myClaim ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Your request:{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{myClaim.status}</span>
          </p>
          {myClaim.status === "accepted" && (
            <Link
              href={`/claims/${myClaim.id}`}
              className="self-start rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
            >
              Open chat
            </Link>
          )}
        </div>
      ) : listing.status === "active" ? (
        <form action={requestClaimAction}>
          <input type="hidden" name="listing_id" value={listing.id} />
          <SubmitButton
            pendingLabel="Requesting…"
            className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
          >
            Request pickup
          </SubmitButton>
        </form>
      ) : null}

      {user && !isOwner && <ReportButton reportedListingId={listing.id} label="Report listing" />}
    </main>
  );
}
