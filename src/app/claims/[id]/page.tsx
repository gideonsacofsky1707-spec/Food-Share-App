import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessageAction } from "@/app/claims/actions";
import { formatDateTime } from "@/lib/format";
import { PUBLIC_LISTING_COLUMNS } from "@/lib/listings";
import type { ClaimWithParticipants, Message } from "@/types/database";

export default async function ClaimChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

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

  let messages: Message[] = [];
  if (claim.status === "accepted") {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("claim_id", id)
      .order("created_at", { ascending: true })
      .returns<Message[]>();
    messages = data ?? [];
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

      {claim.status !== "accepted" ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Chat opens once this request is accepted. Current status:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{claim.status}</span>
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {messages.length === 0 ? (
              <li className="text-sm text-zinc-600 dark:text-zinc-400">
                No messages yet. Say hello and figure out the pickup details.
              </li>
            ) : (
              messages.map((message) => {
                const isMine = message.sender_id === user.id;
                return (
                  <li
                    key={message.id}
                    className={`flex flex-col gap-0.5 rounded-xl px-3 py-2 text-sm ${
                      isMine
                        ? "self-end bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                        : "self-start bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    }`}
                  >
                    <span>{message.body}</span>
                    <span
                      className={`text-[10px] ${
                        isMine ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500"
                      }`}
                    >
                      {isMine ? "You" : otherParty.display_name} · {formatDateTime(message.created_at)}
                    </span>
                  </li>
                );
              })
            )}
          </ul>

          <form action={sendMessageAction} className="flex gap-2">
            <input type="hidden" name="claim_id" value={claim.id} />
            <input
              type="text"
              name="body"
              required
              placeholder="Write a message…"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              Send
            </button>
          </form>
        </>
      )}
    </main>
  );
}
