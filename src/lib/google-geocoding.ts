// Server-side geocoding: never trust a client-supplied lat/lng for a value
// that ends up backing public map pins later (milestone 7). The client-side
// Places Autocomplete (src/components/listings/address-autocomplete.tsx) is
// UX only - whatever address string the user submits gets re-resolved here.

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GeocodeApiResponse = {
  status: string;
  results: {
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components: AddressComponent[];
  }[];
};

export type GeocodedAddress = {
  formattedAddress: string;
  lat: number;
  lng: number;
  approxLocationLabel: string;
};

const NEIGHBORHOOD_TYPES = ["neighborhood", "sublocality", "sublocality_level_1"];

function deriveApproxLocationLabel(components: AddressComponent[]): string {
  const byType = (type: string) => components.find((c) => c.types.includes(type))?.long_name;

  const neighborhood = NEIGHBORHOOD_TYPES.map(byType).find(Boolean);
  const city = byType("locality") ?? byType("postal_town");
  const state = components.find((c) => c.types.includes("administrative_area_level_1"))?.short_name;

  const parts = [neighborhood, city, state].filter(
    (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index,
  );

  return parts.length > 0 ? parts.join(", ") : "Unknown area";
}

export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding API request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as GeocodeApiResponse;
  if (data.status !== "OK" || !data.results.length) {
    return null;
  }

  const [result] = data.results;
  return {
    formattedAddress: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    approxLocationLabel: deriveApproxLocationLabel(result.address_components),
  };
}
