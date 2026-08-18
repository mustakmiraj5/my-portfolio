"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PGlite } from "@electric-sql/pglite";
import {
  DATASETS,
  DATASET_STORAGE_KEY,
  DEFAULT_DATASET_ID,
  IMPORTED_DATASET_ID,
  RESET_SQL,
  findUnsupportedCopy,
  getDataset,
} from "./datasets";
import {
  analyzeExplain,
  isExplainable,
  type AnalyzedPlan,
  type ExplainResult,
} from "./plan";

export type Column = {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  indexed: boolean;
};

export type Table = {
  name: string;
  columns: Column[];
  indexes: { name: string; definition: string }[];
  /** null when the table has never been ANALYZEd (Postgres reports -1). */
  rowEstimate: number | null;
};

export type QueryResult = {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  /** Wall-clock time for the round trip, in ms. */
  elapsedMs: number;
  statements: number;
  notice: string | null;
};

export type DbStatus = "booting" | "seeding" | "ready" | "error";

const COLUMN_SQL = `
  SELECT c.table_name, c.column_name, c.data_type, c.is_nullable
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_name = c.table_name AND t.table_schema = c.table_schema
  WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  ORDER BY c.table_name, c.ordinal_position
`;

const INDEX_SQL = `
  SELECT tablename, indexname, indexdef
  FROM pg_indexes WHERE schemaname = 'public'
  ORDER BY tablename, indexname
`;

const PK_SQL = `
  SELECT tc.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
`;

const ROWCOUNT_SQL = `
  SELECT c.relname, c.reltuples::bigint AS estimate
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
`;

