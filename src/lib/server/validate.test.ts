import { describe, expect, it } from "vitest";
import {
  MAX_OBJECTIVE_LENGTH,
  MIN_OBJECTIVE_LENGTH,
  validateObjective,
} from "./validate";

describe("validateObjective", () => {
  it("accepts a normal objective and collapses whitespace", () => {
    const result = validateObjective("  Fix   the    limiter  ");
    expect(result).toEqual({ ok: true, objective: "Fix the limiter" });
  });

  it.each([undefined, null, 42, {}, []])("rejects %j", (input) => {
    expect(validateObjective(input).ok).toBe(false);
  });

  it("rejects an objective that is too short", () => {
    expect(validateObjective("a".repeat(MIN_OBJECTIVE_LENGTH - 1)).ok).toBe(false);
  });

  it("rejects an objective that is too long", () => {
    expect(validateObjective("a".repeat(MAX_OBJECTIVE_LENGTH + 1)).ok).toBe(false);
  });

  it("accepts the exact boundary lengths", () => {
    expect(validateObjective("a".repeat(MIN_OBJECTIVE_LENGTH)).ok).toBe(true);
    expect(validateObjective("a".repeat(MAX_OBJECTIVE_LENGTH)).ok).toBe(true);
  });

  it("strips control characters that would split an SSE frame", () => {
    const newline = String.fromCharCode(10);
    const tab = String.fromCharCode(9);
    const raw = `fix the${newline}${newline}limiter${tab}now`;

    expect(validateObjective(raw)).toEqual({
      ok: true,
      objective: "fix the limiter now",
    });
  });
});
