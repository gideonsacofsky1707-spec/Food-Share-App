import type { ListingStatus } from "@/types/database";

export type ListingBadgeInfo = { label: string; className: string };

// Maps the DB's five-value status enum onto the four states a user actually
// needs to distinguish at a glance. "active" splits into Available/Requested
// based on whether a pending claim exists - the listings table itself has no
// separate status for "someone's asked, owner hasn't decided yet" (multiple
// people can request the same active listing), so that nuance is computed by
// the caller and passed in rather than read directly off the row.
export function getListingStatusBadge(
  status: ListingStatus,
  hasPendingRequest: boolean,
): ListingBadgeInfo {
  if (status === "active") {
    return hasPendingRequest
      ? {
          label: "Requested",
          className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        }
      : {
          label: "Available",
          className: "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300",
        };
  }
  if (status === "claimed") {
    return {
      label: "Claimed",
      className: "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300",
    };
  }
  if (status === "collected") {
    return {
      label: "Collected",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    };
  }
  // "expired"/"removed" - terminal states outside the four-step happy path,
  // shown plainly rather than forced into one of the four colors above.
  return {
    label: status,
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
}
