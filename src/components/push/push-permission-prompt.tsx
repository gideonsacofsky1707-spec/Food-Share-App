"use client";

import { useEffect, useState } from "react";
import { subscribePushAction } from "@/app/push/actions";

const STORAGE_KEY = "foodshare-push-prompted";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Shown right after the "sensible moment" the caller identifies via
// `eligible` (first listing created, or first request made) - never on
// page load. Only ever shown once: dismissing or enabling both set a
// localStorage flag, and an existing granted/denied browser permission
// suppresses it too.
export function PushPermissionPrompt({ eligible }: { eligible: boolean }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!eligible || !VAPID_PUBLIC_KEY) return;
    if (typeof window === "undefined") return;
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

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });

      await subscribePushAction(
        subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } },
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
