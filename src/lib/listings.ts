// Every public.listings column except the two that are locked down at the
// DB level (location, exact_address) - see 0004_listing_location_privacy.sql.
// Use this instead of "*" for any listings query that isn't going through
// get_listing_private_location().
export const PUBLIC_LISTING_COLUMNS =
  "id, owner_id, title, description, photo_url, quantity, best_by, pickup_window_start, pickup_window_end, approx_location_label, status, created_at";
