import { createClient } from "@/lib/supabase/server";
import { PUBLIC_LISTING_COLUMNS } from "@/lib/listings";
import { BrowseViewToggle } from "@/components/browse/browse-view-toggle";
import { ListingsList } from "@/components/browse/listings-list";
import { ListingsMap } from "@/components/browse/listings-map";
import type { MapPin, PublicListing } from "@/types/database";

export default async function BrowsePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: listings } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .returns<PublicListing[]>();

  // Batched rather than one query per card: which of these (all already
  // "active") have at least one pending request, so the card badge can read
  // "Requested" instead of "Available" - the one nuance the status column
  // itself can't tell us.
  const listingIds = (listings ?? []).map((listing) => listing.id);
  const { data: pendingClaims } = listingIds.length
    ? await supabase
        .from("claims")
        .select("listing_id")
        .eq("status", "requested")
        .in("listing_id", listingIds)
    : { data: [] as { listing_id: string }[] };
  const pendingRequestListingIds = new Set((pendingClaims ?? []).map((c) => c.listing_id));

  // Approximate coordinates only - see 0013_map_pins.sql for why this can't
  // just be a plain select on listings.location.
  //
  // Without generated Database types, supabase-js's .returns<T[]>() assumes
  // an RPC returns a single row unless told otherwise, and errors on the
  // array override; casting through unknown sidesteps that inference gap
  // (get_active_listing_map_pins() is SETOF, so data is genuinely an array).
  const { data: mapPinsData } = await supabase.rpc("get_active_listing_map_pins");
  const mapPins = (mapPinsData ?? []) as unknown as MapPin[];

  // Nudges toward the next useful action instead of a flat "nothing here" -
  // logged-out visitors get pointed at signing up, logged-in ones at
  // posting their own listing (there's nothing else productive to do on an
  // empty marketplace besides being the one to fill it).
  const emptyStateAction = user
    ? { href: "/listings/new", label: "Post a listing" }
    : { href: "/signup", label: "Sign up to get started" };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Browse listings</h1>

      <BrowseViewToggle
        listView={
          <ListingsList
            listings={listings ?? []}
            pendingRequestListingIds={pendingRequestListingIds}
            emptyStateAction={emptyStateAction}
          />
        }
        mapView={<ListingsMap pins={mapPins} emptyStateAction={emptyStateAction} />}
      />
    </main>
  );
}
