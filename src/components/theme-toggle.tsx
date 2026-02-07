"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_KEY = "theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const next = stored === "light" || stored === "dark" ? stored : preferred;

    document.documentElement.classList.toggle("dark", next === "dark");
    setTheme(next);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--text)]"
      aria-label="Toggle color theme"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)] transition group-hover:scale-105">
        {mounted && theme === "dark" ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
            <path
              fill="currentColor"
              d="M12 2a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm7 9a1 1 0 0 1-1 1h-2a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1Zm-7 7a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1ZM6 11a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1Zm9.07-5.07a1 1 0 0 1 1.41 0l1.42 1.42a1 1 0 0 1-1.42 1.41l-1.41-1.41a1 1 0 0 1 0-1.42Zm-9.9 9.9a1 1 0 0 1 1.41 0l1.41 1.42a1 1 0 0 1-1.41 1.41l-1.41-1.41a1 1 0 0 1 0-1.42Zm0-9.9a1 1 0 0 1 0 1.42L3.76 8.76A1 1 0 0 1 2.34 7.35l1.42-1.42a1 1 0 0 1 1.41 0Zm9.9 9.9a1 1 0 0 1 0 1.41l-1.42 1.42a1 1 0 1 1-1.41-1.42l1.41-1.41a1 1 0 0 1 1.42 0ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
            <path
              fill="currentColor"
              d="M20.8 15.5A8.5 8.5 0 1 1 8.5 3.2a.8.8 0 0 1 .84 1.26A6.9 6.9 0 1 0 19.5 14.7a.8.8 0 0 1 1.3.8Z"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
