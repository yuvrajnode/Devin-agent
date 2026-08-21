"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { repoFiles } from "@/lib/agent/repo";
import { changeset } from "@/lib/agent/types";
import type { Plan } from "@/lib/agent/types";

/**
 * The checkout, with the files the current run touched marked. Files the agent
 * created during the run are appended so the tree reflects the run's reality
 * rather than only the starting state.
 */
export function FilesPane({ plan }: { plan: Plan | null }) {
  const touched = useMemo(
    () => new Set(changeset(plan).map((hunk) => hunk.path)),
    [plan],
  );

  const files = useMemo(() => {
    const base = repoFiles();
    const known = new Set(base.map((file) => file.path));
    const created = [...touched]
      .filter((path) => !known.has(path))
      .map((path) => ({
        path,
        language: "ts" as const,
        content: "// Created during this run — see the Changes tab for the patch.\n",
      }));
    return [...base, ...created].sort((a, b) => a.path.localeCompare(b.path));
  }, [touched]);

  const [selected, setSelected] = useState(files[0]?.path ?? "");
  const active = files.find((file) => file.path === selected) ?? files[0];

  return (
    <div className="grid h-full grid-cols-[minmax(150px,34%)_1fr] divide-x">
      <nav className="hide-scrollbar overflow-y-auto py-1">
        {files.map((file) => {
          const isActive = file.path === active?.path;
          return (
            <button
              key={file.path}
              type="button"
              onClick={() => setSelected(file.path)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-2xs transition-colors",
                isActive
                  ? "bg-accent-soft text-content-primary"
                  : "text-content-secondary hover:bg-surface-raised",
              )}
            >
              <span className="truncate">{file.path}</span>
              {touched.has(file.path) ? (
                <span className="ml-auto shrink-0 text-accent">M</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="hide-scrollbar min-w-0 overflow-auto bg-surface-inset">
        {active ? (
          <pre className="font-mono text-2xs leading-5">
            {active.content.split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="w-9 shrink-0 pr-2 text-right text-content-muted/60 select-none">
                  {i + 1}
                </span>
                <span className="whitespace-pre text-content-secondary">
                  {line || " "}
                </span>
              </div>
            ))}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
