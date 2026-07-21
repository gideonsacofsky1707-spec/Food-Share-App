"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// Places Autocomplete is UX only, to help the user pick a real address
// quickly - whatever ends up in this input gets re-geocoded server-side
// (src/lib/google-geocoding.ts) as the source of truth for coordinates.
export function AddressAutocomplete({ defaultValue }: { defaultValue?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | undefined;

    function init() {
      if (!inputRef.current || !window.google?.maps?.places || autocomplete) return;
      autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address"],
      });
    }

    init();
    window.addEventListener("google-maps-places-loaded", init);
    return () => window.removeEventListener("google-maps-places-loaded", init);
  }, []);

  return (
    <>
      <Script
        id="google-maps-places"
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onReady={() => {
          window.dispatchEvent(new Event("google-maps-places-loaded"));
        }}
      />
      <input
        ref={inputRef}
        type="text"
        name="address"
        required
        defaultValue={defaultValue}
        placeholder="Start typing your pickup address…"
        autoComplete="off"
        className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </>
  );
}
