"use client";

import { cn } from "@/lib/cn";
import { StatusDot } from "@/components/ui/status";
import type { Session } from "@/lib/agent/types";

function relativeTime(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function SessionList({
  sessions,
  activeId,
  onSelect,
  onRemove,
}: {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-content-muted">
        Runs you start are kept here, in this browser only.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {sessions.map((session) => {
        const isActive = session.id === activeId;
        return (
          <li key={session.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(session.id)}
              className={cn(
                "flex w-full items-start gap-2 py-2.5 pr-8 pl-3 text-left transition-colors",
                isActive ? "bg-accent-soft" : "hover:bg-surface-raised/60",
              )}
            >
              <span className="mt-1.5">
                <StatusDot state={session.state} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-content-primary">
                  {session.title}
                </span>
                <span className="label mt-0.5 block">
                  {relativeTime(session.createdAt)}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onRemove(session.id)}
              aria-label={`Delete run: ${session.title}`}
              className="absolute top-2.5 right-2 rounded-hair p-1 text-content-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-fault-500"
            >
              <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                <path
                  d="M2 2l8 8M10 2l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
