"use client";

import { useEffect, useRef } from "react";
import { GoogleMapsScript, GOOGLE_MAPS_LOADED_EVENT } from "@/components/google-maps-script";

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
    window.addEventListener(GOOGLE_MAPS_LOADED_EVENT, init);
    return () => window.removeEventListener(GOOGLE_MAPS_LOADED_EVENT, init);
  }, []);

  return (
    <>
      <GoogleMapsScript />
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
