"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/spinner";

// useFormStatus only reports the status of the nearest enclosing <form>, so
// this must be rendered as a descendant of the form it submits - never the
// form itself.
export function SubmitButton({
  children,
  pendingLabel = "Loading…",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending && <Spinner />}
      {pending ? pendingLabel : children}
    </button>
  );
}
