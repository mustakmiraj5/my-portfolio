"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useDatabase } from "@/lib/playground/use-database";
import type { QueryResult } from "@/lib/playground/use-database";
import type { AnalyzedPlan } from "@/lib/playground/plan";
import { isExplainable } from "@/lib/playground/plan";
import {
  DATASETS,
  DATASET_STORAGE_KEY,
  IMPORTED_DATASET_ID,
  MAX_IMPORT_BYTES,
  getDataset,
} from "@/lib/playground/datasets";
import SchemaSidebar from "./schema-sidebar";
import ResultsTable from "./results-table";
import PlanView from "./plan-view";
import HistoryPanel, { useHistory } from "./history-panel";
import { record as recordHistory } from "@/lib/playground/history";

// CodeMirror touches `document` on load, so keep it out of the server render.
const SqlEditor = dynamic(() => import("./sql-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] animate-pulse rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)]" />
  ),
});

const STORAGE_KEY = "playground:sql";

export default function Playground() {
  const {
    status,
    error: dbError,
    schema,
    datasetId,
    importName,
    run,
    explain,
    reset,
    loadDataset,
    importSql,
  } = useDatabase();

  const history = useHistory();
  const builtIn = DATASETS.find((d) => d.id === datasetId);
  const dataset = getDataset(datasetId);
  const isImported = datasetId === IMPORTED_DATASET_ID;

  // Lazy init rather than an effect: `sql` never reaches the server-rendered
  // markup (the editor is ssr:false), so reading storage here can't desync
  // hydration, and it avoids a cascading render on mount.
  const [sql, setSql] = useState(() => {
    const fallback = DATASETS[0].snippets[0].sql;
    if (typeof window === "undefined") return fallback;
    // Only restore the saved query if the dataset it was written against is
    // the one that will load. After an import — which cannot be re-seeded —
    // the stored id is invalid, so the query would hit missing tables.
    const storedDataset = localStorage.getItem(DATASET_STORAGE_KEY);
    if (!DATASETS.some((d) => d.id === storedDataset)) return fallback;
    return localStorage.getItem(STORAGE_KEY) ?? fallback;
  });
  const [result, setResult] = useState<QueryResult | null>(null);
  const [plan, setPlan] = useState<AnalyzedPlan | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [tab, setTab] = useState<"results" | "plan" | "history">("results");
  const [running, setRunning] = useState(false);

  const updateSql = useCallback((next: string) => {
    setSql(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  // Not manually memoized: the React Compiler infers `setTab` as a dependency,
  // which conflicts with an explicit list and makes it bail on the whole
  // component. Nothing depends on this function's identity, so let it infer.
  const execute = async () => {
    if (status !== "ready" || running) return;
    setRunning(true);
    setQueryError(null);

    const datasetName = builtIn?.name ?? importName ?? "Imported";
    const { result: next, error } = await run(sql);

    if (error) {
      recordHistory({
        sql,
        datasetId,
        datasetName,
        ok: false,
        rowCount: null,
        elapsedMs: null,
        error,
      });
      setQueryError(error);
      setResult(null);
      setPlan(null);
      setTab("results");
      setRunning(false);
      return;
    }

    recordHistory({
      sql,
      datasetId,
      datasetName,
      ok: true,
      rowCount: next?.rowCount ?? null,
      elapsedMs: next?.elapsedMs ?? null,
      error: null,
    });

    setResult(next ?? null);
    setTab("results");

    // Read-only statements get a plan for free; writes would run twice.
    if (isExplainable(sql)) {
      const { plan: analyzed } = await explain(sql);
      setPlan(analyzed ?? null);
    } else {
      setPlan(null);
    }

    setRunning(false);
  };

  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setQueryError(null);
      if (file.size > MAX_IMPORT_BYTES) {
        setQueryError(
          `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_IMPORT_BYTES / 1024 / 1024} MB, because the file is parsed on the main thread.`,
        );
        return;
      }

      setImporting(true);
      setResult(null);
      setPlan(null);
      try {
        const text = await file.text();
        const { error } = await importSql(text, file.name);
        if (error) {
          setQueryError(error);
        } else {
          // Imported state is not a real dataset id, so a reload starts fresh.
          // Only recorded on success — a failed import rolls back, leaving the
          // previous database and its saved query still valid.
          localStorage.setItem(DATASET_STORAGE_KEY, IMPORTED_DATASET_ID);
          updateSql(
            `-- Imported ${file.name}\n-- Pick a table from the schema on the left to get started.\n`,
          );
        }
      } catch (e) {
        setQueryError(e instanceof Error ? e.message : String(e));
      } finally {
        setImporting(false);
      }
    },
    [importSql, updateSql],
  );

  const switchDataset = useCallback(
    async (id: string) => {
      if (id === datasetId || status !== "ready") return;
      setResult(null);
      setPlan(null);
      setQueryError(null);
      localStorage.setItem(DATASET_STORAGE_KEY, id);
      updateSql(getDataset(id).snippets[0].sql);
      await loadDataset(id);
    },
    [datasetId, status, updateSql, loadDataset],
  );

  const busy = status === "booting" || status === "seeding";

  return (
    <div
      className="relative flex flex-col gap-6"
      onDragOver={(event) => {
        if (busy || importing) return;
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        // Ignore the events fired while crossing child elements.
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDrop={(event) => {
        if (busy || importing) return;
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-3xl border-2 border-dashed border-[color:var(--accent)] bg-[color:var(--bg)]/85">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
            Drop a .sql file to load it
          </p>
        </div>
      ) : null}
      <div className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Dataset
        </p>
        <div className="flex flex-wrap gap-2">
          {DATASETS.map((option) => {
            const active = option.id === datasetId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => switchDataset(option.id)}
                disabled={busy}
                aria-pressed={active}
                className={`flex items-baseline gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition duration-300 disabled:opacity-50 ${
                  active
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                    : "border-[color:var(--border)] bg-[color:var(--bg-elevated)] text-[color:var(--muted)] hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:text-[color:var(--text)]"
                }`}
              >
                {option.name}
                <span className="font-mono text-[10px] opacity-70">
                  {option.size}
                </span>
              </button>
            );
          })}
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-full border border-dashed px-4 py-2 text-xs font-semibold transition duration-300 ${
              busy || importing
                ? "cursor-not-allowed border-[color:var(--border)] text-[color:var(--muted)] opacity-50"
                : "border-[color:var(--border)] text-[color:var(--muted)] hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:text-[color:var(--text)]"
            }`}
          >
            {importing ? "Importing…" : "Import .sql"}
            <input
              ref={fileInput}
              type="file"
              accept=".sql,.txt,text/plain"
              className="sr-only"
              disabled={busy || importing}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="text-sm text-[color:var(--muted)]">
          {isImported
            ? `Loaded from ${importName ?? "your file"} — it stays in this browser tab and is never uploaded.`
            : dataset.tagline}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,280px)_1fr]">
        <div className="flex flex-col gap-4">
          {busy ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-4 text-sm text-[color:var(--muted)]">
              {status === "booting"
                ? "Starting Postgres…"
                : `Loading ${dataset.name.toLowerCase()}…`}
            </div>
          ) : (
            <SchemaSidebar
              schema={schema}
              onInsert={(text) =>
                updateSql(`${sql}${sql.endsWith(" ") ? "" : " "}${text}`)
              }
            />
          )}

          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)] transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:text-[color:var(--text)] disabled:opacity-50"
          >
            Reset database
          </button>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {(builtIn?.snippets ?? []).map((snippet) => (
              <button
                key={snippet.label}
                type="button"
                title={snippet.hint}
                onClick={() => updateSql(snippet.sql)}
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:text-[color:var(--text)]"
              >
                {snippet.label}
              </button>
            ))}
          </div>

          <SqlEditor
            value={sql}
            onChange={updateSql}
            onRun={execute}
            schema={schema}
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={execute}
              disabled={busy || running}
              className="rounded-full bg-[color:var(--btn-bg)] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--on-accent)] transition duration-300 hover:-translate-y-0.5 hover:bg-[color:var(--btn-bg-hover)] disabled:opacity-50"
            >
              {running ? "Running…" : "Run query"}
            </button>
            <span className="text-xs text-[color:var(--muted)]">
              <kbd className="font-mono">⌘</kbd>/
              <kbd className="font-mono">Ctrl</kbd> +{" "}
              <kbd className="font-mono">Enter</kbd>
            </span>
            {result ? (
              <span className="ml-auto font-mono text-xs text-[color:var(--muted)]">
                {result.rowCount.toLocaleString()}{" "}
                {result.rowCount === 1 ? "row" : "rows"} ·{" "}
                {result.elapsedMs.toFixed(1)} ms
              </span>
            ) : null}
          </div>

          {dbError ? (
            <p className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 font-mono text-sm text-red-600 dark:text-red-300">
              {dbError}
            </p>
          ) : null}

          <div className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)]">
            <div className="flex shrink-0 gap-1 border-b border-[color:var(--border)] p-1">
              {(["results", "plan", "history"] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                    tab === name
                      ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                      : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
                  }`}
                >
                  {name === "results"
                    ? "Results"
                    : name === "plan"
                      ? "Query plan"
                      : "History"}
                  {name === "plan" && plan?.warnings.length
                    ? ` (${plan.warnings.length})`
                    : ""}
                  {name === "history" && history.length
                    ? ` (${history.length})`
                    : ""}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {/* History stays reachable even when the last run failed. */}
              {tab === "history" ? (
                <HistoryPanel
                  currentDatasetId={datasetId}
                  onPick={(entry) => {
                    updateSql(entry.sql);
                    setTab("results");
                  }}
                />
              ) : queryError ? (
                <p className="p-4 font-mono text-sm whitespace-pre-wrap text-red-600 dark:text-red-300">
                  {queryError}
                </p>
              ) : tab === "results" ? (
                result ? (
                  <ResultsTable result={result} />
                ) : (
                  <p className="p-6 text-sm text-[color:var(--muted)]">
                    Run a query to see results.
                  </p>
                )
              ) : plan ? (
                <PlanView plan={plan} />
              ) : (
                <p className="p-6 text-sm text-[color:var(--muted)]">
                  Plans are captured for SELECT and WITH statements. Run one to
                  see where its time goes.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
