const projects = [
  {
    title: "U39-GOLF",
    href: "https://u39-golf.jp",
    description:
      "Coupon and reservation platform for a Japanese golf group. Issues free and paid coupons, processes guest observation-play requests, and syncs with the main reservation system. Ships JWT authentication with multiple identity providers across 2 user roles.",
    tags: [
      "NestJS",
      "Prisma",
      "MySQL",
      "SQS",
      "Next.js",
      "SendGrid",
      "GitHub Actions",
    ],
  },
  {
    title: "GreenTee",
    description:
      "Multi-tenant SaaS for turf management across a golf group's courses — tracks facilities, staff, agrochemicals, machinery, inventory and daily work reports with tenant-scoped data isolation, role-based access across 4 roles, and media delivery optimized via S3 and CloudFront with on-upload image processing.",
    tags: ["NestJS", "Prisma", "MySQL", "Next.js", "TanStack Query", "AWS"],
  },
];

import { revealDelay } from "@/lib/reveal";

export default function Projects() {
  return (
    <section id="projects" className="grid gap-8">
      <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
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
        {projects.map((project, index) => (
          <article
            key={project.title}
            data-reveal
            style={revealDelay(index * 130)}
            className="flex h-full flex-col gap-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]"
          >
            <div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-xl font-semibold text-[color:var(--text)]">
                  {project.title}
                </h3>
                {project.href ? (
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)] transition hover:text-[color:var(--accent-strong)]"
                  >
                    Visit site ↗
                  </a>
                ) : null}
              </div>
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
