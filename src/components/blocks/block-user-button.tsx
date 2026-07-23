"use client";

import { blockUserAction, unblockUserAction } from "@/app/blocks/actions";
import { SubmitButton } from "@/components/submit-button";

export function BlockUserButton({
  blockedId,
  isBlocked,
  redirectTo,
}: {
  blockedId: string;
  isBlocked: boolean;
  redirectTo?: string;
}) {
  return (
    <form action={isBlocked ? unblockUserAction : blockUserAction}>
      <input type="hidden" name="blocked_id" value={blockedId} />
      {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}
      <SubmitButton
        pendingLabel={isBlocked ? "Unblocking…" : "Blocking…"}
        className={
          isBlocked
            ? "rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            : "rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white"
        }
      >
        {isBlocked ? "Unblock" : "Block"}
      </SubmitButton>
    </form>
  );
}
