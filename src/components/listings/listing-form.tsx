"use client";

import { useActionState } from "react";
import { AddressAutocomplete } from "@/components/listings/address-autocomplete";
import { SubmitButton } from "@/components/submit-button";
import type { ListingFormState } from "@/app/listings/actions";
import type { PublicListing } from "@/types/database";

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

const initialState: ListingFormState = {};

function fieldClassName(hasError: boolean) {
  return `rounded-md border px-3 py-2 dark:bg-zinc-900 ${
    hasError ? "border-red-500 dark:border-red-500" : "border-zinc-300 dark:border-zinc-700"
  }`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-xs text-red-600 dark:text-red-400">{message}</span>;
}

export function ListingForm({
  action,
  listing,
  defaultAddress,
  submitLabel,
  pendingLabel = "Saving…",
}: {
  action: (prevState: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  listing?: PublicListing;
  defaultAddress?: string;
  submitLabel: string;
  pendingLabel?: string;
}) {
  const [state, dispatch, isPending] = useActionState(action, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form
      // Submitting via a plain onSubmit (rather than passing `dispatch`
      // straight to the form's `action`) is deliberate: React resets every
      // uncontrolled field - including file inputs - once an action-prop
      // form's action settles, whether it returns success or a validation
      // error. Dispatching by hand here sidesteps that reset entirely, so
      // everything the user typed (and any photo they picked) survives a
      // failed submission untouched.
      onSubmit={(event) => {
        event.preventDefault();
        dispatch(new FormData(event.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      {listing && <input type="hidden" name="id" value={listing.id} />}

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
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
          aria-invalid={!!fieldErrors.title}
          className={fieldClassName(!!fieldErrors.title)}
        />
        <FieldError message={fieldErrors.title} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={listing?.description}
          aria-invalid={!!fieldErrors.description}
          className={fieldClassName(!!fieldErrors.description)}
        />
        <FieldError message={fieldErrors.description} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Quantity
        <input
          type="text"
          name="quantity"
          required
          placeholder='e.g. "serves 4" or "1 bag"'
          defaultValue={listing?.quantity}
          aria-invalid={!!fieldErrors.quantity}
          className={fieldClassName(!!fieldErrors.quantity)}
        />
        <FieldError message={fieldErrors.quantity} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Pickup address
        <AddressAutocomplete defaultValue={defaultAddress} error={fieldErrors.address} />
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
            aria-invalid={!!fieldErrors.pickup_window_start}
            className={fieldClassName(!!fieldErrors.pickup_window_start)}
          />
          <FieldError message={fieldErrors.pickup_window_start} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Pickup window end
          <input
            type="datetime-local"
            name="pickup_window_end"
            required
            defaultValue={toDateTimeLocal(listing?.pickup_window_end ?? null)}
            aria-invalid={!!fieldErrors.pickup_window_end}
            className={fieldClassName(!!fieldErrors.pickup_window_end)}
          />
          <FieldError message={fieldErrors.pickup_window_end} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {listing?.photo_url ? "Replace photo (optional)" : "Photo (optional)"}
        <input
          type="file"
          name="photo"
          accept="image/*"
          aria-invalid={!!fieldErrors.photo}
          className={fieldErrors.photo ? "text-red-600 dark:text-red-400" : undefined}
        />
        <FieldError message={fieldErrors.photo} />
      </label>

      <SubmitButton
        pending={isPending}
        pendingLabel={pendingLabel}
        className="rounded-full bg-primary-600 px-5 py-2 font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
