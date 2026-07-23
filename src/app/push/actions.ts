"use server";

import { createClient } from "@/lib/supabase/server";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type SubscribePushState = { error?: string };

export async function subscribePushAction(
  subscription: PushSubscriptionInput,
): Promise<SubscribePushState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });

  // 23505 = unique violation on endpoint - this device is already
  // subscribed, which is the desired end state, not an error.
  if (error && error.code !== "23505") {
    return { error: error.message };
  }

  return {};
}
