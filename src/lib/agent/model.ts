import Anthropic from "@anthropic-ai/sdk";
import { createId } from "./id";
import { createPlan, type PlanDraft, type StepScript } from "./planner";
import type { LogLine, Step, ToolName } from "./types";

/**
 * Optional live planner.
 *
 * The product is fully functional without credentials — `createPlan` in
 * `planner.ts` is the default. When ANTHROPIC_API_KEY is present the objective
 * is planned by a model instead, and the result is validated into the exact
 * same `PlanDraft` shape. Anything unexpected in the response falls back to
 * the heuristic planner rather than failing the run.
 */

const DEFAULT_MODEL = "claude-opus-5";

const VALID_TOOLS: readonly ToolName[] = [
  "search",
  "read",
  "edit",
  "shell",
  "test",
  "browser",
];

const SYSTEM_PROMPT = `You are the planning stage of an autonomous software-engineering agent working in a small TypeScript service called checkout-service.

The repository contains:
  src/server/checkout.ts    orchestrates a checkout: session -> rate limit -> charge
  src/server/rate-limit.ts  fixed-window Redis counter (known to allow bursts at the window boundary)
  src/server/session.ts     Redis-backed sessions with a 30 minute TTL
  src/server/payments.ts    gateway client, no retries, no idempotency key
  src/server/redis.ts       shared Redis client

Produce a plan of 4 to 7 ordered steps that a careful engineer would actually follow: understand the code before changing it, make the change, then prove it works. Every step must use exactly one tool.

Call the submit_plan tool with your plan. Do not reply with prose.`;

const PLAN_TOOL: Anthropic.Tool = {
  name: "submit_plan",
  description: "Submit the ordered plan of steps for the given objective.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: {
        type: "string",
        description: "One sentence describing the approach.",
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", description: "Imperative, under 60 characters." },
            rationale: {
              type: "string",
              description: "Why this step is necessary, in one sentence.",
            },
            tool: { type: "string", enum: [...VALID_TOOLS] },
            target: {
              type: "string",
              description: "The file path, shell command, query or URL the tool acts on.",
            },
            output: {
              type: "array",
              description: "2-4 lines this step would realistically print.",
              items: { type: "string" },
            },
          },
          required: ["title", "rationale", "tool", "target", "output"],
        },
      },
    },
    required: ["summary", "steps"],
  },
};

interface ModelStep {
  title: string;
  rationale: string;
  tool: ToolName;
  target: string;
  output: string[];
}

export function isModelPlannerEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function asString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, max);
}

/**
 * Validates the model's tool input. The response is untrusted input like any
 * other, so every field is checked rather than cast.
 */
export function parseModelPlan(
  input: unknown,
): { summary: string; steps: ModelStep[] } | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;

  const summary = asString(record.summary, 240);
  if (!summary || !Array.isArray(record.steps)) return null;

  const steps: ModelStep[] = [];
  for (const raw of record.steps.slice(0, 8)) {
    if (typeof raw !== "object" || raw === null) continue;
    const step = raw as Record<string, unknown>;

    const title = asString(step.title, 80);
    const rationale = asString(step.rationale, 200);
    const target = asString(step.target, 160);
    const tool = VALID_TOOLS.find((name) => name === step.tool);
    if (!title || !rationale || !target || !tool) continue;

    const output = Array.isArray(step.output)
      ? step.output
          .map((line) => asString(line, 160))
          .filter((line): line is string => line !== null)
          .slice(0, 6)
      : [];

    steps.push({ title, rationale, tool, target, output });
  }

  return steps.length >= 2 ? { summary, steps } : null;
}

function toDraft(objective: string, parsed: { summary: string; steps: ModelStep[] }): PlanDraft {
  const scripts = new Map<string, StepScript>();

  const steps: Step[] = parsed.steps.map((modelStep, i) => {
    const id = createId("step");
    const logs: LogLine[] = modelStep.output.map((text) => ({ level: "out", text }));
    scripts.set(id, {
      logs: logs.length > 0 ? logs : [{ level: "note", text: `${modelStep.tool} completed` }],
    });
    return {
      id,
      index: i + 1,
      title: modelStep.title,
      rationale: modelStep.rationale,
      tool: modelStep.tool,
      target: modelStep.target,
      state: "pending",
      logs: [],
    };
  });

  return {
    plan: { objective, source: "model", summary: parsed.summary, steps },
    scripts,
  };
}

/**
 * Plans with a live model, falling back to the heuristic planner on any
 * failure — missing key, network error, rate limit, or a malformed response.
 */
export async function planWithModel(objective: string): Promise<PlanDraft> {
  if (!isModelPlannerEnabled()) return createPlan(objective);

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [PLAN_TOOL],
      messages: [{ role: "user", content: `Objective: ${objective}` }],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    const parsed = toolUse ? parseModelPlan(toolUse.input) : null;

    return parsed ? toDraft(objective, parsed) : createPlan(objective);
  } catch (error) {
    // A planning outage must not take the product down; degrade to offline.
    console.warn(
      "[devin] model planner unavailable, using heuristic planner:",
      error instanceof Error ? error.message : error,
    );
    return createPlan(objective);
  }
}
