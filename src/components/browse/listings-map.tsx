"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { GoogleMapsScript, GOOGLE_MAPS_LOADED_EVENT } from "@/components/google-maps-script";
import type { MapPin } from "@/types/database";

// Center of the contiguous US - only used as a fallback when there are no
// pins to center on.
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };

export function ListingsMap({ pins }: { pins: MapPin[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  useEffect(() => {
    let map: google.maps.Map | undefined;
    let markers: google.maps.Marker[] = [];
    let clusterer: MarkerClusterer | undefined;

    function init() {
      if (!mapDivRef.current || !window.google?.maps || map) return;

      map = new google.maps.Map(mapDivRef.current, {
        center: pins[0] ? { lat: pins[0].approx_lat, lng: pins[0].approx_lng } : DEFAULT_CENTER,
        zoom: pins.length > 0 ? 12 : 4,
      });

      markers = pins.map((pin) => {
        const marker = new google.maps.Marker({
          position: { lat: pin.approx_lat, lng: pin.approx_lng },
          title: pin.title,
        });
        marker.addListener("click", () => setSelectedPin(pin));
        return marker;
      });

      clusterer = new MarkerClusterer({ map, markers });

      if (pins.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        pins.forEach((pin) => bounds.extend({ lat: pin.approx_lat, lng: pin.approx_lng }));
        map.fitBounds(bounds);
      }
    }

    init();
    window.addEventListener(GOOGLE_MAPS_LOADED_EVENT, init);
    return () => {
      window.removeEventListener(GOOGLE_MAPS_LOADED_EVENT, init);
      clusterer?.clearMarkers();
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [pins]);

  return (
    <div className="relative">
      <GoogleMapsScript />
      <div
        ref={mapDivRef}
        className="h-[500px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
      />

      {pins.length === 0 && (
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white px-3 py-2 text-sm text-zinc-600 shadow dark:bg-zinc-900 dark:text-zinc-400">
          Nothing available right now. Check back soon.
        </p>
      )}

      {selectedPin && (
        <div className="absolute bottom-4 left-4 right-4 flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:right-auto sm:w-80">
          {selectedPin.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedPin.photo_url}
              alt={selectedPin.title}
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-2xl dark:bg-zinc-800">
              🍲
            </div>
          )}
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="text-sm font-semibold">{selectedPin.title}</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{selectedPin.quantity}</p>
            <Link href={`/browse/${selectedPin.id}`} className="text-xs font-medium underline">
              View listing
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPin(null)}
            aria-label="Close preview"
            className="self-start text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
