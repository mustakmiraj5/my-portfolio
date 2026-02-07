const skillGroups = [
  {
    title: "Frontend",
    items: ["TypeScript", "Next.js", "React"],
  },
  {
    title: "Backend",
    items: ["NestJS", "Prisma", "PostgreSQL", "MongoDB", "MySQL"],
  },
  {
    title: "Cloud & DevOps",
    items: ["Docker", "AWS EC2", "AWS RDS", "CloudFormation"],
  },
  {
    title: "Languages",
    items: ["TypeScript", "Python", "SQL", "Bash", "JavaScript"],
  },
];

export default function Skills() {
  return (
    <section id="skills" className="grid gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Skills
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">
          Balanced across design and engineering
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {skillGroups.map((group) => (
          <div
            key={group.title}
            className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6"
          >
            <h3 className="text-lg font-semibold text-[color:var(--text)]">
              {group.title}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
