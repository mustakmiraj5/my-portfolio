"use client";

/**
 * Query history, backed by localStorage.
 *
 * Exposed as an external store rather than component state: the list is
 * rendered into markup, so reading localStorage during the first render would
 * desync hydration. `useSyncExternalStore` returns an empty server snapshot
 * and the real list on the client, which is the supported way to do this — and
 * subscribing to the `storage` event keeps two open tabs in agreement.
 */

const KEY = "playground:history";
const MAX_ENTRIES = 50;

/**
 * Queries longer than this are not recorded at all. Truncating them would be
 * worse than dropping them: a shortened query that silently loses its tail
 * looks runnable but isn't.
 */
const MAX_SQL_CHARS = 4000;

export type HistoryEntry = {
  id: string;
  sql: string;
  datasetId: string;
  datasetName: string;
  ranAt: number;
  ok: boolean;
  rowCount: number | null;
  elapsedMs: number | null;
  error: string | null;
  /** Consecutive runs of the identical query, collapsed into one entry. */
  runs: number;
};

const EMPTY: HistoryEntry[] = [];

let cache: HistoryEntry[] | null = null;
const listeners = new Set<() => void>();

function read(): HistoryEntry[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function persist(next: HistoryEntry[]) {
  // localStorage is a shared, finite budget; on quota failure shed the oldest
  // entries and retry rather than losing the write entirely.
  let attempt = [...next];
  for (let i = 0; i < 5; i++) {
    try {
      localStorage.setItem(KEY, JSON.stringify(attempt));
      return attempt;
    } catch {
      attempt = attempt.slice(0, Math.floor(attempt.length / 2));
      if (attempt.length === 0) {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* nothing more we can do */
        }
        return attempt;
      }
    }
  }
  return attempt;
}

function write(next: HistoryEntry[]) {
  cache = persist(next);
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== KEY) return;
  cache = null;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getSnapshot(): HistoryEntry[] {
  return read();
}

export function getServerSnapshot(): HistoryEntry[] {
  return EMPTY;
}

export type RecordInput = Omit<HistoryEntry, "id" | "ranAt" | "runs">;

export function record(entry: RecordInput) {
  if (entry.sql.trim().length === 0) return;
  if (entry.sql.length > MAX_SQL_CHARS) return;

  const current = read();
  const newest = current[0];
  const now = Date.now();

  // Re-running the same statement shouldn't push everything else out.
  if (
    newest &&
    newest.sql === entry.sql &&
    newest.datasetId === entry.datasetId
  ) {
    const merged: HistoryEntry = {
      ...newest,
      ...entry,
      ranAt: now,
      runs: newest.runs + 1,
    };
    write([merged, ...current.slice(1)]);
    return;
  }

  const next: HistoryEntry = {
    ...entry,
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    ranAt: now,
    runs: 1,
  };
  write([next, ...current].slice(0, MAX_ENTRIES));
}

export function remove(id: string) {
  write(read().filter((entry) => entry.id !== id));
}

export function clear() {
  write([]);
}

/** Short relative time — "just now", "4m", "2h", "3d". */
export function timeAgo(ts: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - ts) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
