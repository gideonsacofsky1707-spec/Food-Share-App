import webpush from "web-push";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import type { PushSubscriptionRow } from "@/types/database";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@foodshare.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
} else {
  // Without this, sendPushToUser below just no-ops forever with no signal
  // anywhere that pushes are misconfigured rather than merely "nobody's
  // subscribed yet". Logged once at module load, not per-send.
  console.warn(
    "[push] VAPID keys are not set (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) - " +
      "sendPushToUser will silently no-op for every call.",
  );
}

export type PushPayload = { title: string; body: string; url: string };

// Sends a real browser/device push to every subscription on file for
// `userId`, in addition to (never instead of) the in-app notification the
// caller already writes via the DB triggers in 0008_notifications.sql.
//
// Uses the service role key rather than the request-scoped, RLS-bound
// client used everywhere else in the app: the caller here is the *other*
// party in the exchange (e.g. the claimer whose request just got
// accepted), not `userId` themselves, so the normal
// `user_id = auth.uid()` policy on push_subscriptions would (correctly)
// block reading these rows.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return; // already warned at module load, above
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    console.warn(
      "[push] SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not set - sendPushToUser can't read push_subscriptions and will no-op.",
    );
    return;
  }

  try {
    const supabase = createServiceRoleClient(supabaseUrl, serviceRoleKey);

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)
      .returns<Pick<PushSubscriptionRow, "endpoint" | "p256dh" | "auth">[]>();

    if (!subscriptions?.length) {
      // Not necessarily a bug - the recipient may simply never have
      // enabled push - but worth a log line so "nobody got a push" can be
      // told apart from "the send itself failed" while diagnosing.
      console.warn(`[push] no push_subscriptions on file for user ${userId} - nothing to send.`);
      return;
    }

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
        } catch (err) {
          // 404/410 means the push service has permanently invalidated this
          // endpoint (uninstalled, permission revoked, etc.) - clean it up
          // so we stop paying for a doomed request on every future event.
          const statusCode = (err as { statusCode?: number } | null)?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          } else {
            // Anything else (most commonly a 400/401/403 from the push
            // service - e.g. the subscription was created against a
            // different VAPID public key than the one currently
            // configured, which the service rejects rather than silently
            // accepting) was previously swallowed here with zero signal.
            // That made "push just doesn't arrive" indistinguishable from
            // "everything's fine, nobody's subscribed" - log it instead.
            console.error(
              `[push] sendNotification failed for endpoint ${sub.endpoint.slice(0, 60)}...`,
              statusCode ?? "",
              err instanceof Error ? err.message : err,
            );
          }
        }
      }),
    );
  } catch (err) {
    // Push notifications are a best-effort enhancement - never let a
    // delivery failure break the request/accept/decline action itself -
    // but still log it, for the same reason as above.
    console.error("[push] sendPushToUser failed:", err instanceof Error ? err.message : err);
  }
}
