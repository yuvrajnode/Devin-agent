import { describe, expect, it } from "vitest";
import { classify, createPlan, titleFor } from "./planner";
import { TOOLS } from "./types";

const TOOL_NAMES = new Set(TOOLS.map((tool) => tool.name));

describe("classify", () => {
  it.each([
    ["Fix the crash when a session expires mid-checkout", "bug"],
    ["Add an endpoint for partial refunds", "feature"],
    ["Refactor the gateway client to extract the retry policy", "refactor"],
    ["Improve test coverage for the limiter", "test"],
    ["Checkout is slow, reduce p99 latency", "performance"],
    ["Harden the rate limit against abuse", "security"],
    ["Document the environment variables in the readme", "docs"],
  ] as const)("maps %j to %s", (objective, expected) => {
    expect(classify(objective)).toBe(expected);
  });

  it("falls back to feature for an objective it does not recognise", () => {
    expect(classify("qqq zzz")).toBe("feature");
  });

  it("is case insensitive", () => {
    expect(classify("FIX THE BROKEN LIMITER")).toBe(classify("fix the broken limiter"));
  });
});

describe("createPlan", () => {
  it("produces a plan for every intent with well-formed steps", () => {
    const objectives = [
      "Fix the broken rate limiter",
      "Add retries to the payment gateway",
      "Refactor the retry policy out of the client",
      "Add tests for the limiter boundary",
      "Reduce checkout latency",
      "Close the rate limit security hole",
      "Document the request path",
    ];

    for (const objective of objectives) {
      const { plan, scripts } = createPlan(objective);

      expect(plan.objective).toBe(objective);
      expect(plan.source).toBe("heuristic");
      expect(plan.summary.length).toBeGreaterThan(0);
      expect(plan.steps.length).toBeGreaterThanOrEqual(4);
      expect(plan.steps.length).toBeLessThanOrEqual(7);

      plan.steps.forEach((step, i) => {
        expect(step.index).toBe(i + 1);
        expect(step.state).toBe("pending");
        expect(step.logs).toEqual([]);
        expect(TOOL_NAMES.has(step.tool)).toBe(true);
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.rationale.length).toBeGreaterThan(0);
        expect(step.target.length).toBeGreaterThan(0);
        expect(scripts.has(step.id)).toBe(true);
      });
    }
  });

  it("gives every step a unique id across plans", () => {
    const first = createPlan("Fix the limiter");
    const second = createPlan("Fix the limiter");
    const ids = [...first.plan.steps, ...second.plan.steps].map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reports diff line counts that match the patch body", () => {
    const { plan, scripts } = createPlan("Fix the broken rate limiter");

    for (const step of plan.steps) {
      const diff = scripts.get(step.id)?.diff;
      if (!diff) continue;

      const lines = diff.body.split("\n");
      const additions = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
      const deletions = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length;

      expect(diff.additions).toBe(additions);
      expect(diff.deletions).toBe(deletions);
      expect(diff.additions + diff.deletions).toBeGreaterThan(0);
    }
  });

  it("plans a bug fix that reproduces before it edits", () => {
    const { plan } = createPlan("Fix the bug where bursts get through");
    const reproduce = plan.steps.findIndex((step) => /reproduce/i.test(step.title));
    const edit = plan.steps.findIndex((step) => step.tool === "edit");

    expect(reproduce).toBeGreaterThanOrEqual(0);
    expect(edit).toBeGreaterThan(reproduce);
  });
});

describe("titleFor", () => {
  it("takes the first sentence and capitalises it", () => {
    expect(titleFor("fix the limiter. then ship it")).toBe("Fix the limiter");
  });

  it("truncates a long objective", () => {
    const title = titleFor("a".repeat(200));
    expect(title.length).toBeLessThanOrEqual(62);
    expect(title.endsWith("…")).toBe(true);
  });

  it("handles an empty objective", () => {
    expect(titleFor("   ")).toBe("Untitled task");
  });
});
