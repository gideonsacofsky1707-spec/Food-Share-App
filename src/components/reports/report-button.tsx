"use client";

import { useActionState, useState } from "react";
import { submitReportAction, type ReportFormState } from "@/app/reports/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: ReportFormState = {};

const REPORT_REASONS = [
  "Inappropriate content",
  "Spam",
  "Food safety concern",
  "Harassment",
  "Other",
];

export function ReportButton({
  reportedUserId,
  reportedListingId,
  label = "Report",
}: {
  reportedUserId?: string;
  reportedListingId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, dispatch, isPending] = useActionState(submitReportAction, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Thanks — we&apos;ve received your report.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 underline dark:text-red-400"
      >
        {label}
      </button>
    );
  }

  return (
    <form
      // Manual dispatch (not the form's action prop) preserves the reason/
      // details the user entered if the report fails validation - see
      // ListingForm for why the action prop alone isn't enough for that.
      onSubmit={(event) => {
        event.preventDefault();
        dispatch(new FormData(event.currentTarget));
      }}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      {reportedUserId && <input type="hidden" name="reported_user_id" value={reportedUserId} />}
      {reportedListingId && (
        <input type="hidden" name="reported_listing_id" value={reportedListingId} />
      )}

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Reason
        <select
          name="reason"
          required
          defaultValue=""
          aria-invalid={!!fieldErrors.reason}
          className={`rounded-md border px-3 py-2 dark:bg-zinc-900 ${
            fieldErrors.reason
              ? "border-red-500 dark:border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        >
          <option value="" disabled>
            Choose a reason…
          </option>
          {REPORT_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
        {fieldErrors.reason && (
          <span className="text-xs text-red-600 dark:text-red-400">{fieldErrors.reason}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Details (optional)
        <textarea
          name="details"
          rows={3}
          placeholder="Anything else we should know?"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <div className="flex gap-2">
        <SubmitButton
          pending={isPending}
          pendingLabel="Submitting…"
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white"
        >
          Submit report
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
