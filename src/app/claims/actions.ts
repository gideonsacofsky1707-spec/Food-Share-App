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

export async function markCollectedAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const claimId = String(formData.get("claim_id") ?? "");
  const listingId = String(formData.get("listing_id") ?? "");
  if (!claimId) redirect("/requests");

  const { error } = await supabase.rpc("mark_claim_collected", { p_claim_id: claimId });

  if (error) {
    redirect(`/claims/${claimId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/claims/${claimId}`);
  revalidatePath("/requests");
  if (listingId) revalidatePath(`/listings/${listingId}/requests`);
  redirect(
    `/claims/${claimId}?success=${encodeURIComponent("Marked as collected. You can now rate this exchange.")}`,
  );
}

export type RatingFormState = {
  error?: string;
  fieldErrors?: { score?: string };
};

export async function submitRatingAction(
  _prevState: RatingFormState,
  formData: FormData,
): Promise<RatingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const claimId = String(formData.get("claim_id") ?? "");
  const rateeId = String(formData.get("ratee_id") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  const score = Number(formData.get("score"));
  if (!claimId) redirect("/requests");

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return { fieldErrors: { score: "Pick a star rating from 1 to 5." } };
  }

  const { error } = await supabase.from("ratings").insert({
    claim_id: claimId,
    rater_id: user.id,
    ratee_id: rateeId,
    score,
    comment: comment || null,
  });

  if (error) {
    const message =
      error.code === "23505"
        ? "You've already rated this exchange."
        : "Could not submit that rating.";
    return { error: message };
  }

  revalidatePath(`/claims/${claimId}`);
  revalidatePath("/profile");
  redirect(`/claims/${claimId}?success=${encodeURIComponent("Thanks for rating this exchange.")}`);
}

export type SendMessageFormState = { error?: string };

export async function sendMessageAction(
  _prevState: SendMessageFormState,
  formData: FormData,
): Promise<SendMessageFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const claimId = String(formData.get("claim_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!claimId) redirect("/requests");

  if (!body) {
    return { error: "Message can't be empty." };
  }

  // No .select() here on purpose - RLS's SELECT policy would otherwise be
  // evaluated against the RETURNING row for no benefit (see 0007's fix for
  // why that's worth avoiding by habit on this schema).
  const { error } = await supabase.from("messages").insert({ claim_id: claimId, sender_id: user.id, body });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/claims/${claimId}`);
  return {};
}
