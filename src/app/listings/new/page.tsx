import { ListingForm } from "@/components/listings/listing-form";
import { createListingAction } from "@/app/listings/actions";

export default function NewListingPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">New listing</h1>
      <ListingForm
        action={createListingAction}
        submitLabel="Publish listing"
        pendingLabel="Publishing…"
      />
    </main>
  );
}
