import { cn } from "@/lib/cn";

/**
 * The mark is a plan reduced to its essentials: three steps, the middle one
 * active. It reads as a glyph at 16px and still means something at 64px.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("size-4", className)} aria-hidden>
      <rect x="0.5" y="1.5" width="4" height="2" fill="currentColor" opacity="0.55" />
      <rect x="6" y="1.5" width="9.5" height="2" fill="currentColor" opacity="0.2" />
      <rect x="0.5" y="7" width="9" height="2" fill="currentColor" />
      <rect x="11" y="7" width="4.5" height="2" fill="currentColor" opacity="0.2" />
      <rect x="0.5" y="12.5" width="4" height="2" fill="currentColor" opacity="0.2" />
      <rect x="6" y="12.5" width="6" height="2" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Mark className="text-accent" />
      <span className="font-mono text-sm font-medium tracking-[0.2em] uppercase">
        Devin
      </span>
    </span>
  );
}
