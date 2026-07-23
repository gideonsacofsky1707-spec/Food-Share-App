import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BlockUserButton } from "@/components/blocks/block-user-button";
import { ReportButton } from "@/components/reports/report-button";
import type { PublicProfile } from "@/types/database";

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  // This person's own listings/edit/etc. already live at /profile - keep
  // that as the one place to manage your own account rather than also
  // rendering report/block controls pointed at yourself here.
  if (viewer && viewer.id === id) {
    redirect("/profile");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, display_name, avatar_url, rating_avg, rating_count")
    .eq("id", id)
    .maybeSingle<PublicProfile>();

  if (!profile) {
    notFound();
  }

  let isBlocked = false;
  if (viewer) {
    const { data: existingBlock } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", viewer.id)
      .eq("blocked_id", id)
      .maybeSingle();
    isBlocked = !!existingBlock;
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-16">
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

      <section className="flex flex-col items-center gap-3">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-200 text-2xl dark:bg-zinc-800">
            🍲
          </div>
        )}
        <h1 className="min-w-0 break-words text-xl font-semibold">{profile.display_name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {profile.rating_count > 0
            ? `★ ${profile.rating_avg.toFixed(1)} (${profile.rating_count} rating${profile.rating_count === 1 ? "" : "s"})`
            : "No ratings yet"}
        </p>
      </section>

      {viewer ? (
        <div className="flex flex-col items-center gap-3">
          <BlockUserButton
            blockedId={profile.id}
            isBlocked={isBlocked}
            redirectTo={`/users/${profile.id}`}
          />
          <ReportButton reportedUserId={profile.id} label="Report user" />
        </div>
      ) : (
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="underline">
            Log in
          </Link>{" "}
          to report or block this user.
        </p>
      )}
    </main>
  );
}
