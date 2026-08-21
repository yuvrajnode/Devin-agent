"use client";

import { cn } from "@/lib/cn";
import { changeset } from "@/lib/agent/types";
import type { Plan } from "@/lib/agent/types";

function lineTone(line: string): string {
  if (line.startsWith("+")) return "bg-signal-500/10 text-signal-400";
  if (line.startsWith("-")) return "bg-fault-500/10 text-fault-500";
  if (line.startsWith("@@")) return "text-accent";
  return "text-content-secondary";
}

/** The aggregate changeset — the artefact a reviewer actually reads. */
export function DiffPane({ plan }: { plan: Plan | null }) {
  const hunks = changeset(plan);

  if (hunks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="max-w-xs text-center text-sm text-content-muted">
          No files changed yet. Patches collect here as the agent applies them.
        </p>
      </div>
    );
  }

  const additions = hunks.reduce((total, hunk) => total + hunk.additions, 0);
  const deletions = hunks.reduce((total, hunk) => total + hunk.deletions, 0);

  return (
    <div className="hide-scrollbar h-full overflow-y-auto">
      <div className="flex items-center gap-3 border-b bg-surface-raised/50 px-3 py-2">
        <span className="label">
          {hunks.length} file{hunks.length === 1 ? "" : "s"} changed
        </span>
        <span className="font-mono text-2xs text-signal-500">+{additions}</span>
        <span className="font-mono text-2xs text-fault-500">−{deletions}</span>
      </div>

      {hunks.map((hunk) => (
        <article key={hunk.path} className="border-b last:border-b-0">
          <header className="flex items-center gap-2 bg-surface-raised/30 px-3 py-2">
            <span className="truncate font-mono text-2xs text-content-primary">
              {hunk.path}
            </span>
            <span className="ml-auto shrink-0 font-mono text-2xs text-signal-500">
              +{hunk.additions}
            </span>
            <span className="shrink-0 font-mono text-2xs text-fault-500">
              −{hunk.deletions}
            </span>
          </header>
          <pre className="hide-scrollbar overflow-x-auto bg-surface-inset py-1 font-mono text-2xs leading-5">
            {hunk.body.split("\n").map((line, i) => (
              <div key={i} className={cn("px-3", lineTone(line))}>
                {line || " "}
              </div>
            ))}
          </pre>
        </article>
      ))}
    </div>
  );
}
