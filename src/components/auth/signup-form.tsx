"use client";

import { useActionState } from "react";
import { signUpAction, type SignUpFormState } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: SignUpFormState = {};

export function SignUpForm() {
  const [state, dispatch, isPending] = useActionState(signUpAction, initialState);
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
          autoComplete="name"
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
          name="email"
          required
          autoComplete="email"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <input type="checkbox" name="accepted_terms" required className="mt-1" />
        <span>
          I understand food is shared at my own risk, and I agree to the terms of
          use and food safety guidance.
        </span>
      </label>
      {fieldErrors.accepted_terms && (
        <span className="text-xs text-red-600 dark:text-red-400">{fieldErrors.accepted_terms}</span>
      )}

      <SubmitButton
        pending={isPending}
        pendingLabel="Creating account…"
        className="rounded-full bg-zinc-900 px-5 py-2 font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Sign up
      </SubmitButton>
    </form>
  );
}
