"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MIN_OBJECTIVE_LENGTH } from "@/lib/server/validate";

const EXAMPLES = [
  "Fix the bug where bursts slip through at the window boundary",
  "Add idempotent retries to the payments gateway client",
  "Document the request path and every environment variable",
];

/**
 * Hands the objective to the workspace through the URL, so a link to a
 * prefilled run is shareable and the workspace stays the only place that
 * actually starts one.
 */
export function ObjectiveLauncher() {
  const router = useRouter();
  const [objective, setObjective] = useState("");

  const ready = objective.trim().length >= MIN_OBJECTIVE_LENGTH;

  function launch(value: string) {
    router.push(`/workspace?objective=${encodeURIComponent(value.trim())}`);
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) launch(objective);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="objective" className="sr-only">
          Objective
        </label>
        <input
          id="objective"
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          placeholder="Describe a change to make in checkout-service…"
          maxLength={400}
          className="h-11 min-w-0 flex-1 rounded-hair border bg-surface-base px-3 text-sm text-content-primary placeholder:text-content-muted focus:border-accent-line focus:outline-none"
        />
        <Button type="submit" variant="primary" size="lg" disabled={!ready}>
          Start the run
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="label">Try</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setObjective(example)}
            className="rounded-hair border px-2 py-1 text-2xs text-content-secondary transition-colors hover:border-accent-line hover:text-content-primary"
          >
            {example.length > 44 ? `${example.slice(0, 41)}…` : example}
          </button>
        ))}
      </div>
    </div>
  );
}
