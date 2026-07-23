import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BanUserButton } from "@/components/admin/ban-user-button";
import { formatDateTime } from "@/lib/format";
import type { PublicListing, Report, User } from "@/types/database";

type ReportedUser = Pick<User, "id" | "display_name" | "is_banned">;
type ReportedListing = Pick<PublicListing, "id" | "title" | "status" | "owner_id">;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewerProfile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle<Pick<User, "is_admin">>();

  if (!viewerProfile?.is_admin) {
    redirect("/");
  }

  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Report[]>();

  const reportedListingIds = [
    ...new Set((reports ?? []).flatMap((r) => (r.reported_listing_id ? [r.reported_listing_id] : []))),
  ];

  // Fetched first (not in parallel with the users query below) because a
  // reported listing's owner needs to end up in the users lookup too - it's
  // the ban target for a listing-only report (no reported_user_id set).
  const { data: listings } = reportedListingIds.length
    ? await supabase
        .from("listings")
        .select("id, title, status, owner_id")
        .in("id", reportedListingIds)
        .returns<ReportedListing[]>()
    : { data: [] as ReportedListing[] };

  const listingsById = new Map((listings ?? []).map((l) => [l.id, l]));

  const userIds = [
    ...new Set(
      (reports ?? []).flatMap((r) => [r.reporter_id, ...(r.reported_user_id ? [r.reported_user_id] : [])])
        .concat((listings ?? []).map((l) => l.owner_id)),
    ),
  ];

  const { data: users } = userIds.length
    ? await supabase
        .from("users")
        .select("id, display_name, is_banned")
        .in("id", userIds)
        .returns<ReportedUser[]>()
    : { data: [] as ReportedUser[] };

  const usersById = new Map((users ?? []).map((u) => [u.id, u]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {success}
        </p>
      )}

      {!reports || reports.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No reports yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reports.map((report) => {
            const reporter = usersById.get(report.reporter_id);
            const reportedUser = report.reported_user_id
              ? usersById.get(report.reported_user_id)
              : undefined;
            const reportedListing = report.reported_listing_id
              ? listingsById.get(report.reported_listing_id)
              : undefined;

            // A listing-only report's implied ban target is its owner - but
            // only while both the listing and its owner still resolve; if
            // either was deleted there's nothing left to act on here.
            const banTargetId = report.reported_user_id ?? reportedListing?.owner_id ?? null;
            const banTarget = banTargetId ? usersById.get(banTargetId) : undefined;

            return (
              <li
                key={report.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Reported by{" "}
                    <Link href={`/users/${report.reporter_id}`} className="break-words underline">
                      {reporter?.display_name ?? "Unknown user"}
                    </Link>
                  </p>
                  <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
                    {formatDateTime(report.created_at)}
                  </span>
                </div>

                <p className="text-sm font-medium">{report.reason}</p>
                {report.details && (
                  <p className="break-words text-sm text-zinc-600 dark:text-zinc-400">
                    {report.details}
                  </p>
                )}

                <div className="flex flex-col gap-1 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
                  {reportedUser ? (
                    <p>
                      User:{" "}
                      <Link href={`/users/${reportedUser.id}`} className="break-words underline">
                        {reportedUser.display_name}
                      </Link>{" "}
                      {reportedUser.is_banned && (
                        <span className="text-xs text-red-600 dark:text-red-400">(already banned)</span>
                      )}
                    </p>
                  ) : reportedListing ? (
                    <p className="break-words">
                      Listing:{" "}
                      <Link href={`/browse/${reportedListing.id}`} className="underline">
                        {reportedListing.title}
                      </Link>{" "}
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">
                        ({reportedListing.status})
                      </span>
                    </p>
                  ) : (
                    <p className="text-zinc-500 dark:text-zinc-500">
                      Reported user or listing no longer exists.
                    </p>
                  )}
                </div>

                {banTarget && !banTarget.is_banned && (
                  <BanUserButton userId={banTarget.id} redirectTo="/admin" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
