import { createId } from "./id";
import { makeDiff } from "./repo";
import type { DiffHunk, LogLine, Plan, Step, ToolName } from "./types";

/**
 * The offline planner.
 *
 * Devin's planning layer is pluggable: this heuristic planner is the default
 * so the product works with no credentials, and `lib/agent/model.ts` can swap
 * in a live model that returns the same `Plan` shape. Keeping the planner
 * pure (objective in, plan out) is what makes it testable.
 */

export type Intent =
  | "bug"
  | "feature"
  | "refactor"
  | "test"
  | "performance"
  | "security"
  | "docs";

const KEYWORDS: Record<Intent, readonly string[]> = {
  bug: ["bug", "fix", "broken", "crash", "error", "regression", "fails", "wrong", "incorrect"],
  feature: ["add", "build", "implement", "create", "support", "introduce", "new", "endpoint"],
  refactor: ["refactor", "clean", "extract", "simplify", "rename", "restructure", "tidy", "split"],
  test: ["test", "coverage", "spec", "assert", "flaky", "suite"],
  performance: ["slow", "performance", "latency", "optimi", "cache", "faster", "throughput", "memory"],
  security: ["security", "auth", "token", "leak", "vulnerab", "sanitize", "csrf", "xss", "secret", "rate limit"],
  docs: ["document", "docs", "readme", "comment", "explain", "changelog"],
};

/**
 * Scores the objective against each intent's vocabulary. Ties resolve by the
 * declaration order of `KEYWORDS`, which puts the most actionable intents
 * first, and an objective that matches nothing is treated as a feature — the
 * safest default because the feature recipe reads before it writes.
 */
export function classify(objective: string): Intent {
  const text = objective.toLowerCase();
  let best: Intent = "feature";
  let bestScore = 0;

  for (const [intent, words] of Object.entries(KEYWORDS) as [Intent, readonly string[]][]) {
    const score = words.reduce(
      (total, word) => (text.includes(word) ? total + word.length : total),
      0,
    );
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }

  return best;
}

/** What a step will emit while it runs. Held server-side, never sent up front. */
export interface StepScript {
  logs: LogLine[];
  diff?: DiffHunk;
  /** When set, the step fails and the run halts with this message. */
  failure?: string;
}

interface Blueprint {
  title: string;
  rationale: string;
  tool: ToolName;
  target: string;
  script: StepScript;
}

export interface PlanDraft {
  plan: Plan;
  scripts: Map<string, StepScript>;
}

const out = (text: string): LogLine => ({ level: "out", text });
const note = (text: string): LogLine => ({ level: "note", text });
const err = (text: string): LogLine => ({ level: "err", text });

/* --- Shared blueprint fragments ----------------------------------------- */

function reconnaissance(query: string): Blueprint {
  return {
    title: "Locate the relevant code",
    rationale:
      "Before changing anything, find every call site so the edit does not miss a caller.",
    tool: "search",
    target: `rg "${query}" src/`,
    script: {
      logs: [
        out(`src/server/checkout.ts:9   const limit = await rateLimit(...)`),
        out(`src/server/rate-limit.ts:14 export async function rateLimit(`),
        out(`src/server/session.ts:15   export async function createSession(`),
        note("3 matches across 3 files — scoped to src/server."),
      ],
    },
  };
}

function readFile(path: string, rationale: string): Blueprint {
  return {
    title: `Read ${path.split("/").pop()}`,
    rationale,
    tool: "read",
    target: path,
    script: {
      logs: [
        out(`Loaded ${path} (${28 + path.length} lines)`),
        note("Anchored the region to edit; surrounding imports left untouched."),
      ],
    },
  };
}

function runTests(command: string, extra: LogLine[] = []): Blueprint {
  return {
    title: "Run the test suite",
    rationale: "A change is not done until the suite that guards it passes.",
    tool: "test",
    target: command,
    script: {
      logs: [
        out("$ " + command),
        ...extra,
        out("Test Files  12 passed (12)"),
        out("     Tests  86 passed (86)"),
        out("  Duration  4.21s"),
      ],
    },
  };
}

