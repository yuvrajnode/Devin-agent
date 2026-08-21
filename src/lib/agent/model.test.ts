import { describe, expect, it } from "vitest";
import { parseModelPlan } from "./model";

const VALID_STEP = {
  title: "Read the limiter",
  rationale: "Understand it before changing it.",
  tool: "read",
  target: "src/server/rate-limit.ts",
  output: ["Loaded 32 lines"],
};

describe("parseModelPlan", () => {
  it("accepts a well-formed plan", () => {
    const parsed = parseModelPlan({
      summary: "Fix the limiter.",
      steps: [VALID_STEP, { ...VALID_STEP, title: "Patch it", tool: "edit" }],
    });

    expect(parsed?.steps).toHaveLength(2);
    expect(parsed?.steps[0]?.tool).toBe("read");
  });

  it.each([null, undefined, "a string", 42, [], {}])("rejects %j", (input) => {
    expect(parseModelPlan(input)).toBeNull();
  });

  it("rejects a plan with fewer than two usable steps", () => {
    expect(parseModelPlan({ summary: "x", steps: [VALID_STEP] })).toBeNull();
  });

  it("drops steps naming a tool that does not exist", () => {
    const parsed = parseModelPlan({
      summary: "Fix it.",
      steps: [VALID_STEP, VALID_STEP, { ...VALID_STEP, tool: "rm -rf" }],
    });

    expect(parsed?.steps).toHaveLength(2);
  });

  it("drops steps missing a required field", () => {
    const parsed = parseModelPlan({
      summary: "Fix it.",
      steps: [VALID_STEP, VALID_STEP, { ...VALID_STEP, target: "   " }],
    });

    expect(parsed?.steps).toHaveLength(2);
  });

  it("caps the number of steps and the length of every field", () => {
    const parsed = parseModelPlan({
      summary: "s".repeat(1000),
      steps: Array.from({ length: 30 }, () => ({
        ...VALID_STEP,
        title: "t".repeat(1000),
        output: Array.from({ length: 40 }, () => "o".repeat(1000)),
      })),
    });

    expect(parsed?.summary.length).toBeLessThanOrEqual(240);
    expect(parsed?.steps.length).toBeLessThanOrEqual(8);
    expect(parsed?.steps[0]?.title.length).toBeLessThanOrEqual(80);
    expect(parsed?.steps[0]?.output.length).toBeLessThanOrEqual(6);
    expect(parsed?.steps[0]?.output[0]?.length).toBeLessThanOrEqual(160);
  });

  it("tolerates a missing or malformed output array", () => {
    const parsed = parseModelPlan({
      summary: "Fix it.",
      steps: [
        { ...VALID_STEP, output: undefined },
        { ...VALID_STEP, output: [1, 2, null] },
      ],
    });

    expect(parsed?.steps).toHaveLength(2);
    expect(parsed?.steps[0]?.output).toEqual([]);
    expect(parsed?.steps[1]?.output).toEqual([]);
  });
});
