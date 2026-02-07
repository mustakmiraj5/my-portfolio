import { socialLinks } from "@/lib/social-links";

export default function Footer() {
  return (
    <footer className="border-t border-[color:var(--border)]">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
        <span>© {new Date().getFullYear()} Mustak Sahariar Miraj</span>
        <div className="flex items-center gap-3">
          {socialLinks.map((item) => (
            <a
              key={`footer-${item.label}`}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              aria-label={item.label}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--text)]"
            >
              {item.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
