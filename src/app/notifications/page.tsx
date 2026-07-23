import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markNotificationReadAction } from "@/app/notifications/actions";
import { EmptyState } from "@/components/empty-state";
import { NotificationSubmitButton } from "@/components/notifications/notification-submit-button";
import { formatDateTime } from "@/lib/format";
import type { Notification } from "@/types/database";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Opening this view marks everything as read, right away - not just the
  // notifications the user goes on to click. See NotificationBell for how
  // the header badge clears immediately without waiting on a fresh server
  // render to pick this up (it can't: the root layout - and its badge -
  // renders before this page does, so a hard load here would otherwise
  // still show the stale count).
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

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
        <EmptyState
          icon="🔔"
          title="No notifications yet"
          description="You'll be notified here when someone requests your listing, or when your own request gets a response. In the meantime, see what's nearby."
          action={{ href: "/browse", label: "Browse listings" }}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <form action={markNotificationReadAction}>
                <input type="hidden" name="notification_id" value={notification.id} />
                <input type="hidden" name="redirect_to" value={notification.link} />
                <NotificationSubmitButton read={notification.read}>
                  <span className="min-w-0 break-words text-sm font-medium">{notification.message}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {formatDateTime(notification.created_at)}
                  </span>
                </NotificationSubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
