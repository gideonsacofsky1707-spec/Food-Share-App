"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/spinner";

export function NotificationSubmitButton({
  read,
  children,
}: {
  read: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        read
          ? "border-zinc-200 dark:border-zinc-800"
          : "border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/40"
      }`}
    >
      <span className="flex min-w-0 flex-col items-start gap-1">{children}</span>
      {pending && <Spinner className="h-4 w-4 shrink-0 text-zinc-500" />}
    </button>
  );
}
