"use client";

import { subscribePushAction } from "@/app/push/actions";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Subscribes this device to push and stores it server-side. Safe to call
// whenever Notification.permission is already "granted", including
// repeatedly - PushManager.subscribe() returns the existing subscription
// rather than creating a duplicate when one's already active for the same
// applicationServerKey, and subscribePushAction treats re-inserting the
// same endpoint (23505) as success, not an error.
//
// The one case that isn't automatically idempotent: if a subscription
// already exists for a *different* applicationServerKey (e.g. the VAPID
// key pair was rotated after this device first subscribed), the browser
// rejects with InvalidStateError instead of silently swapping it - drop
// the stale subscription and subscribe fresh with the current key.
export async function ensurePushSubscription(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

  let subscription: PushSubscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch (err) {
    const existing = await registration.pushManager.getSubscription();
    if (!existing) throw err;
    await existing.unsubscribe();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  const result = await subscribePushAction(
    subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } },
  );
  if (result.error) throw new Error(result.error);
}
