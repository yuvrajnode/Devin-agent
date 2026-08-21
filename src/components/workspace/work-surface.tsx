"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/ui/panel";
import { changeset } from "@/lib/agent/types";
import type { Plan } from "@/lib/agent/types";
import { DiffPane } from "./diff-pane";
import { FilesPane } from "./files-pane";
import { TerminalPane } from "./terminal-pane";

type Tab = "terminal" | "changes" | "files";

const TABS: { id: Tab; label: string }[] = [
  { id: "terminal", label: "Terminal" },
  { id: "changes", label: "Changes" },
  { id: "files", label: "Files" },
];

export function WorkSurface({ plan }: { plan: Plan | null }) {
  const [tab, setTab] = useState<Tab>("terminal");
  const changedCount = changeset(plan).length;

  return (
    <Panel className="h-full">
      <div
        role="tablist"
        aria-label="Work surface"
        className="flex h-10 shrink-0 items-stretch border-b bg-surface-raised/60"
      >
        {TABS.map((entry) => {
          const isActive = entry.id === tab;
          return (
            <button
              key={entry.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setTab(entry.id)}
              className={cn(
                "relative flex items-center gap-1.5 border-r px-3.5 font-mono text-2xs tracking-wide uppercase transition-colors",
                isActive
                  ? "bg-surface-base text-content-primary"
                  : "text-content-muted hover:text-content-secondary",
              )}
            >
              {entry.label}
              {entry.id === "changes" && changedCount > 0 ? (
                <span className="rounded-hair bg-accent-soft px-1 text-accent">
                  {changedCount}
                </span>
              ) : null}
              {isActive ? (
                <span className="absolute inset-x-0 -bottom-px h-px bg-accent" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {tab === "terminal" ? <TerminalPane plan={plan} /> : null}
        {tab === "changes" ? <DiffPane plan={plan} /> : null}
        {tab === "files" ? <FilesPane plan={plan} /> : null}
      </div>
    </Panel>
  );
}
