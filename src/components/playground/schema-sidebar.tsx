"use client";

import { useState } from "react";
import type { Table } from "@/lib/playground/use-database";

export default function SchemaSidebar({
  schema,
  onInsert,
}: {
  schema: Table[];
  onInsert: (text: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(schema[0]?.name ?? null);

  return (
    <aside className="flex flex-col gap-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
        Schema
      </p>
      {schema.map((table) => {
        const expanded = open === table.name;
        return (
          <div
            key={table.name}
            className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)]"
          >
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : table.name)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-[color:var(--accent-soft)]/40"
            >
              <span className="font-mono text-sm font-semibold text-[color:var(--text)]">
                {table.name}
              </span>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--muted)]">
                {table.rowEstimate === null
                  ? "not analyzed"
                  : `~${table.rowEstimate.toLocaleString()}`}
              </span>
            </button>

            {expanded ? (
              <div className="border-t border-[color:var(--border)] px-4 py-3">
                <ul className="grid gap-1.5">
                  {table.columns.map((col) => (
                    <li key={col.name}>
                      <button
                        type="button"
                        onClick={() => onInsert(col.name)}
                        title="Insert into editor"
                        className="flex w-full items-baseline gap-2 text-left font-mono text-xs transition-colors hover:text-[color:var(--accent)]"
                      >
                        <span className="text-[color:var(--text)]">{col.name}</span>
                        <span className="text-[color:var(--muted)]">{col.type}</span>
                        {col.isPrimaryKey ? (
                          <span className="rounded bg-[color:var(--accent-soft)] px-1 text-[9px] font-bold uppercase tracking-wide text-[color:var(--accent)]">
                            pk
                          </span>
                        ) : col.indexed ? (
                          <span className="rounded border border-[color:var(--border)] px-1 text-[9px] font-bold uppercase tracking-wide text-[color:var(--muted)]">
                            idx
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>

                {table.indexes.length > 0 ? (
                  <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--muted)]">
                      Indexes
                    </p>
                    <ul className="mt-1.5 grid gap-1">
                      {table.indexes.map((index) => (
                        <li
                          key={index.name}
                          title={index.definition}
                          className="truncate font-mono text-[11px] text-[color:var(--muted)]"
                        >
                          {index.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </aside>
  );
}
