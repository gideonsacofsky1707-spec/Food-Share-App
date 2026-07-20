import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  signOutAction,
  updateProfileAction,
  uploadAvatarAction,
} from "@/app/auth/actions";
import type { User } from "@/types/database";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

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
          <button type="submit" className="text-sm underline">
            Log out
          </button>
        </form>
      </div>

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
        <form action={uploadAvatarAction} className="flex flex-col items-center gap-2">
          <input type="file" name="avatar" accept="image/*" required />
          <button
            type="submit"
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm dark:border-zinc-700"
          >
            Upload avatar
          </button>
        </form>
      </section>

      <form action={updateProfileAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Display name
          <input
            type="text"
            name="display_name"
            required
            defaultValue={profile?.display_name ?? ""}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={user.email ?? ""}
            disabled
            className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-5 py-2 font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Save
        </button>
      </form>
    </main>
  );
}
