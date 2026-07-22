import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markCollectedAction, sendMessageAction } from "@/app/claims/actions";
import { ChatThread } from "@/components/claims/chat-thread";
import { MarkCollectedForm } from "@/components/claims/mark-collected-form";
import { RatingForm } from "@/components/claims/rating-form";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { PUBLIC_LISTING_COLUMNS } from "@/lib/listings";
import type { ClaimWithParticipants, Message, Rating } from "@/types/database";

export default async function ClaimChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: claim } = await supabase
    .from("claims")
    .select(
      `*, listing:listings(${PUBLIC_LISTING_COLUMNS}, owner:users(display_name, avatar_url)), claimer:users(display_name, avatar_url)`,
    )
    .eq("id", id)
    .single<ClaimWithParticipants>();

  if (!claim) {
    notFound();
  }

  const isOwner = user.id === claim.listing.owner_id;
  const otherParty = isOwner ? claim.claimer : claim.listing.owner;
  const otherPartyId = isOwner ? claim.claimer_id : claim.listing.owner_id;

  // Chat access spans both "accepted" (pickup being arranged) and
  // "completed" (already picked up) - see user_is_accepted_claim_participant
  // in 0014_ratings.sql for why the thread doesn't disappear once collected.
  let messages: Message[] = [];
  if (claim.status === "accepted" || claim.status === "completed") {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("claim_id", id)
      .order("created_at", { ascending: true })
      .returns<Message[]>();
    messages = data ?? [];
  }

  let myRating: Rating | null = null;
  if (claim.status === "completed") {
    const { data } = await supabase
      .from("ratings")
      .select("*")
      .eq("claim_id", id)
      .eq("rater_id", user.id)
      .maybeSingle<Rating>();
    myRating = data;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <Link
          href={isOwner ? `/listings/${claim.listing.id}/requests` : "/requests"}
          className="text-sm underline"
        >
          ← Back
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{claim.listing.title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Chat with {otherParty.display_name}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Pickup: {formatDateTime(claim.listing.pickup_window_start)} –{" "}
          {formatDateTime(claim.listing.pickup_window_end)}
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {success}
        </p>
      )}

      {claim.status !== "accepted" && claim.status !== "completed" ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Chat opens once this request is accepted. Current status:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{claim.status}</span>
        </p>
      ) : (
        <>
          {claim.status === "accepted" && (
            <MarkCollectedForm
              claimId={claim.id}
              listingId={claim.listing.id}
              action={markCollectedAction}
            />
          )}

          <ChatThread
            claimId={claim.id}
            initialMessages={messages}
            currentUserId={user.id}
            otherPartyName={otherParty.display_name}
          />

          {claim.status === "accepted" && (
            <form action={sendMessageAction} className="flex gap-2">
              <input type="hidden" name="claim_id" value={claim.id} />
              <input
                type="text"
                name="body"
                required
                placeholder="Write a message…"
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <SubmitButton
                pendingLabel="Sending…"
                className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Send
              </SubmitButton>
            </form>
          )}

          {claim.status === "completed" &&
            (myRating ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                You rated this exchange: {"★".repeat(myRating.score)}
                {"☆".repeat(5 - myRating.score)}
              </p>
            ) : (
              <RatingForm
                claimId={claim.id}
                rateeId={otherPartyId}
                rateeName={otherParty.display_name}
              />
            ))}
        </>
      )}
    </main>
  );
}
