"use client";

import { cn } from "@/lib/cn";

const STORAGE_KEY = "devin.theme";

/**
 * The toggle holds no React state.
 *
 * The current theme already lives on `document.documentElement` (set before
 * paint by the bootstrap script), so reading it back into state would mean a
 * mount-time render just to catch up with the DOM. Instead the icon is chosen
 * by CSS from the same attribute, and the click handler reads it directly.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private windows can block storage; the theme still applies */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      title="Toggle colour theme"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-hair border border-transparent",
        "text-content-muted transition-colors hover:border-line-strong hover:text-content-primary",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
        {/* Shown while dark is active: clicking switches to light. */}
        <g className="when-dark" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1" />
        </g>
        {/* Shown while light is active: clicking switches to dark. */}
        <path
          className="when-light"
          d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
