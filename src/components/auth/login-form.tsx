"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, dispatch, isPending] = useActionState(loginAction, initialState);

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
          autoComplete="current-password"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <SubmitButton
        pending={isPending}
        pendingLabel="Logging in…"
        className="rounded-full bg-primary-600 px-5 py-2 font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
      >
        Log in
      </SubmitButton>
    </form>
  );
}
