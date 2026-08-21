import { createPlan, type PlanDraft, type StepScript } from "./planner";
import type { AgentEvent, LogLine, Step } from "./types";

/**
 * Turns a plan into a paced stream of events.
 *
 * The engine is an async generator rather than a callback emitter for two
 * reasons: back-pressure comes for free (a slow SSE client slows the
 * generator instead of buffering), and tests can drain a whole run
 * synchronously by injecting a no-op `sleep`.
 */

export interface RunOptions {
  /** Cancels the run between events. */
  signal?: AbortSignal;
  /**
   * Multiplies every delay. 0 removes pacing entirely, which is what the
   * tests use; the UI runs at 1.
   */
  speed?: number;
  /** Injected for deterministic tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Pre-built plan, e.g. one returned by the model planner. */
  draft?: PlanDraft;
}

const PLANNING_MS = 900;
const STEP_START_MS = 260;
const LOG_LINE_MS = 180;
const STEP_SETTLE_MS = 240;

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

class Cancelled extends Error {
  constructor() {
    super("Run cancelled");
    this.name = "Cancelled";
  }
}

/**
 * How long a step is reported to have taken. Derived from the work it did
 * rather than from wall-clock time, so the number is stable regardless of how
 * fast the stream was replayed.
 */
export function estimateDuration(script: StepScript, step: Step): number {
  const base = step.tool === "test" || step.tool === "shell" ? 1400 : 420;
  const perLog = script.logs.length * 190;
  const perDiff = script.diff ? (script.diff.additions + script.diff.deletions) * 12 : 0;
  return base + perLog + perDiff;
}

export async function* runAgent(
  objective: string,
  options: RunOptions = {},
): AsyncGenerator<AgentEvent> {
  const { signal, speed = 1, sleep = defaultSleep } = options;

  const pause = async (ms: number) => {
    if (signal?.aborted) throw new Cancelled();
    if (speed > 0 && ms > 0) await sleep(ms * speed);
    if (signal?.aborted) throw new Cancelled();
  };

  try {
    yield { type: "run.state", state: "planning" };
    yield {
      type: "message",
      role: "agent",
      text: `Reading the objective and sketching an approach for: "${objective.trim()}".`,
    };

    await pause(PLANNING_MS);

    const draft = options.draft ?? createPlan(objective);
    const { plan, scripts } = draft;

    yield { type: "plan.created", plan };
    yield {
      type: "message",
      role: "agent",
      text: `${plan.summary} ${plan.steps.length} steps queued.`,
    };

    yield { type: "run.state", state: "running" };

    for (const step of plan.steps) {
      const script = scripts.get(step.id) ?? { logs: [] as LogLine[] };

      await pause(STEP_START_MS);
      yield { type: "step.started", stepId: step.id };

      for (const line of script.logs) {
        await pause(LOG_LINE_MS);
        yield { type: "step.log", stepId: step.id, line };
      }

      if (script.diff) {
        await pause(LOG_LINE_MS);
        yield { type: "step.diff", stepId: step.id, diff: script.diff };
      }

      await pause(STEP_SETTLE_MS);

      if (script.failure) {
        yield {
          type: "step.finished",
          stepId: step.id,
          state: "failed",
          durationMs: estimateDuration(script, step),
        };
        yield { type: "message", role: "agent", text: script.failure };
        yield { type: "run.finished", state: "failed" };
        return;
      }

      yield {
        type: "step.finished",
        stepId: step.id,
        state: "done",
        durationMs: estimateDuration(script, step),
      };
    }

    const edits = plan.steps.filter((step) => scripts.get(step.id)?.diff).length;
    yield {
      type: "message",
      role: "agent",
      text:
        edits > 0
          ? `Done. ${edits} file${edits === 1 ? "" : "s"} changed and the suite is green — the changeset is ready for review.`
          : "Done. No files needed changing; the findings are in the step log.",
    };
    yield { type: "run.finished", state: "done" };
  } catch (error) {
    if (error instanceof Cancelled || signal?.aborted) {
      yield { type: "message", role: "agent", text: "Run stopped by the operator." };
      yield { type: "run.finished", state: "blocked" };
      return;
    }
    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Unknown engine failure",
    };
    yield { type: "run.finished", state: "failed" };
  }
}

/** Drains a run to completion. Used by tests and by the non-streaming API. */
export async function collectRun(
  objective: string,
  options: RunOptions = {},
): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of runAgent(objective, { speed: 0, ...options })) {
    events.push(event);
  }
  return events;
}
