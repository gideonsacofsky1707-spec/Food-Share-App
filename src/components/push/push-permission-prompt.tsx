"use client";

import { useEffect, useState } from "react";
import { ensurePushSubscription, VAPID_PUBLIC_KEY } from "@/lib/push-client";

const STORAGE_KEY = "foodshare-push-prompted";

// Shown right after the "sensible moment" the caller identifies via
// `eligible` (first listing created, or first request made) - never on
// page load. Only ever shown once: dismissing or enabling both set a
// localStorage flag, and an existing granted/denied browser permission
// suppresses it too.
export function PushPermissionPrompt({ eligible }: { eligible: boolean }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    if (typeof window === "undefined") return;
    if (!VAPID_PUBLIC_KEY) {
      // Without this, a missing/unset env var makes the prompt silently
      // never appear - indistinguishable from "user already dismissed it"
      // or "browser doesn't support push" with nothing to diagnose from.
      // See .env.example for how to generate a real key pair; NEXT_PUBLIC_
      // vars must be set at *build* time, so setting this in Vercel still
      // requires a redeploy to take effect.
      console.warn(
        "[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set - the push permission prompt will never show.",
      );
      return;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Genuinely synchronizing with external browser state (Notification
    // permission, localStorage) that isn't available during SSR/initial
    // render, so it can't be computed as derived state instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, [eligible]);

  async function handleEnable() {
    setBusy(true);
    localStorage.setItem(STORAGE_KEY, "1");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      await ensurePushSubscription();
    } catch (err) {
      // Previously uncaught here (only a `finally`, no `catch`): the
      // banner would just disappear as if this had succeeded, with
      // nothing logged - and since Notification.permission is "granted"
      // at this point regardless of outcome, the effect above can never
      // show this banner again, so there was no way to retry either. The
      // self-heal effect in ServiceWorkerRegistration is the actual retry
      // path now; this is just making the failure visible.
      console.error(
        "[push] failed to enable push notifications:",
        err instanceof Error ? err.message : err,
      );
    } finally {
      setBusy(false);
      setVisible(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
      <p className="text-zinc-700 dark:text-zinc-300">
        Get notified instantly about requests and replies, even when FoodShare is closed.
      </p>
      <div className="flex shrink-0 gap-3">
        <button
          type="button"
          onClick={handleDismiss}
          className="text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="rounded-full bg-primary-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
        >
          {busy ? "Enabling…" : "Enable"}
        </button>
      </div>
    </div>
  );
}