function verifyInBrowser(path: string): Blueprint {
  return {
    title: "Verify the behaviour end to end",
    rationale:
      "Unit tests cannot assert the user-visible result; drive the running app instead.",
    tool: "browser",
    target: `http://localhost:3000${path}`,
    script: {
      logs: [
        out(`GET ${path} → 200 in 84ms`),
        out("Submitted the form six times in a row"),
        out("Attempt 6 → 429 Too Many Requests, Retry-After: 41"),
        note("Behaviour matches the objective."),
      ],
    },
  };
}

/* --- Recipes ------------------------------------------------------------- */

const RATE_LIMIT_PATCH = `@@ -1,10 +1,13 @@
 import { redis } from "./redis";
 
 export interface RateLimitResult {
   allowed: boolean;
   remaining: number;
   resetAt: number;
 }
 
-/**
- * Fixed-window counter. Simple, but every window boundary lets through
- * up to 2x the configured limit.
- */
+/**
+ * Sliding-window counter backed by a sorted set. Trades one extra Redis
+ * round trip for an accurate limit at the window boundary.
+ */
 export async function rateLimit(
   key: string,
   limit: number,
   windowMs: number,
 ): Promise<RateLimitResult> {
-  const bucket = Math.floor(Date.now() / windowMs);
-  const counterKey = \`rl:\${key}:\${bucket}\`;
-
-  const hits = await redis.incr(counterKey);
-  if (hits === 1) {
-    await redis.pexpire(counterKey, windowMs);
-  }
+  const now = Date.now();
+  const windowKey = \`rl:\${key}\`;
+
+  await redis.zRemRangeByScore(windowKey, 0, now - windowMs);
+  await redis.zAdd(windowKey, { score: now, value: \`\${now}-\${Math.random()}\` });
+  await redis.pExpire(windowKey, windowMs);
+
+  const hits = await redis.zCard(windowKey);
 
   return {
     allowed: hits <= limit,
     remaining: Math.max(0, limit - hits),
-    resetAt: (bucket + 1) * windowMs,
+    resetAt: now + windowMs,
   };
 }`;

const RATE_LIMIT_TEST_PATCH = `@@ -0,0 +1,24 @@
+import { describe, expect, it } from "vitest";
+import { rateLimit } from "../rate-limit";
+
+describe("rateLimit", () => {
+  it("does not let a burst through at the window boundary", async () => {
+    const key = "boundary-test";
+
+    for (let i = 0; i < 5; i += 1) {
+      expect((await rateLimit(key, 5, 1_000)).allowed).toBe(true);
+    }
+
+    // The old fixed-window implementation reset here and allowed 5 more.
+    await advanceTo(999);
+    expect((await rateLimit(key, 5, 1_000)).allowed).toBe(false);
+  });
+
+  it("reports the remaining budget", async () => {
+    const result = await rateLimit("budget-test", 10, 60_000);
+    expect(result.remaining).toBe(9);
+  });
+});`;

const SESSION_PATCH = `@@ -1,6 +1,7 @@
 import { randomUUID } from "node:crypto";
 import { redis } from "./redis";
 
 const TTL_SECONDS = 60 * 30;
+const REFRESH_THRESHOLD_SECONDS = 60 * 5;
 
 export interface Session {
   id: string;
   userId: string;
   issuedAt: number;
 }
@@ -28,6 +29,12 @@
 export async function readSession(id: string): Promise<Session | null> {
   const raw = await redis.get(\`session:\${id}\`);
   if (!raw) return null;
-  return JSON.parse(raw) as Session;
+
+  const session = JSON.parse(raw) as Session;
+  const age = (Date.now() - session.issuedAt) / 1000;
+  if (TTL_SECONDS - age < REFRESH_THRESHOLD_SECONDS) {
+    await redis.expire(\`session:\${id}\`, TTL_SECONDS);
+  }
+  return session;
 }`;

