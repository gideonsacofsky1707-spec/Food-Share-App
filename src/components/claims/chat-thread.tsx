"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { Message } from "@/types/database";

// formatDateTime() uses toLocaleString(), which depends on the runtime's
// timezone/locale. The server (Node) and this browser almost never agree,
// so rendering it directly in a client component's initial render makes
// the server-rendered HTML and the client's hydration render disagree on
// this exact text - a hydration mismatch (React error #418), not just a
// cosmetic difference. Rendering nothing until after mount sidesteps it:
// server and the pre-hydration client render both produce the same
// (empty) output, and the real local-time string swaps in immediately
// after via a client-only effect, once there's no longer anything for
// hydration to compare against.
function MessageTimestamp({ value }: { value: string }) {
  const [mounted, setMounted] = useState(false);
  // Deliberately setState-in-effect: this is the standard "only render
  // after mount" pattern for content that must differ between server and
  // client (see the comment above), not a derived-state effect the lint
  // rule is meant to catch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  return mounted ? <>{formatDateTime(value)}</> : null;
}

export function ChatThread({
  claimId,
  initialMessages,
  currentUserId,
  otherPartyName,
}: {
  claimId: string;
  initialMessages: Message[];
  currentUserId: string;
  otherPartyName: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  // Keep in sync with the server-fetched list across navigations (e.g.
  // after sending a message triggers a redirect back to this same page).
  // Adjusting state during render (React's documented pattern for this,
  // https://react.dev/learn/you-might-not-need-an-effect) instead of in a
  // useEffect avoids an extra render pass.
  const [prevInitialMessages, setPrevInitialMessages] = useState(initialMessages);
  if (initialMessages !== prevInitialMessages) {
    setPrevInitialMessages(initialMessages);
    setMessages(initialMessages);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:claim:${claimId}`)
      .on<Message>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `claim_id=eq.${claimId}`,
        },
        (payload) => {
          // TEMP debug logging - remove once live delivery is confirmed working.
          console.log("[chat-thread] received INSERT", payload.new);
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new],
          );
        },
      )
      // TEMP debug logging - remove once live delivery is confirmed working.
      // status is one of SUBSCRIBED / TIMED_OUT / CLOSED / CHANNEL_ERROR; err
      // carries the reason when Postgres/Realtime rejects the subscription
      // (e.g. a permission or replication problem), which otherwise fails
      // silently with no visible symptom other than "it just doesn't update".
      .subscribe((status, err) => {
        console.log("[chat-thread] subscription status:", status, err ?? "");
      });

    return () => {
      console.log("[chat-thread] unsubscribing for claim", claimId);
      supabase.removeChannel(channel);
    };
  }, [claimId]);

  if (messages.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No messages yet. Say hello and figure out the pickup details.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {messages.map((message) => {
        const isMine = message.sender_id === currentUserId;
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
              className={`text-[10px] ${isMine ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500"}`}
            >
              {isMine ? "You" : otherPartyName} · <MessageTimestamp value={message.created_at} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
