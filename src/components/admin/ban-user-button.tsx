"use client";

import { banUserAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";

export function BanUserButton({ userId, redirectTo }: { userId: string; redirectTo: string }) {
  return (
    <form
      action={banUserAction}
      onSubmit={(event) => {
        if (
          !confirm("Ban this user? They'll be signed out immediately and can't log back in.")
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="redirect_to" value={redirectTo} />
      <SubmitButton
        pendingLabel="Banning…"
        className="rounded-full bg-red-600 px-3 py-2 text-sm font-medium text-white"
      >
        Ban user
      </SubmitButton>
    </form>
  );
}
