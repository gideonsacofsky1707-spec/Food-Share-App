"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessageAction, type SendMessageFormState } from "@/app/claims/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: SendMessageFormState = {};

export function SendMessageForm({ claimId }: { claimId: string }) {
  const [state, dispatch, isPending] = useActionState(sendMessageAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the input once a message actually sends, but leave it (and the
  // error) alone on failure - the user shouldn't have to retype a message
  // just because the submit was rejected.
  useEffect(() => {
    if (state !== initialState && !state.error) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-1">
      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          dispatch(new FormData(event.currentTarget));
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="claim_id" value={claimId} />
        <input
          type="text"
          name="body"
          required
          placeholder="Write a message…"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <SubmitButton
          pending={isPending}
          pendingLabel="Sending…"
          className="shrink-0 rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
        >
          Send
        </SubmitButton>
      </form>
    </div>
  );
}
