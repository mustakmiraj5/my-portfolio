"use client";

import type { QueryResult } from "@/lib/playground/use-database";

const MAX_ROWS = 200;

function render(value: unknown) {
  if (value === null || value === undefined) {
    return <span className="italic text-[color:var(--muted)]">NULL</span>;
  }
  if (value instanceof Date)
    return value.toISOString().replace("T", " ").slice(0, 19);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function ResultsTable({ result }: { result: QueryResult }) {
  if (result.columns.length === 0) {
    return (
      <p className="p-6 font-mono text-sm text-[color:var(--muted)]">
        {result.notice ?? "Statement completed."}
      </p>
    );
  }

  const shown = result.rows.slice(0, MAX_ROWS);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead className="sticky top-0 z-10 bg-[color:var(--bg-elevated)]">
            <tr>
              {result.columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap border-b border-[color:var(--border)] px-3 py-2 font-semibold uppercase tracking-wider text-[color:var(--muted)]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} className="hover:bg-[color:var(--accent-soft)]/30">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="whitespace-nowrap border-b border-[color:var(--border)] px-3 py-1.5 text-[color:var(--text)]"
                  >
                    {render(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.rows.length > MAX_ROWS ? (
        <p className="border-t border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--muted)]">
          Showing first {MAX_ROWS} of {result.rows.length.toLocaleString()}{" "}
          rows.
        </p>
      ) : null}
    </div>
  );
}
