import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import type { Listing } from "@/types/database";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single<Listing>();

  if (!listing) {
    notFound();
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
        {listing.approx_location_label && (
          <div className="flex gap-2">
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Location</dt>
            <dd>{listing.approx_location_label}</dd>
          </div>
        )}
      </dl>
    </main>
  );
}
