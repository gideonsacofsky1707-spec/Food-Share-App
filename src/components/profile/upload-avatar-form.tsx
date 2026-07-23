"use client";

import { startTransition, useActionState } from "react";
import { uploadAvatarAction, type UploadAvatarFormState } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: UploadAvatarFormState = {};

export function UploadAvatarForm() {
  const [state, dispatch, isPending] = useActionState(uploadAvatarAction, initialState);

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
      className="flex flex-col items-center gap-2"
    >
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      <input type="file" name="avatar" accept="image/*" required />
      <SubmitButton
        pending={isPending}
        pendingLabel="Uploading…"
        className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm dark:border-zinc-700"
      >
        Upload avatar
      </SubmitButton>
    </form>
  );
}
