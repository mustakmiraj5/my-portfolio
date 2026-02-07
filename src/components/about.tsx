export default function About() {
  return (
    <section id="about" className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-8 shadow-[var(--shadow)]">
        <h2 className="text-2xl font-semibold text-[color:var(--text)]">
          About
        </h2>
        <p className="mt-3 text-sm leading-5 text-[color:var(--muted)] text-justify">
          Hello! I&apos;m Miraj, a dedicated{" "}
          <span className="font-semibold text-[color:var(--text)]">Web Developer</span>{" "}
          with a strong passion for crafting exceptional digital experiences.
          With{" "}
          <span className="text-sm font-semibold text-[color:var(--accent)]">2.5+</span>{" "}
          years of experience in application development, I thrive on turning
          ideas into reality through clean code and innovative design. My
          journey in web development began with a fascination for the
          intersection of technology and creativity, and since then, I&apos;ve
          been on a mission to create user-centric solutions that leave a
          lasting impact. When I&apos;m not coding, you can find me exploring
          the latest trends in software development, experimenting with new
          technologies, or simply enjoying a good cup of coffee.
        </p>
        <div className="mt-6">
          <a
            href="#contact"
            className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-strong)]"
          >
            Let&apos;s Connect
          </a>
        </div>
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
