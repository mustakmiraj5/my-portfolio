import type { Metadata } from "next";
import Link from "next/link";
import Playground from "@/components/playground/playground";

export const metadata: Metadata = {
  title: "SQL Playground | Mustak Sahariar Miraj",
  description:
    "A real Postgres running in your browser via WebAssembly. Explore the schema, run raw SQL, and read the EXPLAIN ANALYZE plan to see exactly where a query spends its time.",
  alternates: { canonical: "/playground" },
};

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen text-[color:var(--text)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-fit text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)] transition-colors hover:text-[color:var(--accent)]"
          >
            ← Back to portfolio
          </Link>
          <h1 className="text-3xl font-semibold sm:text-4xl">SQL Playground</h1>
          <p className="max-w-3xl text-base leading-7 text-[color:var(--muted)]">
            A real PostgreSQL instance compiled to WebAssembly, running entirely in this
            tab — no server, no connection string, nothing to break. It is seeded with a
            golf reservation schema of 120,000 rows and deliberately under-indexed, so
            you can watch a query plan change when you add the right index.
          </p>
        </header>

        <Playground />

        <footer className="text-xs leading-6 text-[color:var(--muted)]">
          Your database lives in this browser tab only. Reloading rebuilds it from the
          seed script; your last query is kept in local storage.
        </footer>
      </main>
    </div>
  );
}
