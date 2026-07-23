"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function banUserAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const targetUserId = String(formData.get("user_id") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/admin");
  if (!targetUserId) redirect(redirectTo);

  // ban_user() (0016_report_history_and_admin.sql) re-checks is_admin
  // itself and raises if the caller isn't one - the page-level gate is
  // just the first layer, not the only one.
  const { error } = await supabase.rpc("ban_user", { p_user_id: targetUserId });

  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  redirect(`${redirectTo}?success=${encodeURIComponent("User banned.")}`);
}
