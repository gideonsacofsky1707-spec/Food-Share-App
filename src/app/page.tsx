import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const steps = [
  {
    title: "Post",
    description: "Got extra soup, garden veggies, or a pantry to clear out? List it in a minute.",
  },
  {
    title: "Discover",
    description: "Neighbors nearby browse and find your listing before it goes to waste.",
  },
  {
    title: "Claim & chat",
    description: "Someone requests it, you accept, and you arrange pickup right in the app.",
  },
];

export default async function Home() {
  // This marketing landing page is only useful before signing up - a
  // logged-in visitor's "home" is the actual app, not a pitch for it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/browse");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
      <section className="flex flex-col items-center gap-5 text-center">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Share extra food with neighbors nearby.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 sm:text-xl">
          FoodShare helps you give away surplus or leftover food — for free — to people close
          by, instead of letting it go to waste. No payments, no marketplace, just neighbors.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-primary-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
          >
            Sign up free
          </Link>
          <Link
            href="/browse"
            className="rounded-full border border-zinc-300 px-6 py-2.5 font-medium transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
          >
            Browse listings
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              Step {i + 1}
            </span>
            <h2 className="text-lg font-semibold">{step.title}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{step.description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
