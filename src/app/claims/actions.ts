"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

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

  const { data: listingForPush } = await supabase
    .from("listings")
    .select("owner_id, title")
    .eq("id", listingId)
    .maybeSingle<{ owner_id: string; title: string }>();

  if (listingForPush) {
    await sendPushToUser(listingForPush.owner_id, {
      title: "New pickup request",
      body: `Someone requested "${listingForPush.title}"`,
      url: `/listings/${listingId}/requests`,
    });
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

  const [{ data: claimForPush }, { data: listingForPush }] = await Promise.all([
    supabase.from("claims").select("claimer_id").eq("id", claimId).maybeSingle<{ claimer_id: string }>(),
    supabase.from("listings").select("title").eq("id", listingId).maybeSingle<{ title: string }>(),
  ]);

  if (claimForPush && listingForPush) {
    await sendPushToUser(claimForPush.claimer_id, {
      title: "Request accepted",
      body: `Your request for "${listingForPush.title}" was accepted`,
      url: "/requests",
    });
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

  const [{ data: claimForPush }, { data: listingForPush }] = await Promise.all([
    supabase.from("claims").select("claimer_id").eq("id", claimId).maybeSingle<{ claimer_id: string }>(),
    supabase.from("listings").select("title").eq("id", listingId).maybeSingle<{ title: string }>(),
  ]);

  if (claimForPush && listingForPush) {
    await sendPushToUser(claimForPush.claimer_id, {
      title: "Request declined",
      body: `Your request for "${listingForPush.title}" was declined`,
      url: "/requests",
    });
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
    // TEMP debug logging - remove once chat push is confirmed working.
    // The client-facing message is deliberately vague below (see the
    // comment on that), so this is the only place the real reason a send
    // failed is visible at all - relevant right now because a missing
    // [push] chat: log turned out to plausibly mean the insert itself
    // never succeeded, not that the push code was unreached for some
    // other reason.
    console.error(`[chat] messages insert failed (code=${error.code}):`, error.message);
    // 42501 = blocked by RLS - most likely a block between the two
    // participants (see 0015_reports_and_blocks.sql). Deliberately vague
    // rather than confirming a block exists, same reasoning as
    // requestClaimAction's fallback message below.
    const message = error.code === "42501" ? "Could not send that message." : error.message;
    return { error: message };
  }

  // Push was originally only wired up for request/accept/decline (see
  // 0009_messages.sql's notify_on_new_message trigger for the in-app-only
  // equivalent this mirrors) - a new chat message never triggered a push
  // at all, so the recipient only found out by having the app open. Same
  // "whichever participant didn't send it" logic as that trigger, just
  // computed here instead of in Postgres since sendPushToUser needs the
  // service-role client rather than RLS.
  const { data: claimForPush, error: claimForPushError } = await supabase
    .from("claims")
    .select("claimer_id, listing:listings(owner_id, title)")
    .eq("id", claimId)
    .maybeSingle<{ claimer_id: string; listing: { owner_id: string; title: string } | null }>();

  // TEMP debug logging - remove once chat push delivery is confirmed
  // working. The recipient reported still not getting a push after this
  // was wired up despite request/accept/decline pushes working fine, so
  // rather than guess again, log exactly where this lookup lands.
  if (claimForPushError) {
    console.error("[push] chat: failed to look up claim/listing:", claimForPushError.message);
  } else {
    console.log("[push] chat: claimForPush =", JSON.stringify(claimForPush));
  }

  if (claimForPush?.listing) {
    const recipientId =
      user.id === claimForPush.claimer_id ? claimForPush.listing.owner_id : claimForPush.claimer_id;
    console.log(`[push] chat: sending to recipientId=${recipientId} (sender=${user.id})`);
    await sendPushToUser(recipientId, {
      title: "New message",
      body: `You have a new message about "${claimForPush.listing.title}"`,
      url: `/claims/${claimId}`,
    });
  }

  revalidatePath(`/claims/${claimId}`);
  return {};
}
