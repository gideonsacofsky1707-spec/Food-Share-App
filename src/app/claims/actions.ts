"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestClaimAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listingId = String(formData.get("listing_id") ?? "");
  if (!listingId) redirect("/browse");

  const { error } = await supabase
    .from("claims")
    .insert({ listing_id: listingId, claimer_id: user.id });

  if (error) {
    const message =
      error.code === "23505"
        ? "You've already requested this listing."
        : "Could not send that request. It may no longer be available.";
    redirect(`/browse/${listingId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/browse/${listingId}`);
  redirect(`/browse/${listingId}?success=${encodeURIComponent("Request sent to the owner.")}`);
}

export async function acceptClaimAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const claimId = String(formData.get("claim_id") ?? "");
  const listingId = String(formData.get("listing_id") ?? "");
  if (!claimId || !listingId) redirect("/listings");

  const { error } = await supabase.rpc("accept_claim", { p_claim_id: claimId });

  if (error) {
    redirect(`/listings/${listingId}/requests?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/listings/${listingId}/requests`);
  revalidatePath("/listings");
  redirect(`/listings/${listingId}/requests?success=${encodeURIComponent("Request accepted.")}`);
}

export async function declineClaimAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const claimId = String(formData.get("claim_id") ?? "");
  const listingId = String(formData.get("listing_id") ?? "");
  if (!claimId || !listingId) redirect("/listings");

  const { error } = await supabase
    .from("claims")
    .update({ status: "declined" })
    .eq("id", claimId);

  if (error) {
    redirect(`/listings/${listingId}/requests?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/listings/${listingId}/requests`);
  redirect(`/listings/${listingId}/requests?success=${encodeURIComponent("Request declined.")}`);
}

export async function sendMessageAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const claimId = String(formData.get("claim_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!claimId) redirect("/requests");

  if (!body) {
    redirect(`/claims/${claimId}?error=${encodeURIComponent("Message can't be empty.")}`);
  }

  // No .select() here on purpose - RLS's SELECT policy would otherwise be
  // evaluated against the RETURNING row for no benefit (see 0007's fix for
  // why that's worth avoiding by habit on this schema).
  const { error } = await supabase.from("messages").insert({ claim_id: claimId, sender_id: user.id, body });

  if (error) {
    redirect(`/claims/${claimId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/claims/${claimId}`);
  redirect(`/claims/${claimId}`);
}
