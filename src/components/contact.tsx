export default function Contact() {
  return (
    <section id="contact" className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-8">
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
            className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black"
            href="mailto:msmiraj8@gmail.com"
          >
            Email me
          </a>
          <a
            className="rounded-full border border-[color:var(--border)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text)]"
            href="#"
          >
            Download Resume
          </a>
        </div>
      </div>
      <div className="grid gap-4">
        {[
          {
            label: "Location",
            value: "Remote",
          },
          {
            label: "Focus",
            value: "Full-stack, Backend, Cloud",
          },
          {
            label: "Availability",
            value: "Open to opportunities",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-5"
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
