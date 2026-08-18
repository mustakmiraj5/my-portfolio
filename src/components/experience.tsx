const roles = [
  {
    title: "Software Engineer",
    company: "Venturas Ltd",
    location: "Dhaka, Bangladesh (Hybrid)",
    period: "Sept 2025 – Present",
    points: [
      "Built and ran the backend services for a Japanese golf reservation platform (NestJS, Prisma, MySQL) serving up to 150 daily reservations across 450+ golf courses.",
      "Designed an SQS + BullMQ fan-out pipeline for prefecture-segmented newsletter delivery, with DLQ redrive and per-recipient tracking for exactly-once sends.",
      "Eliminated reservation double-booking under concurrent load using optimistic locking and idempotency keys.",
      "Deployed and maintained services on EC2 behind nginx and an ALB, with PM2 process management, Winston structured logging with S3 retention, and CloudWatch Agent memory metrics.",
      "Collaborate daily with a Japanese engineering team across a 3-hour timezone offset, delivering Japanese-language UI features.",
      "Use Docker for containerization and improve CI/CD workflows.",
    ],
  },
  {
    title: "Backend Developer",
    company: "Qllix",
    location: "Dhaka, Bangladesh (Onsite)",
    period: "Dec 2024 – Aug 2025",
    points: [
      "Built and shipped RESTful backend services with NestJS, Express, Prisma and MongoDB, owning features end to end from schema design through deployment.",
      "Implemented JWT authentication with multi-device session handling and role-based access control across 3 user roles.",
    ],
  },
];

import { revealDelay } from "@/lib/reveal";

export default function Experience() {
  return (
    <section id="experience" className="grid gap-8">
      <div data-reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Experience
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">
          Shipping and running production systems
        </h2>
      </div>
      <div className="grid gap-6">
        {roles.map((role, index) => (
          <article
            key={`${role.company}-${role.title}`}
            data-reveal
            style={revealDelay(index * 120)}
            className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)] sm:p-8"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-semibold text-[color:var(--text)]">
                {role.title}
              </h3>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                {role.period}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-[color:var(--accent)]">
              {role.company}
              <span className="font-normal text-[color:var(--muted)]">
                {" "}
                · {role.location}
              </span>
            </p>
            <ul className="mt-5 grid gap-3">
              {role.points.map((point) => (
                <li
                  key={point}
                  className="flex gap-3 text-sm leading-6 text-[color:var(--muted)]"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
