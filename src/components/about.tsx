export default function About() {
  return (
    <section id="about" className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-8 shadow-[var(--shadow)]">
        <h2 className="text-2xl font-semibold text-[color:var(--text)]">
          About
        </h2>
        <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
          I'm a full-stack developer specializing in TypeScript across the
          stack. I build API-first products with NestJS, design reliable data
          layers with Prisma, and ship production-ready apps with Next.js.
          I work across MongoDB, PostgreSQL, and MySQL depending on the
          product's needs.
        </p>
      </div>
      <div className="grid gap-4">
        {[
          "API design and backend systems with NestJS",
          "Database modeling with Prisma ORM",
          "Containerized deployments with Docker",
          "Cloud infrastructure on AWS (EC2, RDS, CloudFormation)",
        ].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-5"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Focus Area
            </p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">
              {item}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
