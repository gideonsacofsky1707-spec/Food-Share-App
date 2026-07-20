// Hand-written types mirroring the schema in PROJECT.md.
// Replace with `supabase gen types typescript` output once the schema is migrated.

export type ListingStatus = "active" | "claimed" | "collected" | "expired" | "removed";
export type ClaimStatus = "requested" | "accepted" | "declined" | "completed" | "cancelled";
export type ReportStatus = "open" | "reviewed" | "resolved";

export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
}

export interface Listing {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  photo_url: string | null;
  quantity: string;
  best_by: string | null;
  pickup_window_start: string;
  pickup_window_end: string;
  location: unknown | null; // PostGIS geography point
  approx_location_label: string | null;
  exact_address: string | null;
  status: ListingStatus;
  created_at: string;
}

export interface Claim {
  id: string;
  listing_id: string;
  claimer_id: string;
  status: ClaimStatus;
  created_at: string;
}

export interface Message {
  id: string;
  claim_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Rating {
  id: string;
  claim_id: string;
  rater_id: string;
  ratee_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_listing_id: string | null;
  reason: string;
  status: ReportStatus;
  created_at: string;
}
