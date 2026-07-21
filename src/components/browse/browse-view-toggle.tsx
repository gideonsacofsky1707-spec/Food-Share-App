"use client";

import { useState, type ReactNode } from "react";

// listView/mapView are pre-rendered by the (server component) caller and
// just get slotted in here - this component only owns which one is
// visible, so the list itself never needs to be a client component.
export function BrowseViewToggle({
  listView,
  mapView,
}: {
  listView: ReactNode;
  mapView: ReactNode;
}) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex self-start rounded-full border border-zinc-300 p-1 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setView("list")}
          aria-pressed={view === "list"}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "list"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setView("map")}
          aria-pressed={view === "map"}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "map"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Map
        </button>
      </div>

      {view === "list" ? listView : mapView}
    </div>
  );
}
