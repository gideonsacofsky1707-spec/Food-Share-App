"use client";

import Script from "next/script";

// Shared by every component that needs the Maps JS API (AddressAutocomplete,
// ListingsMap) so there's exactly one <script> tag regardless of how many of
// them end up mounted across a session - Next's Script dedupes by `id`, but
// only if everyone uses the same one. Google's JS API logs a warning (and
// can misbehave) if it's ever injected more than once on the same page.
export const GOOGLE_MAPS_LOADED_EVENT = "google-maps-loaded";

export function GoogleMapsScript() {
  return (
    <Script
      id="google-maps-js"
      src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
      strategy="afterInteractive"
      onReady={() => {
        window.dispatchEvent(new Event(GOOGLE_MAPS_LOADED_EVENT));
      }}
    />
  );
}
