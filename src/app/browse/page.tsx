import { createClient } from "@/lib/supabase/server";
import { PUBLIC_LISTING_COLUMNS } from "@/lib/listings";
import { BrowseViewToggle } from "@/components/browse/browse-view-toggle";
import { ListingsList } from "@/components/browse/listings-list";
import { ListingsMap } from "@/components/browse/listings-map";
import type { MapPin, PublicListing } from "@/types/database";

export default async function BrowsePage() {
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .returns<PublicListing[]>();

  // Approximate coordinates only - see 0013_map_pins.sql for why this can't
  // just be a plain select on listings.location.
  //
  // Without generated Database types, supabase-js's .returns<T[]>() assumes
  // an RPC returns a single row unless told otherwise, and errors on the
  // array override; casting through unknown sidesteps that inference gap
  // (get_active_listing_map_pins() is SETOF, so data is genuinely an array).
  const { data: mapPinsData } = await supabase.rpc("get_active_listing_map_pins");
  const mapPins = (mapPinsData ?? []) as unknown as MapPin[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Browse listings</h1>

      <BrowseViewToggle
        listView={<ListingsList listings={listings ?? []} />}
        mapView={<ListingsMap pins={mapPins} />}
      />
    </main>
  );
}
