import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BlockUserButton } from "@/components/blocks/block-user-button";
import type { Block, User } from "@/types/database";

export default async function BlockedUsersPage({
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

  const { data: blocks } = await supabase
    .from("blocks")
    .select("blocked_id, created_at")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Pick<Block, "blocked_id" | "created_at">[]>();

  const blockedIds = (blocks ?? []).map((block) => block.blocked_id);

  // Separate lookup rather than embedding blocks->users in one query - blocks
  // has two FKs to users (blocker_id and blocked_id), and this sidesteps any
  // ambiguity in which relationship the embed would resolve to.
  const { data: blockedUsers } = blockedIds.length
    ? await supabase
        .from("users")
        .select("id, display_name, avatar_url")
        .in("id", blockedIds)
        .returns<Pick<User, "id" | "display_name" | "avatar_url">[]>()
    : { data: [] };

  const blockedUsersById = new Map((blockedUsers ?? []).map((u) => [u.id, u]));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Blocked users</h1>

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

      {!blocks || blocks.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You haven&apos;t blocked anyone.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {blocks.map((block) => {
            const blockedUser = blockedUsersById.get(block.blocked_id);
            return (
              <li
                key={block.blocked_id}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {blockedUser?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={blockedUser.avatar_url}
                      alt={blockedUser.display_name}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-lg dark:bg-zinc-800">
                      🍲
                    </div>
                  )}
                  <Link
                    href={`/users/${block.blocked_id}`}
                    className="min-w-0 break-words font-medium underline"
                  >
                    {blockedUser?.display_name ?? "Deleted user"}
                  </Link>
                </div>
                <BlockUserButton blockedId={block.blocked_id} isBlocked redirectTo="/blocked" />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
