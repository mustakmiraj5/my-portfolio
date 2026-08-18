import { revealDelay } from "@/lib/reveal";

export default function About() {
  return (
    <section id="about" className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div
        data-reveal="left"
        className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-8 shadow-[var(--shadow)]"
      >
        <h2 className="text-2xl font-semibold text-[color:var(--text)]">
          About
        </h2>
        <p className="mt-3 text-sm leading-5 text-[color:var(--muted)] text-justify">
          Hello! I&apos;m Miraj, a{" "}
          <span className="font-semibold text-[color:var(--text)]">Software Engineer</span>{" "}
          based in Dhaka, Bangladesh, with{" "}
          <span className="text-sm font-semibold text-[color:var(--accent)]">nearly 2</span>{" "}
          years building and operating AWS-hosted SaaS in TypeScript, NestJS,
          MySQL and React. Today I own backend services for a Japanese golf
          reservation platform—REST APIs, async job pipelines, and the
          Linux/nginx infrastructure they run on—working daily with a Japanese
          engineering team across a 3-hour timezone offset. I care about
          correctness under concurrency, clear system design, and code that
          stays maintainable long after it ships. When I&apos;m not coding, you
          can find me solving problems on LeetCode, digging into how systems
          like NGINX work internally, or simply enjoying a good cup of coffee.
        </p>
        <div className="mt-6">
          <a
            href="#contact"
            className="rounded-full bg-[color:var(--btn-bg)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--on-accent)] transition hover:-translate-y-0.5 hover:bg-[color:var(--btn-bg-hover)]"
          >
            Let&apos;s Connect
          </a>
        </div>
      </div>
      <div className="grid gap-4">
        {[
          "REST API design and backend services with NestJS",
          "Async job pipelines with SQS, BullMQ and DLQ redrive",
          "Data modeling with Prisma over MySQL and MongoDB",
          "Production ops on AWS — EC2, nginx, ALB, PM2, CloudWatch",
        ].map((item, index) => (
          <div
            key={item}
            data-reveal="right"
            style={revealDelay(index * 110)}
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]"
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
