"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ReportFormState = {
  error?: string;
  fieldErrors?: { reason?: string };
  success?: boolean;
};

export async function submitReportAction(
  _prevState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reportedUserId = String(formData.get("reported_user_id") ?? "").trim() || null;
  const reportedListingId = String(formData.get("reported_listing_id") ?? "").trim() || null;
  const reason = String(formData.get("reason") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();

  if (!reason) {
    return { fieldErrors: { reason: "Please choose a reason." } };
  }
  if (!reportedUserId && !reportedListingId) {
    return { error: "There's nothing to report here." };
  }
  if (reportedUserId === user.id) {
    return { error: "You can't report yourself." };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_user_id: reportedUserId,
    reported_listing_id: reportedListingId,
    reason,
    details: details || null,
  });

  if (error) {
    return { error: "Could not submit that report. Please try again." };
  }

  return { success: true };
}
