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

function parseListingFields(formData: FormData): ListingFields | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim();
  const bestByRaw = String(formData.get("best_by") ?? "").trim();
  const pickupStart = String(formData.get("pickup_window_start") ?? "").trim();
  const pickupEnd = String(formData.get("pickup_window_end") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!title || !description || !quantity || !pickupStart || !pickupEnd || !address) {
    return { error: "Please fill in all required fields." };
  }

  if (new Date(pickupEnd).getTime() <= new Date(pickupStart).getTime()) {
    return { error: "Pickup window end must be after the start." };
  }

  return {
    title,
    description,
    quantity,
    best_by: bestByRaw || null,
    pickup_window_start: pickupStart,
    pickup_window_end: pickupEnd,
    address,
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

export async function createListingAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fields = parseListingFields(formData);
  if ("error" in fields) {
    redirect(`/listings/new?error=${encodeURIComponent(fields.error)}`);
  }

  const { address, ...listingFields } = fields;
  const location = await resolveLocationFields(address);
  if (!location.ok) {
    redirect(`/listings/new?error=${encodeURIComponent(location.error)}`);
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
    redirect(`/listings/new?error=${encodeURIComponent(error?.message ?? "Could not create listing.")}`);
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const result = await uploadListingPhoto(supabase, user.id, listing.id, photo);
    if (!result.ok) {
      redirect(`/listings/new?error=${encodeURIComponent(result.error)}`);
    }
    await supabase.from("listings").update({ photo_url: result.publicUrl }).eq("id", listing.id);
  }

  revalidatePath("/listings");
  redirect("/listings?success=Listing+created");
}

export async function updateListingAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/listings");

  const fields = parseListingFields(formData);
  if ("error" in fields) {
    redirect(`/listings/${id}/edit?error=${encodeURIComponent(fields.error)}`);
  }

  const { address, ...listingFields } = fields;
  const location = await resolveLocationFields(address);
  if (!location.ok) {
    redirect(`/listings/${id}/edit?error=${encodeURIComponent(location.error)}`);
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
    redirect(`/listings/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const result = await uploadListingPhoto(supabase, user.id, id, photo);
    if (!result.ok) {
      redirect(`/listings/${id}/edit?error=${encodeURIComponent(result.error)}`);
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
