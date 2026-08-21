import type { DiffHunk } from "./types";

/**
 * A small in-memory checkout the agent operates on.
 *
 * The demo runs without a container, so the "repository" is a fixed tree of
 * realistic source files. Edits are applied to this map, which means the
 * editor pane, the diff pane and the changeset all read from one source of
 * truth rather than from separately faked data.
 */
export interface RepoFile {
  path: string;
  language: "ts" | "tsx" | "json" | "md" | "css";
  content: string;
}

export const REPO_NAME = "acme/checkout-service";
export const REPO_BRANCH = "main";

const FILES: RepoFile[] = [
  {
    path: "src/server/session.ts",
    language: "ts",
    content: `import { randomUUID } from "node:crypto";
import { redis } from "./redis";

const TTL_SECONDS = 60 * 30;

export interface Session {
  id: string;
  userId: string;
  issuedAt: number;
}

export async function createSession(userId: string): Promise<Session> {
  const session: Session = {
    id: randomUUID(),
    userId,
    issuedAt: Date.now(),
  };

  await redis.set(\`session:\${session.id}\`, JSON.stringify(session), {
    EX: TTL_SECONDS,
  });

  return session;
}

export async function readSession(id: string): Promise<Session | null> {
  const raw = await redis.get(\`session:\${id}\`);
  if (!raw) return null;
  return JSON.parse(raw) as Session;
}
`,
  },
  {
    path: "src/server/rate-limit.ts",
    language: "ts",
    content: `import { redis } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Fixed-window counter. Simple, but every window boundary lets through
 * up to 2x the configured limit.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const bucket = Math.floor(Date.now() / windowMs);
  const counterKey = \`rl:\${key}:\${bucket}\`;

  const hits = await redis.incr(counterKey);
  if (hits === 1) {
    await redis.pexpire(counterKey, windowMs);
  }

  return {
    allowed: hits <= limit,
    remaining: Math.max(0, limit - hits),
    resetAt: (bucket + 1) * windowMs,
  };
}
`,
  },
  {
    path: "src/server/checkout.ts",
    language: "ts",
    content: `import { rateLimit } from "./rate-limit";
import { readSession } from "./session";
import { chargeCard } from "./payments";

export async function checkout(sessionId: string, amountCents: number) {
  const session = await readSession(sessionId);
  if (!session) {
    throw new Error("Session expired");
  }

  const limit = await rateLimit(\`checkout:\${session.userId}\`, 5, 60_000);
  if (!limit.allowed) {
    throw new Error("Too many attempts");
  }

  return chargeCard(session.userId, amountCents);
}
`,
  },
  {
    path: "src/server/payments.ts",
    language: "ts",
    content: `const GATEWAY = process.env.PAYMENTS_URL ?? "https://gateway.internal";

export async function chargeCard(userId: string, amountCents: number) {
  const response = await fetch(\`\${GATEWAY}/charges\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, amountCents }),
  });

  if (!response.ok) {
    throw new Error(\`Gateway responded \${response.status}\`);
  }

  return (await response.json()) as { chargeId: string };
}
`,
  },
  {
    path: "src/server/redis.ts",
    language: "ts",
    content: `import { createClient } from "redis";

export const redis = createClient({ url: process.env.REDIS_URL });

await redis.connect();
`,
  },
  {
    path: "package.json",
    language: "json",
    content: `{
  "name": "checkout-service",
  "version": "2.4.1",
  "scripts": {
    "test": "vitest run",
    "build": "tsc -p tsconfig.json"
  }
}
`,
  },
  {
    path: "README.md",
    language: "md",
    content: `# checkout-service

Handles cart checkout, payment authorisation and session validation.

## Development

    npm install
    npm test
`,
  },
];

export function repoFiles(): RepoFile[] {
  return FILES.map((file) => ({ ...file }));
}

export function findFile(path: string): RepoFile | undefined {
  const match = FILES.find((file) => file.path === path);
  return match ? { ...match } : undefined;
}

/** Counts `+`/`-` lines in a unified diff body. */
export function countDiffLines(body: string): {
  additions: number;
  deletions: number;
} {
  let additions = 0;
  let deletions = 0;
  for (const line of body.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions += 1;
  }
  return { additions, deletions };
}

export function makeDiff(path: string, body: string): DiffHunk {
  const { additions, deletions } = countDiffLines(body);
  return { path, additions, deletions, body };
}
