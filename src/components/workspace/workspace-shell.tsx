"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";
import { Wordmark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status";
import { useActiveSession, useIsRunning, useStore } from "@/lib/store";
import { ChatPanel } from "./chat-panel";
import { PlanPanel } from "./plan-panel";
import { SessionList } from "./session-list";
import { WorkSurface } from "./work-surface";

export function WorkspaceShell() {
  const searchParams = useSearchParams();
  const prefill = searchParams.get("objective") ?? "";

  const sessions = useStore((state) => state.sessions);
  const activeId = useStore((state) => state.activeId);
  const hydrated = useStore((state) => state.hydrated);
  const error = useStore((state) => state.error);
  const start = useStore((state) => state.start);
  const stop = useStore((state) => state.stop);
  const select = useStore((state) => state.select);
  const remove = useStore((state) => state.remove);
  const clearError = useStore((state) => state.clearError);

  const session = useActiveSession();
  const running = useIsRunning();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * A prefilled objective arriving from the landing page is a deliberate
   * "start this run" action, so it starts once — the ref keeps a re-render or
   * a Strict Mode double-effect from launching it twice.
   */
  const launched = useRef(false);
  useEffect(() => {
    if (!hydrated || launched.current || prefill.trim().length === 0) return;
    launched.current = true;
    void start(prefill.trim());
  }, [hydrated, prefill, start]);

  useEffect(() => {
    // Abort any in-flight run if the workspace unmounts.
    return () => stop();
  }, [stop]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label="Toggle run history"
          aria-expanded={sidebarOpen}
          className="rounded-hair p-1.5 text-content-muted transition-colors hover:text-content-primary lg:hidden"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        <Link href="/" className="text-content-primary">
          <Wordmark />
        </Link>

        <span className="hidden font-mono text-2xs text-content-muted sm:inline">
          {session?.repo ?? "acme/checkout-service@main"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {session ? <StatusPill state={session.state} /> : null}
          {running ? (
            <Button size="sm" variant="danger" onClick={stop}>
              Stop
            </Button>
          ) : null}
          <ThemeToggle />
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-3 border-b bg-fault-500/10 px-3 py-2"
        >
          <span className="text-sm text-fault-500">{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="label ml-auto hover:text-content-primary"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto p-2 lg:grid-cols-[13rem_minmax(20rem,1fr)_1.35fr] lg:overflow-hidden">
        <Panel
          className={cn(
            // A drawer below lg, a permanent column at lg and above.
            "min-h-0 lg:block",
            sidebarOpen ? "block" : "hidden",
          )}
        >
          <PanelHeader
            title="Runs"
            actions={
              <span className="font-mono text-2xs text-content-muted">
                {sessions.length}
              </span>
            }
          />
          <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto">
            {hydrated ? (
              <SessionList
                sessions={sessions}
                activeId={activeId}
                onSelect={(id) => {
                  select(id);
                  setSidebarOpen(false);
                }}
                onRemove={remove}
              />
            ) : null}
          </div>
        </Panel>

        <div className="grid min-h-0 grid-rows-[minmax(14rem,1fr)_minmax(15rem,1fr)] gap-2">
          <PlanPanel plan={session?.plan ?? null} />
          <ChatPanel
            messages={session?.messages ?? []}
            running={running}
            onSubmit={(objective) => void start(objective)}
            onStop={stop}
          />
        </div>

        <div className="min-h-[22rem] lg:min-h-0">
          <WorkSurface plan={session?.plan ?? null} />
        </div>
      </div>
    </div>
  );
}
