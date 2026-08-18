import type { DatasetMeta, DatasetModule } from "./types";

export type { DatasetMeta, DatasetModule, Snippet } from "./types";

/**
 * Dataset metadata, always in the bundle so the picker can render immediately.
 * The schemas and seed data live in one module per dataset and are fetched on
 * selection — see `loadDataset` below.
 *
 * Every dataset is deliberately under-indexed beyond its primary keys and
 * unique constraints, so a query filtering on a foreign key sequential-scans
 * the largest table until the reader adds the right index. Row counts are kept
 * near 40k: large enough that the planner's choice is measurable, small enough
 * that switching datasets repeatedly cannot exhaust the tab.
 */
export const DATASET_MANIFEST: DatasetMeta[] = [
  {
    id: "ecommerce",
    name: "E-commerce",
    tagline:
      "Customers, orders, line items, payments and reviews — joins, aggregation and anti-joins.",
    tables: 7,
    size: "≈46k rows",
    starterSql: "SELECT * FROM customers LIMIT 20;",
  },
  {
    id: "banking",
    name: "Banking",
    tagline:
      "Accounts, a 25k-row ledger, loans and cards — window functions and date bucketing.",
    tables: 7,
    size: "≈38k rows",
    starterSql: "SELECT * FROM accounts LIMIT 20;",
  },
  {
    id: "university",
    name: "University",
    tagline:
      "Students, sections, enrolments and attendance — many-to-many, grades and HAVING.",
    tables: 8,
    size: "≈41k rows",
    starterSql: "SELECT * FROM students LIMIT 20;",
  },
  {
    id: "hospital",
    name: "Hospital",
    tagline:
      "Doctors, appointments, diagnoses, prescriptions and admissions — deep relational chains.",
    tables: 9,
    size: "≈42k rows",
    starterSql: "SELECT * FROM patients LIMIT 20;",
  },
  {
    id: "movies",
    name: "Movies",
    tagline:
      "Cast, crew and reviews across composite-key join tables — many-to-many and index order.",
    tables: 9,
    size: "≈45k rows",
    starterSql: "SELECT * FROM movies LIMIT 20;",
  },
  {
    id: "transportation",
    name: "Transportation",
    tagline:
      "Ride hailing: drivers, vehicles, rides, fares and reviews — durations and leaderboards.",
    tables: 7,
    size: "≈45k rows",
    starterSql: "SELECT * FROM rides LIMIT 20;",
  },
];

export const DEFAULT_DATASET_ID = DATASET_MANIFEST[0].id;

/** Persisted so a restored query is never run against a different schema. */
export const DATASET_STORAGE_KEY = "playground:dataset";

/**
 * Marks the database as loaded from a user's file rather than a built-in
 * dataset. Deliberately not a manifest id, so the stored-id check rejects it
 * on reload — an imported file cannot be re-seeded from scratch.
 */
export const IMPORTED_DATASET_ID = "imported";

/** Parsed in the main thread, so a runaway file would freeze the tab. */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

/**
 * Static import expressions, so each dataset is emitted as its own chunk and
 * only travels over the network once the reader asks for it.
 */
const loaders: Record<string, () => Promise<{ default: DatasetModule }>> = {
  ecommerce: () => import("./ecommerce"),
  banking: () => import("./banking"),
  university: () => import("./university"),
  hospital: () => import("./hospital"),
  movies: () => import("./movies"),
  transportation: () => import("./transportation"),
};

export function getMeta(id: string): DatasetMeta {
  return DATASET_MANIFEST.find((d) => d.id === id) ?? DATASET_MANIFEST[0];
}

export function isBuiltIn(id: string): boolean {
  return DATASET_MANIFEST.some((d) => d.id === id);
}

export async function loadDataset(id: string): Promise<DatasetModule> {
  const load = loaders[id] ?? loaders[DEFAULT_DATASET_ID];
  return (await load()).default;
}

/**
 * Wipes everything — including tables the user created — so switching datasets
 * never leaves the previous schema behind.
 */
export const RESET_SQL = `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`;

/**
 * Seeds insert explicit ids so foreign keys are deterministic, which leaves
 * every SERIAL sequence sitting at 1. Without this, the first
 * `INSERT INTO customers (name, email) VALUES (…)` a reader tries fails on a
 * duplicate primary key — a baffling error in a tool built for practising SQL.
 *
 * Applied after seeding a built-in dataset and after importing a file, since
 * dumps carry the same problem.
 */
export const SYNC_SEQUENCES_SQL = `
DO $$
DECLARE
  r record;
  mx bigint;
BEGIN
  FOR r IN
    SELECT c.table_name,
           c.column_name,
           pg_get_serial_sequence(format('%I.%I', 'public', c.table_name), c.column_name) AS seq
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND pg_get_serial_sequence(format('%I.%I', 'public', c.table_name), c.column_name) IS NOT NULL
  LOOP
    EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.column_name, r.table_name) INTO mx;
    PERFORM setval(r.seq, GREATEST(mx, 1));
  END LOOP;
END $$;
`;

/**
 * `pg_dump` writes table data as `COPY ... FROM stdin` followed by a raw data
 * block terminated by `\\.` — a psql wire-protocol construct, not SQL, so no
 * SQL engine can execute it from a script. Worth catching by name, because the
 * raw error ("syntax error at or near ...") points nowhere useful.
 */
export function findUnsupportedCopy(sql: string): boolean {
  return /^\s*COPY\s+[^;]*\bFROM\s+stdin\b/im.test(sql);
}
