"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("notification_id") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/notifications");

  if (id) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  redirect(redirectTo);
}
