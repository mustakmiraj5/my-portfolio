import Link from "next/link";
import { revealDelay } from "@/lib/reveal";

const experiments = [
  {
    title: "SQL Playground",
    href: "/playground",
    blurb:
      "A real PostgreSQL instance compiled to WebAssembly, running entirely in the browser — no server, no connection string. Six practice schemas (e-commerce, banking, university, hospital, movies, ride hailing), each 7-9 related tables and ~40k deliberately under-indexed rows, loaded on demand. It reads the EXPLAIN ANALYZE plan back to you: scans that discard most of what they read, planner estimates off by orders of magnitude, sorts spilling to disk. Add an index, re-run, and watch Seq Scan become Index Scan — or drop in your own .sql file and explore that instead.",
    tags: ["PGlite", "WebAssembly", "PostgreSQL", "Next.js"],
    cta: "Try it live",
  },
];

export default function Lab() {
  return (
    <section id="lab" className="grid gap-8">
      <div data-reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Lab
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">
          Experiments I build to understand something
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
          Self-contained tools, written to get concrete about a problem rather
          than read about it. Smaller in scope than the work above — open to
          poke at.
        </p>
      </div>

      <div className="grid gap-6">
        {experiments.map((item, index) => (
          <article
            key={item.title}
            data-reveal
            style={revealDelay(index * 120)}
            className="flex flex-col gap-5 rounded-3xl border border-dashed border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)] sm:p-8"
          >
            <div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-xl font-semibold text-[color:var(--text)]">
                  {item.title}
                </h3>
                <Link
                  href={item.href}
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)] transition hover:text-[color:var(--accent-strong)]"
                >
                  {item.cta} →
                </Link>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
                {item.blurb}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
