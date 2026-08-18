"use client";

import { useSyncExternalStore } from "react";
import {
  clear,
  getServerSnapshot,
  getSnapshot,
  remove,
  subscribe,
  timeAgo,
  type HistoryEntry,
} from "@/lib/playground/history";

function preview(sql: string) {
  const lines = sql
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("--"));
  return lines.slice(0, 2).join(" ").slice(0, 120) || sql.trim().slice(0, 120);
}

export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function HistoryPanel({
  currentDatasetId,
  onPick,
}: {
  currentDatasetId: string;
  onPick: (entry: HistoryEntry) => void;
}) {
  const entries = useHistory();

  if (entries.length === 0) {
    return (
      <p className="p-6 text-sm text-[color:var(--muted)]">
        Queries you run are kept here, in this browser only.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-[color:var(--border)] px-4 py-2">
        <p className="text-xs text-[color:var(--muted)]">
          {entries.length} {entries.length === 1 ? "query" : "queries"}
        </p>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--muted)] transition-colors hover:text-[color:var(--accent)]"
        >
          Clear
        </button>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-[color:var(--border)] overflow-auto">
        {entries.map((entry) => {
          const foreign = entry.datasetId !== currentDatasetId;
          return (
            <li
              key={entry.id}
              className="group flex items-start gap-3 px-4 py-3"
            >
              <button
                type="button"
                onClick={() => onPick(entry)}
                className="min-w-0 flex-1 text-left"
                title={entry.sql}
              >
                <p className="truncate font-mono text-xs text-[color:var(--text)]">
                  {preview(entry.sql)}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[color:var(--muted)]">
                  <span>{timeAgo(entry.ranAt)}</span>
                  {entry.runs > 1 ? <span>×{entry.runs}</span> : null}
                  {entry.ok ? (
                    <span>
                      {entry.rowCount !== null
                        ? `${entry.rowCount.toLocaleString()} ${entry.rowCount === 1 ? "row" : "rows"}`
                        : "ok"}
                      {entry.elapsedMs !== null
                        ? ` · ${entry.elapsedMs.toFixed(1)} ms`
                        : ""}
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-300">
                      failed
                    </span>
                  )}
                  {/* Loading a query written for another schema would just error. */}
                  {foreign ? (
                    <span className="rounded border border-[color:var(--border)] px-1.5 py-0.5 uppercase tracking-wide">
                      {entry.datasetName}
                    </span>
                  ) : null}
                </p>
              </button>
              <button
                type="button"
                onClick={() => remove(entry.id)}
                aria-label="Remove from history"
                className="shrink-0 rounded-full px-2 py-1 text-xs text-[color:var(--muted)] opacity-0 transition hover:text-[color:var(--accent)] focus-visible:opacity-100 group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
