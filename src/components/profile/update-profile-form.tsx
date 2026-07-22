"use client";

import { useActionState } from "react";
import { updateProfileAction, type UpdateProfileFormState } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: UpdateProfileFormState = {};

export function UpdateProfileForm({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const [state, dispatch, isPending] = useActionState(updateProfileAction, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        dispatch(new FormData(event.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Display name
        <input
          type="text"
          name="display_name"
          required
          defaultValue={displayName}
          aria-invalid={!!fieldErrors.display_name}
          className={`rounded-md border px-3 py-2 dark:bg-zinc-900 ${
            fieldErrors.display_name
              ? "border-red-500 dark:border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
        {fieldErrors.display_name && (
          <span className="text-xs text-red-600 dark:text-red-400">{fieldErrors.display_name}</span>
        )}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          value={email}
          disabled
          className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>
      <SubmitButton
        pending={isPending}
        pendingLabel="Saving…"
        className="rounded-full bg-zinc-900 px-5 py-2 font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Save
      </SubmitButton>
    </form>
  );
}
