"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ListingFields = {
  title: string;
  description: string;
  quantity: string;
  best_by: string | null;
  pickup_window_start: string;
  pickup_window_end: string;
};

function parseListingFields(formData: FormData): ListingFields | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim();
  const bestByRaw = String(formData.get("best_by") ?? "").trim();
  const pickupStart = String(formData.get("pickup_window_start") ?? "").trim();
  const pickupEnd = String(formData.get("pickup_window_end") ?? "").trim();

  if (!title || !description || !quantity || !pickupStart || !pickupEnd) {
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

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({ ...fields, owner_id: user.id })
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

  const { error } = await supabase
    .from("listings")
    .update(fields)
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