export function useDatabase() {
  const dbRef = useRef<PGlite | null>(null);
  const [status, setStatus] = useState<DbStatus>("booting");
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<Table[]>([]);
  const [datasetId, setDatasetId] = useState<string>(DEFAULT_DATASET_ID);
  const [importName, setImportName] = useState<string | null>(null);

  const readSchema = useCallback(async (db: PGlite): Promise<Table[]> => {
    const [cols, idx, pks, counts] = await Promise.all([
      db.query<{
        table_name: string;
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>(COLUMN_SQL),
      db.query<{ tablename: string; indexname: string; indexdef: string }>(
        INDEX_SQL,
      ),
      db.query<{ table_name: string; column_name: string }>(PK_SQL),
      db.query<{ relname: string; estimate: number }>(ROWCOUNT_SQL),
    ]);

    const pkSet = new Set(
      pks.rows.map((r) => `${r.table_name}.${r.column_name}`),
    );
    const rowCounts = new Map(
      counts.rows.map((r) => {
        const n = Number(r.estimate);
        return [r.relname, n < 0 ? null : n] as const;
      }),
    );

    // A column counts as indexed if any index definition mentions it.
    const indexedColumns = new Set<string>();
    for (const row of idx.rows) {
      const inside = row.indexdef.slice(
        row.indexdef.indexOf("(") + 1,
        row.indexdef.lastIndexOf(")"),
      );
      for (const part of inside.split(",")) {
        indexedColumns.add(
          `${row.tablename}.${part.trim().split(" ")[0].replace(/"/g, "")}`,
        );
      }
    }

    const tables = new Map<string, Table>();
    for (const row of cols.rows) {
      if (!tables.has(row.table_name)) {
        tables.set(row.table_name, {
          name: row.table_name,
          columns: [],
          indexes: [],
          rowEstimate: rowCounts.get(row.table_name) ?? null,
        });
      }
      const key = `${row.table_name}.${row.column_name}`;
      tables.get(row.table_name)!.columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === "YES",
        isPrimaryKey: pkSet.has(key),
        indexed: indexedColumns.has(key),
      });
    }
    for (const row of idx.rows) {
      tables.get(row.tablename)?.indexes.push({
        name: row.indexname,
        definition: row.indexdef,
      });
    }

    return [...tables.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const seed = useCallback(
    async (db: PGlite, id: string) => {
      setDatasetId(id);
      setStatus("seeding");
      // RESET_SQL drops the whole public schema, so switching datasets also
      // clears any tables the user created. ANALYZE last, or the planner has
      // no statistics and every estimate is a guess.
      await db.exec(`${RESET_SQL}\n${getDataset(id).sql}\nANALYZE;`);
      setImportName(null);
      setSchema(await readSchema(db));
      setStatus("ready");
    },
    [readSchema],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // In-memory rather than IndexedDB: seeding 120k rows is far faster,
        // and timings stay comparable between runs.
        const { PGlite: Client } = await import("@electric-sql/pglite");
        const db = await Client.create();
        if (cancelled) {
          await db.close();
          return;
        }
        dbRef.current = db;

        const stored = localStorage.getItem(DATASET_STORAGE_KEY);
        const initial =
          stored && DATASETS.some((d) => d.id === stored)
            ? stored
            : DEFAULT_DATASET_ID;
        await seed(db, initial);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seed]);

  const run = useCallback(
    async (sql: string): Promise<{ result?: QueryResult; error?: string }> => {
      const db = dbRef.current;
      if (!db) return { error: "Database is still starting up." };

      const started = performance.now();
      try {
        const results = await db.exec(sql);
        const elapsedMs = performance.now() - started;

        // Report the last statement that returned a shape worth showing.
        const last =
          [...results].reverse().find((r) => r.fields.length > 0) ??
          results.at(-1);
        const affected = results.reduce(
          (sum, r) => sum + (r.affectedRows ?? 0),
          0,
        );

        setSchema(await readSchema(db));

        return {
          result: {
            columns: last?.fields.map((f) => f.name) ?? [],
            rows: (last?.rows ?? []).map((row) =>
              (last?.fields ?? []).map(
                (f) => (row as Record<string, unknown>)[f.name],
              ),
            ),
            rowCount: last?.rows.length ?? 0,
            elapsedMs,
            statements: results.length,
            notice:
              last && last.fields.length === 0
                ? `${affected} row${affected === 1 ? "" : "s"} affected`
                : null,
          },
        };
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    },
    [readSchema],
  );

  const explain = useCallback(
    async (sql: string): Promise<{ plan?: AnalyzedPlan; error?: string }> => {
      const db = dbRef.current;
      if (!db) return { error: "Database is still starting up." };
      if (!isExplainable(sql)) {
        return {
          error:
            "Only a single SELECT or WITH statement can be analyzed — EXPLAIN ANALYZE executes the statement, so running it on writes would apply them twice.",
        };
      }

      const body = sql.trim().replace(/;\s*$/, "");
      try {
        const res = await db.query<Record<string, unknown>>(
          `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${body}`,
        );
        const raw = res.rows[0]?.["QUERY PLAN"];
        const parsed = (
          typeof raw === "string" ? JSON.parse(raw) : raw
        ) as ExplainResult[];
        if (!parsed?.[0]?.Plan)
          return { error: "Could not read the query plan." };
        return { plan: analyzeExplain(parsed[0]) };
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    },
    [],
  );

  /** Re-seed the current dataset, discarding any changes. */
  const reset = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    // An imported file cannot be re-seeded — fall back to the default dataset.
    await seed(
      db,
      datasetId === IMPORTED_DATASET_ID ? DEFAULT_DATASET_ID : datasetId,
    );
  }, [seed, datasetId]);

  /** Swap to a different practice dataset. */
  const loadDataset = useCallback(
    async (id: string) => {
      const db = dbRef.current;
      if (!db) return;
      await seed(db, id);
    },
    [seed],
  );

  /**
   * Replace the database with the contents of a user-supplied .sql file.
   * The file is read in the browser and executed against the local instance —
   * it is never uploaded anywhere.
   */
  const importSql = useCallback(
    async (sql: string, fileName: string): Promise<{ error?: string }> => {
      const db = dbRef.current;
      if (!db) return { error: "Database is still starting up." };

      if (!sql.trim()) return { error: "That file is empty." };
      if (findUnsupportedCopy(sql)) {
        return {
          error:
            "This file uses `COPY ... FROM stdin`, which is psql's wire protocol rather than SQL — no engine can run it from a script. Re-export with `pg_dump --inserts` (or `--column-inserts`) and try again.",
        };
      }

      const previousId = datasetId;
      const previousName = importName;

      setDatasetId(IMPORTED_DATASET_ID);
      setImportName(fileName);
      setStatus("seeding");

      try {
        await db.exec(`${RESET_SQL}\n${sql}\nANALYZE;`);
        setSchema(await readSchema(db));
        setStatus("ready");
        return {};
      } catch (e) {
        // PGlite runs a multi-statement script in one transaction, so a failure
        // anywhere rolls back the DROP SCHEMA too — the database the user had
        // before the import is still intact. Restore the labels to match.
        setDatasetId(previousId);
        setImportName(previousName);
        setSchema(await readSchema(db).catch(() => []));
        setStatus("ready");
        return { error: e instanceof Error ? e.message : String(e) };
      }
    },
    [readSchema, datasetId, importName],
  );

  return {
    status,
    error,
    schema,
    datasetId,
    importName,
    run,
    explain,
    reset,
    loadDataset,
    importSql,
  };
}
