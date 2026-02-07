import ThemeToggle from "@/components/theme-toggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--bg)]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--accent-strong)]">
              Mustak Sahariar Miraj
            </p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)] md:flex">
          <a className="transition hover:text-[color:var(--text)]" href="#about">
            About
          </a>
          <a
            className="transition hover:text-[color:var(--text)]"
            href="#projects"
          >
            Projects
          </a>
          <a className="transition hover:text-[color:var(--text)]" href="#skills">
            Skills
          </a>
          <a className="transition hover:text-[color:var(--text)]" href="#blogs">
            Blogs
          </a>
          <a
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-[color:var(--text)] transition hover:border-[color:var(--accent)]"
            href="#contact"
          >
            Contact
          </a>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
