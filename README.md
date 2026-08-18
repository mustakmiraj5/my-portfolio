# Mustak Sahariar Miraj — Portfolio

Personal portfolio site built with Next.js, Tailwind CSS, and TypeScript. Features light/dark theme, scroll-reveal animations, dynamic blog posts from Medium, and a **Lab** section for self-contained experiments — currently the [SQL Playground](#sql-playground).

**Live site:** [mustakmiraj.vercel.app](https://mustakmiraj.vercel.app/)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript
- **Database (Lab):** PGlite — PostgreSQL compiled to WebAssembly
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

Switching drops the whole `public` schema and re-seeds, so datasets never bleed into each other — and any tables you created are cleared too. The selection is persisted, so a reload returns you to the dataset your saved query belongs to.

| Dataset | Tables | Rows | Practises |
| --- | --- | --- | --- |
| Golf ticket reservations | `courses`, `players`, `ticket_types`, `tickets`, `reservations`, `payments` | ≈260k | Nullable FKs, redemption funnels, `NOT EXISTS` |
| E-commerce orders | `categories`, `customers`, `products`, `orders`, `order_items`, `shipments` | ≈201k | Multi-table joins, category self-join, date lag |
| Banking transactions | `branches`, `customers`, `accounts`, `transactions`, `transfers` | ≈204k | Window functions, double-join on one table |
| Employee directory | `departments`, `employees`, `salaries`, `projects`, `project_assignments` | ≈175k | Self-joins, many-to-many allocation, salary history |
| Web analytics | `visitors`, `sessions`, `page_views`, `events` | ≈302k | Time bucketing, funnels, correlated `EXISTS` |

Each ships six guided snippets that walk the same arc: a slow query → the index that fixes it → progressively harder joins and aggregates. Data is generated with modulo arithmetic over `generate_series` rather than `random()`, so every visitor gets identical rows and identical plans. Seeding takes 1.1–2.3s per dataset.

Several tables carry deliberate teaching shapes: `reservations.ticket_id` is nullable so `LEFT JOIN` and anti-joins have a real target, `transfers` holds two foreign keys into `accounts` so both sides must be joined separately, `categories.parent_id` is self-referential, and `project_assignments` is a genuine many-to-many.

### Current features

**Schema browser**
- Live introspection from `information_schema` and `pg_indexes` — not a hardcoded schema
- Columns annotated with type, `pk`, and `indexed` markers
- Approximate row counts from `pg_class.reltuples`, the same figure the planner uses
- Refreshes automatically after any DDL, and after switching dataset

**SQL editor**
- CodeMirror 6 with PostgreSQL syntax highlighting, light/dark aware
- **Schema-aware autocomplete** — table names suggested with row counts, columns with type and index status
- **Alias resolution** — `FROM reservations r` makes `r.` complete that table's columns. Resolution scans the whole document, so it works when the alias is typed *before* its `FROM` clause exists (lang-sql alone only scans backwards from the cursor)
- Multi-statement execution, `⌘`/`Ctrl` + `Enter` to run
- Last query persisted to local storage

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
- [ ] More datasets — the list in `lib/playground/datasets.ts` is the only place to edit

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
│       └── plan-view.tsx      # Plan tree and warnings
└── lib/
    ├── medium.ts              # Medium RSS feed fetching
    ├── reveal.ts              # Scroll-reveal stagger helper
    ├── site.ts                # Shared site constants (URL, name, role)
    ├── social-links.tsx       # Shared social link icons
    └── playground/
        ├── use-database.ts    # PGlite lifecycle, introspection, query + explain
        ├── plan.ts            # EXPLAIN JSON parsing and warning heuristics
        └── datasets.ts        # The five practice datasets and their snippets
```
