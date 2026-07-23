"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { GoogleMapsScript, GOOGLE_MAPS_LOADED_EVENT } from "@/components/google-maps-script";
import type { MapPin } from "@/types/database";

// Absolute last resort: center of the contiguous US, only used when we have
// neither a device location nor any pins to average - i.e. an empty map with
// no signal at all for where the viewer might be.
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;
// Close enough to see nearby listings around the viewer without them having
// to zoom in manually.
const DEVICE_LOCATION_ZOOM = 13;
const PINS_AVERAGE_ZOOM = 12;
// Caps how long we wait on a location fix (or the permission prompt) before
// falling back, so a slow GPS or an ignored prompt can't stall the map.
const GEOLOCATION_TIMEOUT_MS = 5000;

function averagePinCenter(pins: MapPin[]) {
  if (pins.length === 0) return null;
  const total = pins.reduce(
    (acc, pin) => ({ lat: acc.lat + pin.approx_lat, lng: acc.lng + pin.approx_lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: total.lat / pins.length, lng: total.lng / pins.length };
}

// Resolves to null (rather than rejecting) on denial/timeout/unsupported
// browsers, so callers can treat "no device location" as one plain case to
// fall back from instead of a try/catch.
function getDeviceLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  });
}

export function ListingsMap({
  pins,
  emptyStateAction,
}: {
  pins: MapPin[];
  emptyStateAction: { href: string; label: string };
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  useEffect(() => {
    let map: google.maps.Map | undefined;
    let markers: google.maps.Marker[] = [];
    let clusterer: MarkerClusterer | undefined;
    let cancelled = false;
    let initStarted = false;

    async function init() {
      if (!mapDivRef.current || !window.google?.maps || map || initStarted) return;
      initStarted = true;

      const deviceLocation = await getDeviceLocation();
      if (cancelled || !mapDivRef.current) return;

      const pinsCenter = averagePinCenter(pins);
      const center = deviceLocation ?? pinsCenter ?? DEFAULT_CENTER;
      const zoom = deviceLocation
        ? DEVICE_LOCATION_ZOOM
        : pinsCenter
          ? PINS_AVERAGE_ZOOM
          : DEFAULT_ZOOM;

      map = new google.maps.Map(mapDivRef.current, { center, zoom });

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
      cancelled = true;
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
        className="h-[60vh] max-h-[500px] min-h-[300px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
      />

      {pins.length === 0 && (
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-md bg-white px-4 py-3 text-center shadow dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No listings nearby yet - be the first to share!
          </p>
          <Link
            href={emptyStateAction.href}
            className="text-sm font-medium text-primary-600 underline dark:text-primary-400"
          >
            {emptyStateAction.label}
          </Link>
        </div>
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
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="min-w-0 break-words text-sm font-semibold">{selectedPin.title}</h3>
            <p className="break-words text-xs text-zinc-600 dark:text-zinc-400">{selectedPin.quantity}</p>
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
