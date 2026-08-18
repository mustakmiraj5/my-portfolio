import { revealDelay } from "@/lib/reveal";

export default function Contact() {
  return (
    <section id="contact" className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div
        data-reveal="left"
        className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Contact
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">
          Get in touch with me!
        </h2>
        <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
          Feel free to drop me a message and let's start building something great together!
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <a
            className="rounded-full bg-[color:var(--btn-bg)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--on-accent)] transition duration-300 hover:-translate-y-0.5 hover:bg-[color:var(--btn-bg-hover)]"
            href="mailto:msmiraj8@gmail.com"
          >
            Email me
          </a>
          <a
            className="rounded-full border border-[color:var(--border)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text)] transition hover:border-[color:var(--accent)]"
            href="/resume.pdf"
            download="Mustak-Sahariar-Miraj-Resume.pdf"
          >
            Download Resume
          </a>
        </div>
      </div>
      <div className="grid gap-4">
        {[
          {
            label: "Location",
            value: "Dhaka, Bangladesh",
          },
          {
            label: "Focus",
            value: "Backend, Cloud, Full-stack",
          },
          {
            label: "Availability",
            value: "Open to opportunities",
          },
        ].map((item, index) => (
          <div
            key={item.label}
            data-reveal="right"
            style={revealDelay(index * 110)}
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
