import { socialLinks } from "@/lib/social-links";
import { revealDelay } from "@/lib/reveal";

export default function Hero() {
  return (
    <section id="hero" className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="flex flex-col gap-6">
        <span
          data-reveal
          style={revealDelay(0)}
          className="w-fit rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
        >
          Software Engineer · Dhaka, Bangladesh
        </span>
        <h1
          data-reveal
          style={revealDelay(80)}
          className="text-4xl font-semibold leading-tight text-[color:var(--text)] sm:text-5xl"
        >
          I build and operate AWS-hosted SaaS with TypeScript, NestJS,
          and MySQL.
        </h1>
        <p
          data-reveal
          style={revealDelay(160)}
          className="text-lg leading-8 text-[color:var(--muted)]"
        >
          Nearly 2 years building production backends. Currently delivering a
          Japanese-language reservation platform for an overseas engineering
          team across timezones—REST API design, async job pipelines, and
          Linux/nginx production infrastructure.
        </p>
        <div
          data-reveal
          style={revealDelay(240)}
          className="flex flex-wrap items-center gap-4"
        >
          <a
            href="#projects"
            className="rounded-full bg-[color:var(--btn-bg)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--on-accent)] transition hover:-translate-y-0.5 hover:bg-[color:var(--btn-bg-hover)]"
          >
            View Projects
          </a>
          <a
            href="#contact"
            className="rounded-full border border-[color:var(--border)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--text)] transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]"
          >
            Let's Talk
          </a>
        </div>
        <div
          data-reveal
          style={revealDelay(320)}
          className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--muted)]"
        >
          {socialLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              aria-label={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:text-[color:var(--text)]"
            >
              {item.icon}
              {/* <span>{item.label}</span> */}
            </a>
          ))}
        </div>
      </div>
      <div className="grid gap-4">
        <div
          data-reveal="right"
          style={revealDelay(200)}
          className="flex flex-col justify-center rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-6 py-2 shadow-[var(--shadow)]"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Current Focus
          </p>
          <p className="mt-4 text-2xl font-semibold text-[color:var(--text)]">
            REST API Design,<br />
            Async Job Pipelines,<br />
            Production Infrastructure,<br />
            System Design & Architecture.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Stack", value: "TS + Python" },
            { label: "Databases", value: "SQL + NoSQL" },
            { label: "Cloud", value: "AWS" },
          ].map((stat, index) => (
            <div
              key={stat.label}
              data-reveal="right"
              style={revealDelay(300 + index * 90)}
              className="flex flex-col items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-4 text-center transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]"
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
