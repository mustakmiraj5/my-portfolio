# Mustak Sahariar Miraj — Portfolio

Personal portfolio site built with Next.js, Tailwind CSS, and TypeScript. Features light/dark theme, scroll-reveal animations, dynamic blog posts from Medium, and a **Lab** section for self-contained experiments — currently the [SQL Playground](#sql-playground).

**Live site:** [mustakmiraj.vercel.app](https://mustakmiraj.vercel.app/)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript
- **Database (Lab):** PGlite — PostgreSQL compiled to WebAssembly, one code-split schema per dataset
- **Editor (Lab):** CodeMirror 6 with schema-aware SQL completion
- **Blog Feed:** Medium RSS via fast-xml-parser
- **Fonts:** Space Grotesk, JetBrains Mono

> **Build note:** the build is pinned to webpack (`next build --webpack`). Turbopack mangles PGlite's Emscripten glue, producing a bundle that compiles cleanly but fails at runtime with `instantiateWasm is not a function`. Keep the flag.

---

## SQL Playground

**[mustakmiraj.vercel.app/playground](https://mustakmiraj.vercel.app/playground)**

A real PostgreSQL instance compiled to WebAssembly, running entirely in the browser tab. No server, no connection string, no credentials — which also means no SSRF surface and nothing to take down.

Every dataset is **deliberately under-indexed**: only primary keys exist. A first query sequential-scans a large table, and adding the right index visibly flips the plan.

### Datasets

Six schemas, each fetched only when selected: every dataset is its own bundle chunk, so the initial page carries none of their SQL. Switching **recreates the Postgres instance** rather than re-seeding in place — see the memory note below.

| Dataset | Tables | Rows | Practises |
| --- | --- | --- | --- |
| E-commerce | 7 | ≈46k | Multi-table joins, revenue aggregation, anti-joins |
| Banking | 7 | ≈38k | Window functions, running balances, date bucketing |
| University | 8 | ≈41k | Many-to-many, weighted averages, `HAVING`, CTEs |
| Hospital | 9 | ≈42k | Four-deep relational chains, interval arithmetic |
| Movies | 9 | ≈45k | Composite-key bridge tables, `STRING_AGG`, index order |
| Transportation | 7 | ≈45k | Self-referencing joins, durations, leaderboards |

Every dataset is **deliberately under-indexed** beyond its primary keys and unique constraints, so a query filtering on a foreign key sequential-scans the largest table until you add the right index. Each ships six guided snippets following that arc, then schema-specific joins, aggregates and window functions. Data is generated with modulo arithmetic over `generate_series` rather than `random()`, so every visitor gets identical rows and identical plans — a snippet hint can promise a specific plan and be right. Seeding takes 0.25–0.6s per dataset.

**Movies teaches something the others can't.** `movie_cast` is keyed `(movie_id, actor_id)`, so filtering by `movie_id` uses that index while filtering by `actor_id` cannot — the leading-column rule. The column looks indexed and isn't, which is a common cause of slow queries in the wild.

### Two details that would otherwise bite

**`SERIAL` sequences are re-synced after every load.** Seeds insert explicit ids so foreign keys stay deterministic, which leaves each sequence at 1 — so a reader's first `INSERT INTO customers (name, email) VALUES (…)` would fail on a duplicate primary key. A `setval` pass over every serial column runs after seeding *and* after importing, since dumps carry the same problem. Verified: inserts land at 3001 on a 3,000-row table.

**Switching datasets recreates the database.** PGlite's WebAssembly memory only ever grows: `DROP SCHEMA` returns pages to Postgres, never to the browser. Re-seeding in place, the tab climbed from ~1.0 GB to ~1.3 GB over four cycles of all six datasets against a ~4.2 GB ceiling, never plateauing. Discarding the instance instead keeps usage oscillating rather than climbing, at the cost of a ~300 ms boot per switch.

### Importing your own schema

**Import .sql** (or drag a file onto the page) replaces the database with the contents of a `.sql` file. The file is read with the File API and executed against the local instance — it is never uploaded, because there is no server to upload it to.

- Imports are **atomic**: PGlite runs a multi-statement script in one transaction, so a file that fails partway rolls back the `DROP SCHEMA` too and leaves your previous database untouched
- The schema browser and autocomplete pick up imported tables immediately
- `SERIAL` sequences are re-synced afterwards, so inserting without an id works on an imported dump too
- 10 MB limit, since the file is parsed on the main thread
- Imported state is not persisted — a reload returns to a built-in dataset, and the saved query is discarded rather than run against a schema that no longer exists
- `pg_dump` files using `COPY ... FROM stdin` are rejected with a pointer to `pg_dump --inserts`. That block is psql's wire protocol, not SQL, so no engine can execute it from a script

### Current features

**Schema browser**
- Live introspection from `information_schema` and `pg_indexes` — not a hardcoded schema
- Columns annotated with type, `pk`, and `indexed` markers
- Approximate row counts from `pg_class.reltuples`, the same figure the planner uses
- **Several tables open at once**, with expand-all / collapse-all — these schemas run to nine tables, and comparing two of them shouldn't mean collapsing one
- Refreshes automatically after any DDL, and after switching dataset

**SQL editor**
- CodeMirror 6 with PostgreSQL syntax highlighting, light/dark aware
- **Schema-aware autocomplete** — table names suggested with row counts, columns with type and index status
- **Alias resolution** — `FROM reservations r` makes `r.` complete that table's columns. Resolution scans the whole document, so it works when the alias is typed *before* its `FROM` clause exists (lang-sql alone only scans backwards from the cursor)
- Multi-statement execution, `⌘`/`Ctrl` + `Enter` to run
- Last query persisted to local storage, scoped to the dataset it was written against

**Query history**
- Every run is recorded — successes with row count and timing, failures marked as such
- Click an entry to load it back into the editor; entries from another dataset carry its name as a badge, since they would not run as-is
- Consecutive re-runs of the same statement collapse into one entry with a `×n` counter, so hammering a query doesn't flush the list
- Kept in local storage (50 entries), survives reloads, and stays in sync across open tabs via the `storage` event
- Backed by `useSyncExternalStore` rather than component state: the list is rendered into markup, so reading local storage during the first render would desync hydration
- Queries over 4,000 characters are skipped rather than truncated — a shortened query looks runnable but isn't

**Query performance analysis**
- `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` captured automatically for every `SELECT` / `WITH`
- Plan rendered as a tree with per-node self-time and a bar for its share of total runtime
- Planning time, execution time, and node count surfaced separately
- Warnings derived from the plan:
  - Sequential scans discarding most of what they read
  - Planner row estimates off by 10× or more
  - Sorts spilling to disk (external merge)
  - Nested loops re-running their inner side thousands of times — the plan shape of an N+1
  - Single nodes accounting for the majority of runtime

**Correctness details worth knowing**
- `EXPLAIN ANALYZE` executes its statement, so plans are captured for read-only statements only — running it on writes would apply them twice
- Row estimates are compared **per loop**, since Postgres reports `Plan Rows` per loop but actual rows are averaged across them
- Nodes beneath a `LIMIT` are excluded from mis-estimate warnings: a top-N sort stops early, so its actual row count is truncated and comparing it to the estimate reports a problem that isn't there

### Known limitations

- **Postgres, not MySQL.** No mature MySQL-in-WASM equivalent exists.
- **Runs on the main thread.** Seeding briefly blocks the UI.
- **Ephemeral.** The database lives in the tab; reloading re-seeds the dataset you were last on.
- `SELECT u.` with no `FROM` clause anywhere cannot resolve — nothing yet defines `u`.

### Planned

- [ ] Move PGlite into a Web Worker so seeding and long queries stop blocking the UI
- [ ] Persist to IndexedDB so work survives a reload
- [ ] Side-by-side plan diffing — before and after an index, on one screen
- [ ] Shareable permalinks for a query and its plan
- [ ] Index advisor: suggest the specific `CREATE INDEX` for a flagged scan
- [ ] `work_mem` and cost-parameter controls to make planner behaviour tunable
- [ ] More datasets — add a module under `lib/playground/datasets/` and one manifest entry
- [ ] Export the current database back out as a `.sql` file
- [ ] Pin favourite queries so they survive the 50-entry cap
- [ ] Support `COPY ... FROM stdin` blocks so plain `pg_dump` output loads directly

---

## Project Structure

```
src/
├── app/
│   ├── globals.css            # Theme tokens, base layer, scroll-reveal rules
│   ├── layout.tsx             # Root layout, fonts, SEO + Open Graph metadata
│   ├── opengraph-image.tsx    # Generated 1200×630 social card
│   ├── page.tsx               # Home page composing all sections
│   ├── robots.ts              # robots.txt
│   ├── sitemap.ts             # sitemap.xml
│   └── playground/
│       └── page.tsx           # SQL Playground route
├── components/
│   ├── header.tsx             # Sticky nav: scroll progress, active section, theme toggle
│   ├── hero.tsx               # Hero section with CTAs
│   ├── about.tsx              # About section
│   ├── experience.tsx         # Work experience
│   ├── projects.tsx           # Professional projects
│   ├── lab.tsx                # Lab section — self-contained experiments
│   ├── skills.tsx             # Skills grid
│   ├── blogs.tsx              # Medium blog posts
│   ├── education.tsx          # Achievements and education
│   ├── contact.tsx            # Contact section
│   ├── footer.tsx             # Footer with social links
│   ├── scroll-reveal.tsx      # IntersectionObserver driving [data-reveal]
│   ├── theme-toggle.tsx       # Light/dark theme switcher
│   └── playground/
│       ├── playground.tsx     # Playground composition and run loop
│       ├── sql-editor.tsx     # CodeMirror + schema-aware completion
│       ├── schema-sidebar.tsx # Introspected tables, columns, indexes
│       ├── results-table.tsx  # Result grid
│       ├── history-panel.tsx  # Query history list
│       └── plan-view.tsx      # Plan tree and warnings
└── lib/
    ├── medium.ts              # Medium RSS feed fetching
    ├── reveal.ts              # Scroll-reveal stagger helper
    ├── site.ts                # Shared site constants (URL, name, role)
    ├── social-links.tsx       # Shared social link icons
    └── playground/
        ├── use-database.ts    # PGlite lifecycle, introspection, query + explain
        ├── plan.ts            # EXPLAIN JSON parsing and warning heuristics
        ├── history.ts         # localStorage-backed query history store
        └── datasets/
            ├── index.ts       # Manifest, lazy loader, reset + sequence SQL
            ├── types.ts       # Dataset and snippet types
            └── *.ts           # One module per dataset, code-split
```
