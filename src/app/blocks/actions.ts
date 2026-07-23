"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function blockUserAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const blockedId = String(formData.get("blocked_id") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/blocked");
  if (!blockedId || blockedId === user.id) redirect(redirectTo);

  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: user.id, blocked_id: blockedId });

  // 23505 = already blocked (unique violation) - nothing more to do, so
  // treat it the same as a fresh block rather than surfacing an error.
  if (error && error.code !== "23505") {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/users/${blockedId}`);
  revalidatePath("/blocked");
  redirect(`${redirectTo}?success=${encodeURIComponent("User blocked.")}`);
}

export async function unblockUserAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const blockedId = String(formData.get("blocked_id") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/blocked");
  if (!blockedId) redirect(redirectTo);

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId);

  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/users/${blockedId}`);
  revalidatePath("/blocked");
  redirect(`${redirectTo}?success=${encodeURIComponent("User unblocked.")}`);
}
