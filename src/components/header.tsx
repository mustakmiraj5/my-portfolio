"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "@/components/theme-toggle";

const navItems = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "lab", label: "Lab" },
  { id: "skills", label: "Skills" },
  { id: "blogs", label: "Blogs" },
];

export default function Header() {
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState("");

  // Reading progress + header elevation, throttled to one frame.
  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
      setScrolled(window.scrollY > 24);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Highlight whichever section is crossing the middle of the viewport.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        setActiveId(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--bg)]/80 backdrop-blur transition-shadow duration-300 ${
        scrolled ? "shadow-[0_18px_40px_-32px_rgba(0,0,0,0.6)]" : "shadow-none"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <a
              href="#hero"
              className="text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--accent-strong)]"
            >
              Mustak Sahariar Miraj
            </a>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)] lg:flex">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={activeId === item.id ? "true" : undefined}
              className={`relative transition-colors duration-300 hover:text-[color:var(--text)] ${
                activeId === item.id ? "text-[color:var(--text)]" : ""
              }`}
            >
              {item.label}
              <span
                aria-hidden
                className={`absolute -bottom-1.5 left-0 h-px w-full origin-left bg-[color:var(--accent)] transition-transform duration-300 ease-out ${
                  activeId === item.id ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </a>
          ))}
          <a
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-[color:var(--text)] transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--accent)]"
            href="#contact"
          >
            Contact
          </a>
        </nav>
        <ThemeToggle />
      </div>

      {/* Reading progress */}
      <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
        <div
          className="h-full w-full origin-left bg-[color:var(--accent)]"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </header>
  );
}
