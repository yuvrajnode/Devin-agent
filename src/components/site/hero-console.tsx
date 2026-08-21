import { cn } from "@/lib/cn";

interface Row {
  label: string;
  target: string;
  state: "done" | "active" | "pending";
}

const ROWS: Row[] = [
  { label: "Locate the relevant code", target: "rg \"rateLimit\" src/", state: "done" },
  { label: "Read rate-limit.ts", target: "src/server/rate-limit.ts", state: "done" },
  { label: "Reproduce the failure", target: "npm test -- rate-limit", state: "done" },
  { label: "Replace the fixed window", target: "src/server/rate-limit.ts", state: "active" },
  { label: "Add a regression test", target: "__tests__/rate-limit.test.ts", state: "pending" },
  { label: "Run the test suite", target: "npm test", state: "pending" },
];

const MARK: Record<Row["state"], string> = {
  done: "text-signal-500",
  active: "text-accent",
  pending: "text-content-muted",
};

/**
 * A still frame of a real run. Static markup rather than an animation loop:
 * it renders identically on the server, costs nothing, and does not compete
 * with the actual product for attention.
 */
export function HeroConsole() {
  return (
    <div className="overflow-hidden rounded-panel border bg-surface-base shadow-[0_1px_0_0_var(--line-hair),0_24px_60px_-40px_rgb(0_0_0/0.6)]">
      <div className="flex h-9 items-center gap-2 border-b bg-surface-raised/70 px-3">
        <span className="size-1.5 rounded-full bg-accent" />
        <span className="font-mono text-2xs text-content-secondary">
          run/4f2a · acme/checkout-service@main
        </span>
        <span className="label ml-auto hidden sm:inline">step 4 of 6</span>
      </div>

      <ol className="divide-y">
        {ROWS.map((row, i) => (
          <li
            key={row.label}
            className={cn(
              "flex items-baseline gap-3 px-3 py-2.5",
              row.state === "active" && "bg-accent-soft",
            )}
          >
            <span className="w-4 shrink-0 font-mono text-2xs text-content-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={cn("shrink-0 font-mono text-2xs", MARK[row.state])}>
              {row.state === "done" ? "OK" : row.state === "active" ? "··" : "  "}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-content-primary">
                {row.label}
              </span>
              <span className="block truncate font-mono text-2xs text-content-muted">
                {row.target}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="border-t bg-surface-inset px-3 py-3 font-mono text-2xs leading-5">
        <p className="text-content-muted">$ applying patch to src/server/rate-limit.ts</p>
        <p className="text-fault-500">- const bucket = Math.floor(Date.now() / windowMs);</p>
        <p className="text-signal-500">+ await redis.zRemRangeByScore(windowKey, 0, now - windowMs);</p>
        <p className="text-content-secondary">
          <span className="text-accent">›</span> kept RateLimitResult so no caller changes
          <span className="animate-caret text-accent">▌</span>
        </p>
      </div>
    </div>
  );
}
