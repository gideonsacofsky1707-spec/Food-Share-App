import Link from "next/link";

export function EmptyState({
  icon = "🍲",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-zinc-950 dark:hover:bg-primary-400"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
