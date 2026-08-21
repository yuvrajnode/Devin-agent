import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "Give the agent an objective and watch it plan, execute and produce a reviewable diff.",
};

export default function WorkspacePage() {
  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <WorkspaceShell />
    </Suspense>
  );
}

/** Matches the shell's frame so the swap does not shift the layout. */
function WorkspaceFallback() {
  return (
    <div className="flex h-dvh flex-col">
      <div className="h-12 shrink-0 border-b" />
      <div className="flex flex-1 items-center justify-center">
        <p className="label">Loading workspace</p>
      </div>
    </div>
  );
}
