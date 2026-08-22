# Devin

An autonomous software-engineering agent: it turns an objective into an
ordered plan, executes each step against a checked-out service, and hands back
a reviewable diff with the reasoning for every step still attached.

The whole product runs with **no credentials and no external services**. An
`ANTHROPIC_API_KEY` upgrades the planning stage to a live model; nothing else
changes.

```
npm install
npm run dev        # http://localhost:3000
```

---

## What it actually does

The agent operates on `acme/checkout-service`, a five-file TypeScript service
that ships with a real bug: its rate limiter uses a fixed window, so an
attacker straddling the window boundary gets through at twice the configured
limit. Ask for the fix and the agent reproduces it, patches it, pins it with a
regression test, and shows you the diff.

| Stage | What happens |
| --- | --- |
| Classify | The objective is scored against seven intent vocabularies — bug, feature, refactor, test, performance, security, docs. The highest score selects a recipe. |
| Plan | The recipe expands into four to seven ordered steps. Each carries one tool, the file or command it acts on, and why the planner included it. |
| Execute | The engine walks the plan as an async generator, emitting output, patches and timings as Server-Sent Events. |
| Review | Patches collect into one changeset, attributed to the step that produced it. |

## Architecture

```
browser                                    server
────────                                  ────────
Composer ───────── POST /api/run ────────▶ validate + rate limit
                                                   │
                                                   ▼
                                           planner ├─ heuristic  (default)
                                                   └─ model      (ANTHROPIC_API_KEY)
                                                   │
                                                   ▼
                                           engine — async generator
                                                   │  yields AgentEvent
Stream reader ◀──── text/event-stream ─────────────┘
      │
      ▼
  reduce() ──▶ Session ──▶ plan · terminal · diff · chat
```

Three decisions shape everything else:

**The engine is an async generator.** Back-pressure is free — a slow client
slows production instead of filling a buffer — and a test can drain an entire
run synchronously by passing `speed: 0`. Aborting the request cancels the run
rather than leaving it producing into a dead socket.

**The UI is a projection of the event stream.** One pure reducer
(`src/lib/agent/reduce.ts`) folds `AgentEvent`s into a `Session`, and the
browser and the test suite both use it. The UI cannot show something the
engine did not emit. Its default branch is typed `never`, so a new event
variant cannot be added without being handled.

**Planning is pluggable, and failure is a degradation.** The heuristic planner
and the model planner return the same `PlanDraft`. A missing key, a network
error, a rate limit or a malformed response all fall back to the heuristic
planner — the product never goes down because planning did.

## Layout

```
src/
  app/
    page.tsx                  landing page
    workspace/page.tsx        the agent workspace
    api/run/route.ts          SSE endpoint
    api/health/route.ts       liveness probe
  lib/
    agent/
      types.ts                domain model and the AgentEvent union
      planner.ts              intent classification and recipes
      model.ts                optional live planner + response validation
      engine.ts               paced event generator
      reduce.ts               pure event -> session reducer
      repo.ts                 the in-memory checkout
      stream-client.ts        SSE reader
    server/
      validate.ts             objective validation
      rate-limit.ts           per-instance sliding window
    store.ts                  persisted session store
  components/
    ui/                       primitives
    site/                     landing page
    workspace/                the workspace panes
```

## Configuration

Every variable is optional. Copy `.env.example` to `.env.local` to set any.

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | unset | Enables the live-model planner. Without it the heuristic planner runs. |
| `ANTHROPIC_MODEL` | `claude-opus-5` | Overrides the planning model. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical origin used by metadata, `robots.txt` and `sitemap.xml`. |

`GET /api/health` reports which planner is active.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit`, strict, with `noUncheckedIndexedAccess` |
| `npm run lint` | ESLint, zero warnings tolerated |
| `npm test` | Vitest |
| `npm run verify` | All four, in the order CI runs them |

## Testing

61 tests cover the parts where a bug would be invisible in the UI. Beyond the
happy paths they pin the invariants that make the interface trustworthy:

- the engine never emits output for a step it has not started, never finishes
  a run twice, and always reports a plan before the first step;
- the reducer never mutates its input and ignores events for unknown steps;
- the rate limiter does not let a burst through at the window boundary — the
  same regression the demo agent writes for `checkout-service`;
- the model-plan validator is tested against malformed, oversized and hostile
  responses, not just valid ones.

```
npm test
```

## Deployment

**Vercel** — import the repository. No configuration is required; the app
works with an empty environment. `vercel.json` raises the run route's duration
cap because a streamed run outlives a default invocation.

**Docker** — the image builds from the standalone bundle, runs as a non-root
user and health-checks itself:

```
docker build -t devin .
docker run -p 3000:3000 devin
```

**Anywhere else** — `npm run build && npm start`. Node 20.9 or newer.

## Notes on scope

The sandbox is simulated. Steps replay realistic output and patches instead of
running a container, because the point of the project is the agent
architecture — planning, event sourcing, streaming, and a reviewable
changeset — not the sandbox itself. Every seam a real runtime would plug into
is a real seam: `RunOptions.draft` accepts an externally produced plan, and
`StepScript` is where a live tool result would arrive.

## Licence

MIT — see [LICENSE](./LICENSE).
