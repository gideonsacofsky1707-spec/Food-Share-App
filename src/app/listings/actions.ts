"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/google-geocoding";

type ListingFields = {
  title: string;
  description: string;
  quantity: string;
  best_by: string | null;
  pickup_window_start: string;
  pickup_window_end: string;
  address: string;
};

export type ListingFieldErrors = Partial<
  Record<
    | "title"
    | "description"
    | "quantity"
    | "address"
    | "pickup_window_start"
    | "pickup_window_end"
    | "photo",
    string
  >
>;

export type ListingFormState = {
  error?: string;
  fieldErrors?: ListingFieldErrors;
};

function parseListingFields(formData: FormData): { fields: ListingFields } | { fieldErrors: ListingFieldErrors } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim();
  const bestByRaw = String(formData.get("best_by") ?? "").trim();
  const pickupStart = String(formData.get("pickup_window_start") ?? "").trim();
  const pickupEnd = String(formData.get("pickup_window_end") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  const fieldErrors: ListingFieldErrors = {};
  if (!title) fieldErrors.title = "Title is required.";
  if (!description) fieldErrors.description = "Description is required.";
  if (!quantity) fieldErrors.quantity = "Quantity is required.";
  if (!address) fieldErrors.address = "Pickup address is required.";
  if (!pickupStart) fieldErrors.pickup_window_start = "Pickup window start is required.";
  if (!pickupEnd) fieldErrors.pickup_window_end = "Pickup window end is required.";

  if (
    pickupStart &&
    pickupEnd &&
    new Date(pickupEnd).getTime() <= new Date(pickupStart).getTime()
  ) {
    fieldErrors.pickup_window_end = "Pickup end time must be after the start time.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  return {
    fields: {
      title,
      description,
      quantity,
      best_by: bestByRaw || null,
      pickup_window_start: pickupStart,
      pickup_window_end: pickupEnd,
      address,
    },
  };
}

async function resolveLocationFields(address: string): Promise<
  | { ok: true; location: string; approx_location_label: string; exact_address: string }
  | { ok: false; error: string }
> {
  const geocoded = await geocodeAddress(address);
  if (!geocoded) {
    return {
      ok: false,
      error: "Could not find that address. Please pick a suggestion from the list.",
    };
  }

  return {
    ok: true,
    location: `POINT(${geocoded.lng} ${geocoded.lat})`,
    approx_location_label: geocoded.approxLocationLabel,
    exact_address: geocoded.formattedAddress,
  };
}

async function uploadListingPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  listingId: string,
  file: File,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${listingId}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("listing-photos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("listing-photos").getPublicUrl(path);

  return { ok: true, publicUrl: `${publicUrl}?t=${Date.now()}` };
}

export async function createListingAction(
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseListingFields(formData);
  if ("fieldErrors" in parsed) {
    return { fieldErrors: parsed.fieldErrors };
  }

  const { address, ...listingFields } = parsed.fields;
  const location = await resolveLocationFields(address);
  if (!location.ok) {
    return { fieldErrors: { address: location.error } };
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      ...listingFields,
      location: location.location,
      approx_location_label: location.approx_location_label,
      exact_address: location.exact_address,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (error || !listing) {
    return { error: error?.message ?? "Could not create listing." };
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const result = await uploadListingPhoto(supabase, user.id, listing.id, photo);
    if (!result.ok) {
      return { fieldErrors: { photo: result.error } };
    }
    await supabase.from("listings").update({ photo_url: result.publicUrl }).eq("id", listing.id);
  }

  revalidatePath("/listings");
  redirect("/listings?success=Listing+created");
}

export async function updateListingAction(
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/listings");

  const parsed = parseListingFields(formData);
  if ("fieldErrors" in parsed) {
    return { fieldErrors: parsed.fieldErrors };
  }

  const { address, ...listingFields } = parsed.fields;
  const location = await resolveLocationFields(address);
  if (!location.ok) {
    return { fieldErrors: { address: location.error } };
  }

  const { error } = await supabase
    .from("listings")
    .update({
      ...listingFields,
      location: location.location,
      approx_location_label: location.approx_location_label,
      exact_address: location.exact_address,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return { error: error.message };
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const result = await uploadListingPhoto(supabase, user.id, id, photo);
    if (!result.ok) {
      return { fieldErrors: { photo: result.error } };
    }
    await supabase
      .from("listings")
      .update({ photo_url: result.publicUrl })
      .eq("id", id)
      .eq("owner_id", user.id);
  }

  revalidatePath("/listings");
  redirect("/listings?success=Listing+updated");
}

export async function deleteListingAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/listings");

  const { error } = await supabase
    .from("listings")
    .update({ status: "removed" })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`/listings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/listings");
  redirect("/listings?success=Listing+deleted");
}
