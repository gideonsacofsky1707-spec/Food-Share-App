"use client";

import { SubmitButton } from "@/components/submit-button";

export function DeleteListingForm({
  id,
  action,
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("Delete this listing? This can't be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingLabel="Deleting…" className="text-sm text-red-600 underline dark:text-red-400">
        Delete
      </SubmitButton>
    </form>
  );
}
