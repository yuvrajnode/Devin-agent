import { describe, expect, it } from "vitest";
import { applyAll, applyEvent, emptySession } from "./reduce";
import { createPlan } from "./planner";
import { changeset, planProgress } from "./types";
import type { AgentEvent } from "./types";

function seeded() {
  const session = emptySession("Fix the limiter", "Fix the limiter", "acme/repo@main");
  const { plan } = createPlan("Fix the broken rate limiter");
  return { session: applyEvent(session, { type: "plan.created", plan }), plan };
}

describe("applyEvent", () => {
  it("leaves the input untouched", () => {
    const { session, plan } = seeded();
    const before = JSON.stringify(session);
    const stepId = plan.steps[0]!.id;

    applyEvent(session, { type: "step.started", stepId });

    expect(JSON.stringify(session)).toBe(before);
  });

  it("ignores step events for an unknown step", () => {
    const { session } = seeded();
    const next = applyEvent(session, { type: "step.started", stepId: "nope" });
    expect(next.plan?.steps.every((step) => step.state === "pending")).toBe(true);
  });

  it("ignores step events before a plan exists", () => {
    const session = emptySession("x", "x", "r");
    const next = applyEvent(session, { type: "step.started", stepId: "any" });
    expect(next.plan).toBeNull();
  });

  it("appends logs in order", () => {
    const { session, plan } = seeded();
    const stepId = plan.steps[0]!.id;

    const next = applyAll(session, [
      { type: "step.log", stepId, line: { level: "out", text: "first" } },
      { type: "step.log", stepId, line: { level: "err", text: "second" } },
    ]);

    expect(next.plan?.steps[0]?.logs.map((line) => line.text)).toEqual([
      "first",
      "second",
    ]);
  });

  it("records a terminal state and a finish time", () => {
    const { session } = seeded();
    const next = applyEvent(session, { type: "run.finished", state: "done" });

    expect(next.state).toBe("done");
    expect(next.finishedAt).toBeTypeOf("number");
  });

  it("turns an error event into a failed run with an explanation", () => {
    const { session } = seeded();
    const next = applyEvent(session, { type: "error", message: "gateway down" });

    expect(next.state).toBe("failed");
    expect(next.messages.at(-1)?.text).toContain("gateway down");
  });
});

describe("derived selectors", () => {
  it("counts progress across done and skipped steps", () => {
    const { session, plan } = seeded();
    const events: AgentEvent[] = [
      { type: "step.finished", stepId: plan.steps[0]!.id, state: "done", durationMs: 10 },
      { type: "step.finished", stepId: plan.steps[1]!.id, state: "skipped", durationMs: 5 },
    ];

    const next = applyAll(session, events);
    expect(planProgress(next.plan)).toEqual({ done: 2, total: plan.steps.length });
  });

  it("reports no progress for a session with no plan", () => {
    expect(planProgress(null)).toEqual({ done: 0, total: 0 });
  });

  it("collects the changeset in step order", () => {
    const { session, plan } = seeded();
    const stepId = plan.steps.at(-1)!.id;

    const next = applyEvent(session, {
      type: "step.diff",
      stepId,
      diff: { path: "a.ts", additions: 2, deletions: 1, body: "+a" },
    });

    expect(changeset(next.plan).map((hunk) => hunk.path)).toEqual(["a.ts"]);
    expect(changeset(null)).toEqual([]);
  });
});
