"use client";

import { useState, type ReactNode } from "react";

// Wraps the same nav links NavHeader already renders for desktop so there's
// only one source of truth for what's in the nav - this just owns whether
// they're visible on narrow screens, collapsed behind a hamburger button.
export function MobileNavToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Toggle navigation menu"
        className="flex h-11 w-11 items-center justify-center rounded-md text-xl"
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <nav
          onClick={() => setOpen(false)}
          className="flex flex-col items-stretch gap-1 border-t border-zinc-200 px-4 py-3 text-sm [&>a]:py-2.5 dark:border-zinc-800"
        >
          {children}
        </nav>
      )}
    </div>
  );
}
