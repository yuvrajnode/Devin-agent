"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { Plan } from "@/lib/agent/types";

const LEVEL: Record<string, string> = {
  out: "text-content-secondary",
  err: "text-status-fail",
  note: "text-accent",
};

/**
 * The combined output of every step that has produced any.
 *
 * Auto-scroll follows the tail only while the user is already at the bottom —
 * scrolling up to read something must not be yanked away by the next line.
 */
export function TerminalPane({ plan }: { plan: Plan | null }) {
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  const lineCount =
    plan?.steps.reduce((total, step) => total + step.logs.length, 0) ?? 0;

  useEffect(() => {
    const node = scroller.current;
    if (!node || !pinned.current) return;
    node.scrollTop = node.scrollHeight;
  }, [lineCount]);

  function onScroll() {
    const node = scroller.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    pinned.current = distanceFromBottom < 32;
  }

  const active = plan?.steps.filter((step) => step.logs.length > 0) ?? [];

  if (active.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="max-w-xs text-center text-sm text-content-muted">
          Output from each step appears here as the run progresses.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      // A scroll region whose content is not focusable is unreachable by
      // keyboard, so it takes focus itself.
      tabIndex={0}
      role="log"
      aria-label="Step output"
      className="scrollbar-slim h-full overflow-y-auto bg-surface-inset px-3 py-3 font-mono text-2xs leading-5"
    >
      {active.map((step) => (
        <section key={step.id} className="mb-4 last:mb-0">
          <p className="text-content-muted">
            <span className="text-accent">
              {String(step.index).padStart(2, "0")}
            </span>{" "}
            {step.tool} · {step.target}
          </p>
          {step.logs.map((line, i) => (
            <p
              key={`${step.id}-${i}`}
              className={cn("break-all whitespace-pre-wrap", LEVEL[line.level])}
            >
              {line.level === "note" ? `› ${line.text}` : line.text}
            </p>
          ))}
          {step.state === "active" ? (
            <p className="text-accent">
              <span className="animate-caret">▌</span>
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
