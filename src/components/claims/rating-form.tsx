import { submitRatingAction } from "@/app/claims/actions";
import { SubmitButton } from "@/components/submit-button";

export function RatingForm({
  claimId,
  rateeId,
  rateeName,
}: {
  claimId: string;
  rateeId: string;
  rateeName: string;
}) {
  return (
    <form
      action={submitRatingAction}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <input type="hidden" name="claim_id" value={claimId} />
      <input type="hidden" name="ratee_id" value={rateeId} />

      <p className="text-sm font-medium">Rate {rateeName}</p>

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
        pendingLabel="Submitting…"
        className="self-start rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Submit rating
      </SubmitButton>
    </form>
  );
}
