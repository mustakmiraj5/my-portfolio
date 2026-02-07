import { socialLinks } from "@/lib/social-links";

export default function Hero() {
  return (
    <section id="hero" className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="flex flex-col gap-6">
        <span className="w-fit rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Open to full-stack opportunities
        </span>
        <h1 className="text-4xl font-semibold leading-tight text-[color:var(--text)] sm:text-5xl">
          I build reliable, scalable web applications with TypeScript and
          modern backend architecture.
        </h1>
        <p className="text-lg leading-8 text-[color:var(--muted)]">
          Full-stack developer working with Next.js, NestJS, Prisma, and
          modern databases. I care about performance, maintainability, and
          clear system design—from API contracts to infrastructure.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="#projects"
            className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-strong)]"
          >
            View Projects
          </a>
          <a
            href="#contact"
            className="rounded-full border border-[color:var(--border)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--text)] transition hover:border-[color:var(--accent)]"
          >
            Let's Talk
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--muted)]">
          {socialLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition hover:border-[color:var(--accent)] hover:text-[color:var(--text)]"
            >
              {item.icon}
              {/* <span>{item.label}</span> */}
            </a>
          ))}
        </div>
      </div>
      <div className="grid gap-4">
        <div className="flex flex-col justify-center rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-6 py-2 shadow-[var(--shadow)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Current Focus
          </p>
          <p className="mt-4 text-2xl font-semibold text-[color:var(--text)]">
            Problem Solving,<br />
            Design Patterns & Refactoring,<br />
            Performance Optimization,<br />
            System Design & Architecture.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Stack", value: "TS + Python" },
            { label: "Databases", value: "SQL + NoSQL" },
            { label: "Cloud", value: "AWS" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-4 text-center"
            >
              <p className="text-2xl font-semibold text-[color:var(--text)]">
                {stat.value}
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] mt-1.5 text-[color:var(--muted)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