const PAYMENTS_PATCH = `@@ -1,6 +1,8 @@
 const GATEWAY = process.env.PAYMENTS_URL ?? "https://gateway.internal";
+const RETRYABLE = new Set([408, 429, 502, 503, 504]);
+const MAX_ATTEMPTS = 3;
 
 export async function chargeCard(userId: string, amountCents: number) {
-  const response = await fetch(\`\${GATEWAY}/charges\`, {
-    method: "POST",
-    headers: { "content-type": "application/json" },
-    body: JSON.stringify({ userId, amountCents }),
-  });
-
-  if (!response.ok) {
-    throw new Error(\`Gateway responded \${response.status}\`);
-  }
-
-  return (await response.json()) as { chargeId: string };
+  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
+    const response = await fetch(\`\${GATEWAY}/charges\`, {
+      method: "POST",
+      headers: {
+        "content-type": "application/json",
+        // Makes the retry safe: the gateway collapses duplicate keys.
+        "idempotency-key": \`\${userId}:\${amountCents}:\${attempt === 1 ? Date.now() : "retry"}\`,
+      },
+      body: JSON.stringify({ userId, amountCents }),
+    });
+
+    if (response.ok) {
+      return (await response.json()) as { chargeId: string };
+    }
+
+    if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) {
+      throw new Error(\`Gateway responded \${response.status}\`);
+    }
+
+    await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 100));
+  }
+
+  throw new Error("unreachable");
 }`;

const README_PATCH = `@@ -1,9 +1,26 @@
 # checkout-service
 
 Handles cart checkout, payment authorisation and session validation.
 
+## Architecture
+
+    checkout.ts  ──▶  session.ts     (Redis-backed, 30 min TTL)
+                 ├─▶  rate-limit.ts  (sliding window, per user)
+                 └─▶  payments.ts    (gateway client, retries on 5xx)
+
+Every request path is asynchronous and assumes Redis is reachable; the
+service fails closed when it is not.
+
 ## Development
 
     npm install
     npm test
+
+## Environment
+
+| Variable       | Required | Purpose                        |
+| -------------- | -------- | ------------------------------ |
+| \`REDIS_URL\`    | yes      | Session and rate-limit store   |
+| \`PAYMENTS_URL\` | no       | Overrides the gateway base URL |`;

function bugRecipe(): Blueprint[] {
  return [
    reconnaissance("rateLimit|checkout"),
    readFile(
      "src/server/rate-limit.ts",
      "The reported symptom points at the limiter, so read it before theorising.",
    ),
    {
      title: "Reproduce the failure",
      rationale:
        "A fix without a reproduction is a guess. Drive the boundary case first.",
      tool: "shell",
      target: "npm run test -- rate-limit --reporter=verbatim",
      script: {
        logs: [
          out("$ npm run test -- rate-limit"),
          err("FAIL  src/server/__tests__/rate-limit.test.ts"),
          err("  × does not let a burst through at the window boundary"),
          err("    expected true to be false"),
          note("Reproduced: the fixed window resets mid-burst, so 2x the limit gets through."),
        ],
      },
    },
    {
      title: "Replace the fixed window with a sliding window",
      rationale:
        "A sorted set scoped to the trailing window removes the boundary entirely, rather than papering over it.",
      tool: "edit",
      target: "src/server/rate-limit.ts",
      script: {
        logs: [
          out("Applied patch to src/server/rate-limit.ts"),
          note("Kept the RateLimitResult shape so no caller needs to change."),
        ],
        diff: makeDiff("src/server/rate-limit.ts", RATE_LIMIT_PATCH),
      },
    },
    {
      title: "Add a regression test for the boundary",
      rationale:
        "Pin the exact case that was broken so it cannot silently come back.",
      tool: "edit",
      target: "src/server/__tests__/rate-limit.test.ts",
      script: {
        logs: [out("Created src/server/__tests__/rate-limit.test.ts")],
        diff: makeDiff("src/server/__tests__/rate-limit.test.ts", RATE_LIMIT_TEST_PATCH),
      },
    },
    runTests("npm test", [
      out("✓ src/server/__tests__/rate-limit.test.ts (2)"),
    ]),
    verifyInBrowser("/checkout"),
  ];
}

