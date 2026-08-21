"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { planProgress } from "@/lib/agent/types";
import type { Plan, Step, StepState } from "@/lib/agent/types";

const GLYPH: Record<StepState, { mark: string; tone: string }> = {
  pending: { mark: "○", tone: "text-content-muted" },
  active: { mark: "◐", tone: "text-accent animate-pulse-dot" },
  done: { mark: "●", tone: "text-signal-500" },
  failed: { mark: "✕", tone: "text-fault-500" },
  skipped: { mark: "–", tone: "text-content-muted" },
};

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function StepRow({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const glyph = GLYPH[step.state];

  return (
    <li
      className={cn(
        "border-l-2 transition-colors",
        step.state === "active" ? "border-l-accent bg-accent-soft" : "border-l-transparent",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-raised/60"
      >
        <span className="mt-0.5 w-4 shrink-0 text-right font-mono text-2xs text-content-muted">
          {String(step.index).padStart(2, "0")}
        </span>
        <span className={cn("mt-px shrink-0 font-mono text-2xs", glyph.tone)}>
          {glyph.mark}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-sm text-content-primary">
              {step.title}
            </span>
            {step.durationMs !== undefined ? (
              <span className="shrink-0 font-mono text-2xs text-content-muted">
                {formatDuration(step.durationMs)}
              </span>
            ) : null}
          </span>

          <span className="mt-0.5 flex items-center gap-1.5">
            <span className="shrink-0 rounded-hair border px-1 font-mono text-2xs text-content-muted uppercase">
              {step.tool}
            </span>
            <span className="min-w-0 truncate font-mono text-2xs text-content-muted">
              {step.target}
            </span>
          </span>

          {open ? (
            <span className="mt-2 block border-l pl-2.5 text-sm leading-relaxed text-content-secondary">
              {step.rationale}
              {step.diff ? (
                <span className="mt-1.5 block font-mono text-2xs">
                  <span className="text-signal-500">+{step.diff.additions}</span>{" "}
                  <span className="text-fault-500">−{step.diff.deletions}</span>{" "}
                  <span className="text-content-muted">{step.diff.path}</span>
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

export function PlanPanel({ plan }: { plan: Plan | null }) {
  const { done, total } = planProgress(plan);

  return (
    <Panel className="h-full">
      <PanelHeader
        title="Plan"
        meta={plan ? (plan.source === "model" ? "model-planned" : "heuristic") : undefined}
        actions={
          total > 0 ? (
            <span className="font-mono text-2xs text-content-muted">
              {done}/{total}
            </span>
          ) : null
        }
      />

      {total > 0 ? (
        <div className="h-px shrink-0 bg-line-hair">
          <div
            className="h-px bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      ) : null}

      <PanelBody>
        {plan ? (
          <>
            <p className="border-b px-3 py-3 text-sm leading-relaxed text-content-secondary">
              {plan.summary}
            </p>
            <ol className="divide-y">
              {plan.steps.map((step) => (
                <StepRow key={step.id} step={step} />
              ))}
            </ol>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <p className="max-w-[15rem] text-center text-sm text-content-muted">
              The plan appears here once the objective has been classified.
            </p>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
