"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/spinner";

// useFormStatus only reports the status of the nearest enclosing <form>, so
// this must be rendered as a descendant of the form it submits - never the
// form itself. Forms that dispatch their action manually (e.g. to avoid
// React's auto-reset of uncontrolled fields after an action settles) don't
// have a form-level pending status to read; pass `pending` explicitly for
// those instead.
export function SubmitButton({
  children,
  pendingLabel = "Loading…",
  className = "",
  pending: pendingProp,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;

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
