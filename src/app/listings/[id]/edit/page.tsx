import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/listings/listing-form";
import { updateListingAction } from "@/app/listings/actions";
import { PUBLIC_LISTING_COLUMNS } from "@/lib/listings";
import type { ListingPrivateLocation, PublicListing } from "@/types/database";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

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

  const { data: privateLocation } = await supabase
    .rpc("get_listing_private_location", { p_listing_id: id })
    .maybeSingle<ListingPrivateLocation>();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>
      <ListingForm
        action={updateListingAction}
        listing={listing}
        defaultAddress={privateLocation?.exact_address ?? undefined}
        error={error}
        submitLabel="Save changes"
      />
    </main>
  );
}
