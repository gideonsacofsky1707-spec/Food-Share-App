"use client";

import { startTransition, useActionState } from "react";
import { submitRatingAction, type RatingFormState } from "@/app/claims/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: RatingFormState = {};

export function RatingForm({
  claimId,
  rateeId,
  rateeName,
}: {
  claimId: string;
  rateeId: string;
  rateeName: string;
}) {
  const [state, dispatch, isPending] = useActionState(submitRatingAction, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        // Without startTransition, a redirect() thrown by the action on
        // success can't be intercepted by Next.js's router - the page just
        // silently fails to navigate. See LoginForm for the full story.
        startTransition(() => {
          dispatch(formData);
        });
      }}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <input type="hidden" name="claim_id" value={claimId} />
      <input type="hidden" name="ratee_id" value={rateeId} />

      <p className="break-words text-sm font-medium">Rate {rateeName}</p>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <fieldset className="flex gap-4">
        <legend className="sr-only">Star rating, 1 to 5</legend>
        {[1, 2, 3, 4, 5].map((value) => (
          <label
            key={value}
            className="flex flex-col items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <input type="radio" name="score" value={value} required className="h-5 w-5" />
            {value}★
          </label>
        ))}
      </fieldset>
      {fieldErrors.score && (
        <span className="text-xs text-red-600 dark:text-red-400">{fieldErrors.score}</span>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Comment (optional)
        <textarea
          name="comment"
          rows={2}
          placeholder="How did it go?"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <SubmitButton
        pending={isPending}
        pendingLabel="Submitting…"
        className="self-start rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
      >
        Submit rating
      </SubmitButton>
    </form>
  );
}
