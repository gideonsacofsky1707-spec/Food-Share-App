import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptClaimAction, declineClaimAction } from "@/app/claims/actions";
import { ListingStatusBadge } from "@/components/listings/listing-status-badge";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { PUBLIC_LISTING_COLUMNS } from "@/lib/listings";
import type { ClaimWithClaimer, PublicListing } from "@/types/database";

export default async function ListingRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: listing } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .eq("id", id)
    .eq("owner_id", user.id)
    .single<PublicListing>();

  if (!listing) {
    notFound();
  }

  const { data: claims } = await supabase
    .from("claims")
    .select("*, claimer:users(display_name, avatar_url)")
    .eq("listing_id", id)
    .order("created_at", { ascending: false })
    .returns<ClaimWithClaimer[]>();

  const hasPendingRequest = (claims ?? []).some((claim) => claim.status === "requested");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <Link href="/listings" className="text-sm underline">
          ← Back to my listings
        </Link>
      </div>

      <div>
        <h1 className="break-words text-2xl font-semibold tracking-tight">Requests for {listing.title}</h1>
        <div className="mt-1">
          <ListingStatusBadge status={listing.status} hasPendingRequest={hasPendingRequest} />
        </div>
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

      {!claims || claims.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No requests yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {claims.map((claim) => (
            <li
              key={claim.id}
              className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 gap-4">
                {claim.claimer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={claim.claimer.avatar_url}
                    alt={claim.claimer.display_name}
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xl dark:bg-zinc-800">
                    🍲
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={`/users/${claim.claimer_id}`} className="break-words font-semibold underline">
                    {claim.claimer.display_name}
                  </Link>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    Requested {formatDateTime(claim.created_at)}
                  </span>
                </div>
              </div>

              {claim.status === "requested" ? (
                <div className="flex shrink-0 gap-2">
                  <form action={acceptClaimAction}>
                    <input type="hidden" name="claim_id" value={claim.id} />
                    <input type="hidden" name="listing_id" value={id} />
                    <SubmitButton
                      pendingLabel="Accepting…"
                      className="rounded-full bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
                    >
                      Accept
                    </SubmitButton>
                  </form>
                  <form action={declineClaimAction}>
                    <input type="hidden" name="claim_id" value={claim.id} />
                    <input type="hidden" name="listing_id" value={id} />
                    <SubmitButton
                      pendingLabel="Declining…"
                      className="rounded-full border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
                    >
                      Decline
                    </SubmitButton>
                  </form>
                </div>
              ) : claim.status === "accepted" || claim.status === "completed" ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {claim.status}
                  </span>
                  <Link href={`/claims/${claim.id}`} className="text-sm font-medium underline">
                    {claim.status === "completed" ? "Open chat & rate" : "Open chat"}
                  </Link>
                </div>
              ) : (
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {claim.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
