import { cn } from "@/lib/cn";
import type { RunState } from "@/lib/agent/types";

const TONE: Record<RunState, { dot: string; text: string; label: string }> = {
  idle: { dot: "bg-content-muted", text: "text-content-muted", label: "Idle" },
  planning: {
    dot: "bg-accent animate-pulse-dot",
    text: "text-accent",
    label: "Planning",
  },
  running: {
    dot: "bg-signal-500 animate-pulse-dot",
    text: "text-signal-500",
    label: "Running",
  },
  blocked: {
    dot: "bg-amber-signal",
    text: "text-amber-signal",
    label: "Needs input",
  },
  done: { dot: "bg-signal-500", text: "text-signal-500", label: "Complete" },
  failed: { dot: "bg-fault-500", text: "text-fault-500", label: "Failed" },
};

export function StatusDot({ state }: { state: RunState }) {
  return (
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full", TONE[state].dot)}
    />
  );
}

export function StatusPill({
  state,
  className,
}: {
  state: RunState;
  className?: string;
}) {
  const tone = TONE[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-hair border px-1.5 py-0.5",
        "font-mono text-2xs tracking-wide uppercase",
        tone.text,
        className,
      )}
    >
      <StatusDot state={state} />
      {tone.label}
    </span>
  );
}