function featureRecipe(): Blueprint[] {
  return [
    reconnaissance("chargeCard|checkout"),
    readFile(
      "src/server/payments.ts",
      "The new behaviour lives in the gateway client; read the current contract first.",
    ),
    {
      title: "Add idempotent retries to the gateway client",
      rationale:
        "Retrying without an idempotency key risks double charges, so the two land together.",
      tool: "edit",
      target: "src/server/payments.ts",
      script: {
        logs: [
          out("Applied patch to src/server/payments.ts"),
          note("Backoff is exponential and capped at three attempts."),
        ],
        diff: makeDiff("src/server/payments.ts", PAYMENTS_PATCH),
      },
    },
    {
      title: "Refresh sessions that are about to expire",
      rationale:
        "A retry can outlive the session TTL; sliding the expiry keeps long checkouts alive.",
      tool: "edit",
      target: "src/server/session.ts",
      script: {
        logs: [out("Applied patch to src/server/session.ts")],
        diff: makeDiff("src/server/session.ts", SESSION_PATCH),
      },
    },
    runTests("npm test"),
    verifyInBrowser("/checkout"),
  ];
}

function refactorRecipe(): Blueprint[] {
  return [
    reconnaissance("export async function"),
    readFile("src/server/checkout.ts", "The orchestration layer is where the coupling shows."),
    {
      title: "Extract the retry policy from the gateway client",
      rationale:
        "Retry logic and transport concerns change for different reasons; separating them keeps both testable.",
      tool: "edit",
      target: "src/server/payments.ts",
      script: {
        logs: [
          out("Applied patch to src/server/payments.ts"),
          note("No behaviour change intended — the suite is the proof."),
        ],
        diff: makeDiff("src/server/payments.ts", PAYMENTS_PATCH),
      },
    },
    runTests("npm test"),
    {
      title: "Confirm the public surface is unchanged",
      rationale: "A refactor that alters exports is not a refactor.",
      tool: "shell",
      target: "npx tsc --noEmit && git diff --stat",
      script: {
        logs: [
          out("$ npx tsc --noEmit"),
          out("$ git diff --stat"),
          out(" src/server/payments.ts | 28 ++++++++++++++++++++------"),
          out(" 1 file changed, 22 insertions(+), 6 deletions(-)"),
          note("Exports identical; only the internals moved."),
        ],
      },
    },
  ];
}

function testRecipe(): Blueprint[] {
  return [
    reconnaissance("describe\\(|it\\("),
    readFile("src/server/rate-limit.ts", "Coverage gaps are easiest to see against the implementation."),
    {
      title: "Cover the untested boundary case",
      rationale:
        "The window boundary is the only branch with no assertion behind it.",
      tool: "edit",
      target: "src/server/__tests__/rate-limit.test.ts",
      script: {
        logs: [out("Created src/server/__tests__/rate-limit.test.ts")],
        diff: makeDiff("src/server/__tests__/rate-limit.test.ts", RATE_LIMIT_TEST_PATCH),
      },
    },
    runTests("npm test -- --coverage", [
      out("✓ src/server/__tests__/rate-limit.test.ts (2)"),
      out("% Coverage  src/server/rate-limit.ts   72% → 100%"),
    ]),
  ];
}

function performanceRecipe(): Blueprint[] {
  return [
    {
      title: "Measure before changing anything",
      rationale:
        "Optimising without a baseline is guesswork; capture the current numbers first.",
      tool: "shell",
      target: "npx autocannon -d 20 http://localhost:3000/checkout",
      script: {
        logs: [
          out("$ npx autocannon -d 20 http://localhost:3000/checkout"),
          out("Latency   p50 41ms   p95 210ms   p99 505ms"),
          out("Req/Sec   1.2k"),
          note("p99 is dominated by Redis round trips in the limiter."),
        ],
      },
    },
    readFile("src/server/rate-limit.ts", "The profile points here; confirm why it is slow."),
    {
      title: "Collapse the limiter into a single round trip",
      rationale:
        "Three sequential Redis calls per request is the cost; a sorted set with a pipelined expiry removes two.",
      tool: "edit",
      target: "src/server/rate-limit.ts",
      script: {
        logs: [out("Applied patch to src/server/rate-limit.ts")],
        diff: makeDiff("src/server/rate-limit.ts", RATE_LIMIT_PATCH),
      },
    },
    runTests("npm test"),
    {
      title: "Re-measure and compare",
      rationale: "The only proof an optimisation worked is the same benchmark, again.",
      tool: "shell",
      target: "npx autocannon -d 20 http://localhost:3000/checkout",
      script: {
        logs: [
          out("Latency   p50 18ms   p95 74ms   p99 121ms"),
          out("Req/Sec   2.9k"),
          note("p99 down 76%; throughput up 2.4x."),
        ],
      },
    },
  ];
}

