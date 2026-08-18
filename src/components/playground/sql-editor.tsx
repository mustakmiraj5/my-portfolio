"use client";

import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import type { Table } from "@/lib/playground/use-database";

/**
 * Feeds the live introspected schema to CodeMirror's SQL completion source.
 * Handing it the `{ self, children }` shape means table suggestions can carry
 * their row count and columns can carry their type and index status — and
 * lang-sql resolves aliases itself, so `FROM reservations r` makes `r.`
 * complete that table's columns.
 */
/**
 * Aliases lang-sql cannot see yet.
 *
 * Its own resolver scans backwards from the cursor, so typing left to right —
 * `SELECT r.` before the `FROM reservations r` exists — resolves nothing. This
 * scans the whole document instead and registers each alias as a first-class
 * completion target, making column completion position-independent.
 */
const ALIAS_PATTERN =
  /\b(?:from|join|update|into)\s+"?([a-z_][\w$]*)"?\s+(?:as\s+)?"?([a-z_][\w$]*)"?/gi;

// Words that follow a table name but are clauses, not aliases.
const NOT_ALIASES = new Set([
  "where",
  "on",
  "using",
  "group",
  "order",
  "limit",
  "offset",
  "having",
  "join",
  "inner",
  "left",
  "right",
  "full",
  "cross",
  "lateral",
  "natural",
  "union",
  "except",
  "intersect",
  "window",
  "returning",
  "set",
  "values",
  "for",
  "fetch",
  "as",
  "and",
  "or",
  "select",
  "from",
  "with",
  "tablesample",
]);

function extractAliases(doc: string, tables: Table[]): Record<string, string> {
  const known = new Map(tables.map((t) => [t.name.toLowerCase(), t.name]));
  const found: Record<string, string> = {};

  for (const match of doc.matchAll(ALIAS_PATTERN)) {
    const table = known.get(match[1].toLowerCase());
    const alias = match[2];
    if (!table || NOT_ALIASES.has(alias.toLowerCase())) continue;
    found[alias] = table;
  }

  return found;
}

function columnsOf(table: Table) {
  return table.columns.map((column) => ({
    label: column.name,
    type: "property",
    detail: [
      column.type,
      column.isPrimaryKey ? "pk" : column.indexed ? "indexed" : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }));
}

function toNamespace(tables: Table[], aliases: Record<string, string>) {
  const byName = new Map(tables.map((t) => [t.name, t]));

  const entries = tables.map((table) => [
    table.name,
    {
      self: {
        label: table.name,
        type: "type",
        detail:
          table.rowEstimate === null
            ? "table"
            : `~${table.rowEstimate.toLocaleString()} rows`,
      },
      children: columnsOf(table),
    },
  ]);

  const aliasEntries = Object.entries(aliases).flatMap(([alias, tableName]) => {
    const table = byName.get(tableName);
    if (!table || byName.has(alias)) return [];
    return [
      [
        alias,
        {
          self: { label: alias, type: "type", detail: `alias of ${tableName}` },
          children: columnsOf(table),
        },
      ],
    ];
  });

  return Object.fromEntries([...entries, ...aliasEntries]);
}

/** Tracks the portfolio's theme class so the editor matches the page. */
function useIsDark() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export default function SqlEditor({
  value,
  onChange,
  onRun,
  schema,
}: {
  value: string;
  onChange: (next: string) => void;
  onRun: () => void;
  schema: Table[];
}) {
  const isDark = useIsDark();

  const aliases = extractAliases(value, schema);

  // Rebuild only when the schema or the alias set changes — the regex runs per
  // render, but the extension is only reconfigured when its result differs.
  const signature = schema
    .map(
      (t) =>
        `${t.name}:${t.columns.map((c) => `${c.name}/${c.isPrimaryKey ? "p" : c.indexed ? "i" : ""}`).join(",")}`,
    )
    .join("|");
  const aliasSignature = Object.entries(aliases)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([alias, table]) => `${alias}=${table}`)
    .join(",");

  const extensions = useMemo(
    () => [
      sql({
        dialect: PostgreSQL,
        schema: toNamespace(schema, aliases),
        upperCaseKeywords: true,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, aliasSignature],
  );

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[color:var(--border)]"
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          onRun();
        }
      }}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={isDark ? "dark" : "light"}
        height="220px"
        extensions={extensions}
        basicSetup={{
          foldGutter: false,
          autocompletion: true,
          highlightActiveLine: false,
        }}
      />
    </div>
  );
}
