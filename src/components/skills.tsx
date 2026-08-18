const skillGroups = [
  {
    title: "Languages",
    items: ["JavaScript", "TypeScript", "Python", "SQL"],
  },
  {
    title: "Back-End",
    items: [
      "Node.js",
      "NestJS",
      "REST API design",
      "Prisma",
      "MySQL",
      "MongoDB",
      "Redis",
      "Winston",
    ],
  },
  {
    title: "Front-End",
    items: ["React.js", "Next.js", "TailwindCSS", "Recharts", "Zustand"],
  },
  {
    title: "Cloud & Tools",
    items: [
      "AWS EC2",
      "S3",
      "RDS",
      "SQS",
      "ALB",
      "CloudFormation",
      "BullMQ",
      "nginx",
      "PM2",
      "Docker",
      "Ubuntu",
      "Git",
      "Jest",
    ],
  },
];

import { revealDelay } from "@/lib/reveal";

export default function Skills() {
  return (
    <section id="skills" className="grid gap-8">
      <div data-reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Skills
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">
          Balanced across product and infrastructure
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {skillGroups.map((group, index) => (
          <div
            key={group.title}
            data-reveal
            style={revealDelay(index * 110)}
            className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]"
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