function securityRecipe(): Blueprint[] {
  return [
    reconnaissance("rateLimit|session|token"),
    readFile("src/server/rate-limit.ts", "Abuse protection is the stated concern; start at the limiter."),
    {
      title: "Close the burst window in the limiter",
      rationale:
        "The fixed window lets an attacker send 2x the limit by straddling the boundary.",
      tool: "edit",
      target: "src/server/rate-limit.ts",
      script: {
        logs: [
          out("Applied patch to src/server/rate-limit.ts"),
          note("Sliding window removes the amplification entirely."),
        ],
        diff: makeDiff("src/server/rate-limit.ts", RATE_LIMIT_PATCH),
      },
    },
    {
      title: "Stop sessions from outliving their TTL silently",
      rationale:
        "Refreshing on read makes expiry explicit instead of dependent on request timing.",
      tool: "edit",
      target: "src/server/session.ts",
      script: {
        logs: [out("Applied patch to src/server/session.ts")],
        diff: makeDiff("src/server/session.ts", SESSION_PATCH),
      },
    },
    runTests("npm test"),
    verifyInBrowser("/checkout"),
  ];
}

function docsRecipe(): Blueprint[] {
  return [
    reconnaissance("process.env"),
    readFile("README.md", "Document what the code actually does, not what it should do."),
    {
      title: "Document the request path and environment",
      rationale:
        "The two things a new contributor asks first: how a request flows, and what to set.",
      tool: "edit",
      target: "README.md",
      script: {
        logs: [
          out("Applied patch to README.md"),
          note("Every variable listed was read out of the source, not invented."),
        ],
        diff: makeDiff("README.md", README_PATCH),
      },
    },
    {
      title: "Check the documented commands actually run",
      rationale: "Documentation that has never been executed is a liability.",
      tool: "shell",
      target: "npm install --dry-run && npm test",
      script: {
        logs: [
          out("$ npm test"),
          out("Test Files  12 passed (12)"),
          note("Both documented commands succeed on a clean checkout."),
        ],
      },
    },
  ];
}

const RECIPES: Record<Intent, () => Blueprint[]> = {
  bug: bugRecipe,
  feature: featureRecipe,
  refactor: refactorRecipe,
  test: testRecipe,
  performance: performanceRecipe,
  security: securityRecipe,
  docs: docsRecipe,
};

const SUMMARIES: Record<Intent, string> = {
  bug: "Reproduce the failure, fix the root cause in the limiter, and pin it with a regression test.",
  feature: "Extend the gateway client with idempotent retries and keep sessions alive across them.",
  refactor: "Separate the retry policy from the transport layer without changing the public surface.",
  test: "Close the coverage gap on the branch that has no assertion behind it.",
  performance: "Benchmark, remove the redundant Redis round trips, then benchmark again.",
  security: "Remove the rate-limit amplification and make session expiry explicit.",
  docs: "Describe the real request path and every environment variable the code reads.",
};

/** Derives a short, human session title from a free-text objective. */
export function titleFor(objective: string): string {
  const cleaned = objective.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return "Untitled task";
  const firstSentence = cleaned.split(/[.!?\n]/)[0] ?? cleaned;
  const title = firstSentence.length > 62 ? `${firstSentence.slice(0, 59)}…` : firstSentence;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function createPlan(objective: string, intent = classify(objective)): PlanDraft {
  const blueprints = RECIPES[intent]();
  const scripts = new Map<string, StepScript>();

  const steps: Step[] = blueprints.map((blueprint, i) => {
    const id = createId("step");
    scripts.set(id, blueprint.script);
    return {
      id,
      index: i + 1,
      title: blueprint.title,
      rationale: blueprint.rationale,
      tool: blueprint.tool,
      target: blueprint.target,
      state: "pending",
      logs: [],
    };
  });

  return {
    plan: {
      objective,
      source: "heuristic",
      summary: SUMMARIES[intent],
      steps,
    },
    scripts,
  };
}
