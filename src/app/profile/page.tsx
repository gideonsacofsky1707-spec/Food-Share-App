import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import { UpdateProfileForm } from "@/components/profile/update-profile-form";
import { UploadAvatarForm } from "@/components/profile/upload-avatar-form";
import type { User } from "@/types/database";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single<User>();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <form action={signOutAction}>
          <SubmitButton pendingLabel="Logging out…" className="text-sm underline">
            Log out
          </SubmitButton>
        </form>
      </div>

      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {success}
        </p>
      )}

      <section className="flex flex-col items-center gap-3">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt="Your avatar"
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-200 text-2xl dark:bg-zinc-800">
            🍲
          </div>
        )}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {profile && profile.rating_count > 0
            ? `★ ${profile.rating_avg.toFixed(1)} (${profile.rating_count} rating${profile.rating_count === 1 ? "" : "s"})`
            : "No ratings yet"}
        </p>
        <UploadAvatarForm />
      </section>

      <UpdateProfileForm displayName={profile?.display_name ?? ""} email={user.email ?? ""} />

      <Link href="/blocked" className="text-sm underline">
        Blocked users
      </Link>
    </main>
  );
}
