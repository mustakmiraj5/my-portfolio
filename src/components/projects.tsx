const projects = [
  {
    title: "Golfee",
    description:
      "Campaign and free-ticket management system for golf courses, integrated with the main golf course reservation system.",
    tags: ["Next.js", "NestJS", "MySQL", "AWS"],
  },
  {
    title: "GreenTee",
    description:
      "Multi-tenant SaaS for golf course maintenance — manages keepers, workers, work logs, audit trails, inventory, machinery, incidents, and insecticides across golf groups.",
    tags: ["Next.js", "NestJS", "MySQL", "AWS"],
  },
];

export default function Projects() {
  return (
    <section id="projects" className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Selected work
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">
            Projects across product and infrastructure
          </h2>
        </div>
        <a
          href="#contact"
          className="rounded-full border border-[color:var(--border)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
        >
          Request case studies
        </a>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((project) => (
          <article
            key={project.title}
            className="flex h-full flex-col gap-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow)]"
          >
            <div>
              <h3 className="text-xl font-semibold text-[color:var(--text)]">
                {project.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                {project.description}
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              {project.tags.map((tag) => (
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
