import { getListingStatusBadge } from "@/lib/listing-status";
import type { ListingStatus } from "@/types/database";

export function ListingStatusBadge({
  status,
  hasPendingRequest = false,
  className = "",
}: {
  status: ListingStatus;
  hasPendingRequest?: boolean;
  className?: string;
}) {
  const badge = getListingStatusBadge(status, hasPendingRequest);
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className} ${className}`}>
      {badge.label}
    </span>
  );
}
