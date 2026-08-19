"use client";

import { useEffect } from "react";
import { ensurePushSubscription } from "@/lib/push-client";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline caching is a progressive enhancement - ignore failures.
      });
    }
  }, []);

  // Self-heal for a device that already has Notification.permission
  // "granted" but no working push_subscriptions row - most notably, one
  // that hit PushPermissionPrompt's now-fixed silent failure (permission
  // granted, but pushManager.subscribe()/subscribePushAction() threw with
  // nothing logged and no way to re-show that banner, since it only shows
  // while permission is still "default"). Runs once per app load; cheap
  // and a no-op when a matching subscription already exists - see
  // ensurePushSubscription's own comment for why that's safe to rely on.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    ensurePushSubscription().catch((err) => {
      console.error(
        "[push] failed to (re)establish push subscription on load:",
        err instanceof Error ? err.message : err,
      );
    });
  }, []);

  return null;
}
