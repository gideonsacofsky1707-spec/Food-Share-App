import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markNotificationReadAction } from "@/app/notifications/actions";
import { formatDateTime } from "@/lib/format";
import type { Notification } from "@/types/database";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Notification[]>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>

      {!notifications || notifications.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nothing here yet. You&apos;ll see updates on your listings and requests as they happen.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <form action={markNotificationReadAction}>
                <input type="hidden" name="notification_id" value={notification.id} />
                <input type="hidden" name="redirect_to" value={notification.link} />
                <button
                  type="submit"
                  className={`flex w-full flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors ${
                    notification.read
                      ? "border-zinc-200 dark:border-zinc-800"
                      : "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900"
                  }`}
                >
                  <span className="text-sm font-medium">{notification.message}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {formatDateTime(notification.created_at)}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
