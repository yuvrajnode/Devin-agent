import { describe, expect, it } from "vitest";
import { collectRun, runAgent } from "./engine";
import { createPlan } from "./planner";
import { applyAll } from "./reduce";
import { emptySession } from "./reduce";
import type { AgentEvent } from "./types";

const OBJECTIVE = "Fix the rate limiter letting bursts through";

function typesOf(events: AgentEvent[]): string[] {
  return events.map((event) => event.type);
}

describe("runAgent", () => {
  it("emits a plan before any step and finishes exactly once", async () => {
    const events = await collectRun(OBJECTIVE);
    const types = typesOf(events);

    const planIndex = types.indexOf("plan.created");
    const firstStep = types.indexOf("step.started");

    expect(planIndex).toBeGreaterThanOrEqual(0);
    expect(firstStep).toBeGreaterThan(planIndex);
    expect(types.filter((type) => type === "run.finished")).toHaveLength(1);
    expect(events.at(-1)).toEqual({ type: "run.finished", state: "done" });
  });

  it("starts and finishes every planned step, in order", async () => {
    const events = await collectRun(OBJECTIVE);
    const plan = events.find((event) => event.type === "plan.created");
    if (plan?.type !== "plan.created") throw new Error("no plan emitted");

    const started = events
      .filter((event) => event.type === "step.started")
      .map((event) => event.stepId);
    const finished = events
      .filter((event) => event.type === "step.finished")
      .map((event) => event.stepId);

    expect(started).toEqual(plan.plan.steps.map((step) => step.id));
    expect(finished).toEqual(started);
  });

  it("never emits output for a step that has not started", async () => {
    const events = await collectRun(OBJECTIVE);
    const open = new Set<string>();

    for (const event of events) {
      if (event.type === "step.started") open.add(event.stepId);
      if (event.type === "step.log" || event.type === "step.diff") {
        expect(open.has(event.stepId)).toBe(true);
      }
      if (event.type === "step.finished") open.delete(event.stepId);
    }
  });

  it("reports positive durations", async () => {
    const events = await collectRun(OBJECTIVE);
    for (const event of events) {
      if (event.type === "step.finished") {
        expect(event.durationMs).toBeGreaterThan(0);
      }
    }
  });

  it("stops cleanly when aborted and reports blocked", async () => {
    const controller = new AbortController();
    const events: AgentEvent[] = [];

    for await (const event of runAgent(OBJECTIVE, {
      speed: 0,
      signal: controller.signal,
    })) {
      events.push(event);
      if (event.type === "step.started") controller.abort();
    }

    expect(events.at(-1)).toEqual({ type: "run.finished", state: "blocked" });
    expect(typesOf(events).filter((type) => type === "run.finished")).toHaveLength(1);
  });

  it("honours a pre-built plan draft", async () => {
    const draft = createPlan("Document the request path");
    const events = await collectRun("something else entirely", { draft });

    const plan = events.find((event) => event.type === "plan.created");
    if (plan?.type !== "plan.created") throw new Error("no plan emitted");
    expect(plan.plan.steps.map((step) => step.title)).toEqual(
      draft.plan.steps.map((step) => step.title),
    );
  });

  it("applies to a session that ends complete and fully populated", async () => {
    const events = await collectRun(OBJECTIVE);
    const session = applyAll(emptySession(OBJECTIVE, "t", "repo"), events);

    expect(session.state).toBe("done");
    expect(session.plan).not.toBeNull();
    expect(session.plan?.steps.every((step) => step.state === "done")).toBe(true);
    expect(session.plan?.steps.some((step) => step.logs.length > 0)).toBe(true);
    expect(session.messages.length).toBeGreaterThan(0);
  });
});
