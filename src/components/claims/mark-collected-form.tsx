"use client";

import { SubmitButton } from "@/components/submit-button";

// Same confirm-before-submit pattern as DeleteListingForm - there's no
// "undo" for this in the UI (claim status only ever moves forward), so a
// stray click shouldn't silently flip it.
export function MarkCollectedForm({
  claimId,
  listingId,
  action,
}: {
  claimId: string;
  listingId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !confirm(
            "Mark this as collected? You'll both be prompted to rate the exchange, and this can't be undone.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="claim_id" value={claimId} />
      <input type="hidden" name="listing_id" value={listingId} />
      <SubmitButton
        pendingLabel="Marking as collected…"
        className="self-start rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
      >
        Mark as collected
      </SubmitButton>
    </form>
  );
}
