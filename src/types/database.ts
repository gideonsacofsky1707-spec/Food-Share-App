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

// `location` and `exact_address` are as sensitive as a pinned address, so
// their columns are revoked from anon/authenticated at the DB level (see
// 0004_listing_location_privacy.sql) - only reachable via
// get_listing_private_location(), and only for the listing's owner. Normal
// queries select PublicListing (below) instead of this full shape.
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
  location: unknown | null; // PostGIS geography point; not directly selectable, see above
  approx_location_label: string | null;
  exact_address: string | null; // not directly selectable, see above
  status: ListingStatus;
  created_at: string;
}

export type PublicListing = Omit<Listing, "location" | "exact_address">;

export interface ListingPrivateLocation {
  exact_address: string | null;
  lat: number;
  lng: number;
}

// From get_active_listing_map_pins() - approx_lat/lng are rounded to
// ~111m, never the real coordinates. See 0013_map_pins.sql.
export interface MapPin {
  id: string;
  title: string;
  photo_url: string | null;
  quantity: string;
  approx_lat: number;
  approx_lng: number;
}

export interface Claim {
  id: string;
  listing_id: string;
  claimer_id: string;
  status: ClaimStatus;
  created_at: string;
}

export interface ClaimWithListing extends Claim {
  listing: Pick<
    PublicListing,
    "id" | "title" | "photo_url" | "status" | "pickup_window_start" | "pickup_window_end"
  >;
}

export interface ClaimWithClaimer extends Claim {
  claimer: Pick<User, "display_name" | "avatar_url">;
}

export interface ClaimWithParticipants extends Claim {
  listing: Pick<
    PublicListing,
    "id" | "title" | "photo_url" | "owner_id" | "pickup_window_start" | "pickup_window_end"
  > & { owner: Pick<User, "display_name" | "avatar_url"> };
  claimer: Pick<User, "display_name" | "avatar_url">;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  link: string;
  read: boolean;
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
