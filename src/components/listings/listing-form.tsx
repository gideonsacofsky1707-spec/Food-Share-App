import { AddressAutocomplete } from "@/components/listings/address-autocomplete";
import type { PublicListing } from "@/types/database";

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

export function ListingForm({
  action,
  listing,
  defaultAddress,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  listing?: PublicListing;
  defaultAddress?: string;
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      {listing && <input type="hidden" name="id" value={listing.id} />}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <p className="font-medium">Food safety guidance</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>Don&apos;t list food that&apos;s been left at room temperature for more than 2 hours.</li>
          <li>Label any known allergens in the description (nuts, dairy, gluten, etc.).</li>
          <li>Only share food you&apos;d be comfortable eating yourself.</li>
        </ul>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          type="text"
          name="title"
          required
          defaultValue={listing?.title}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={listing?.description}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Quantity
        <input
          type="text"
          name="quantity"
          required
          placeholder='e.g. "serves 4" or "1 bag"'
          defaultValue={listing?.quantity}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Pickup address
        <AddressAutocomplete defaultValue={defaultAddress} />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Only a neighborhood-level area is shown publicly. The full address is only
          shared with you and, later, a claimer you&apos;ve accepted.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Best by (optional)
        <input
          type="datetime-local"
          name="best_by"
          defaultValue={toDateTimeLocal(listing?.best_by ?? null)}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Pickup window start
          <input
            type="datetime-local"
            name="pickup_window_start"
            required
            defaultValue={toDateTimeLocal(listing?.pickup_window_start ?? null)}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Pickup window end
          <input
            type="datetime-local"
            name="pickup_window_end"
            required
            defaultValue={toDateTimeLocal(listing?.pickup_window_end ?? null)}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {listing?.photo_url ? "Replace photo (optional)" : "Photo (optional)"}
        <input type="file" name="photo" accept="image/*" />
      </label>

      <button
        type="submit"
        className="rounded-full bg-zinc-900 px-5 py-2 font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        {submitLabel}
      </button>
    </form>
  );
}
