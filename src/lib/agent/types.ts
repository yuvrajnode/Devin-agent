/**
 * Core domain model.
 *
 * A *session* is one objective handed to the agent. The agent turns it into a
 * *plan* of ordered *steps*; executing a step emits *events*. Everything the
 * UI renders is derived from the event stream, which keeps the client a pure
 * projection of what the engine actually did.
 */

export type RunState =
  | "idle"
  | "planning"
  | "running"
  | "blocked"
  | "done"
  | "failed";

export type StepState = "pending" | "active" | "done" | "failed" | "skipped";

/** The sandboxed capabilities the agent is allowed to reach for. */
export type ToolName =
  | "search"
  | "read"
  | "edit"
  | "shell"
  | "test"
  | "browser";

export interface ToolDescriptor {
  name: ToolName;
  label: string;
  /** Short description surfaced in the capability list on the landing page. */
  summary: string;
}

export const TOOLS: readonly ToolDescriptor[] = [
  {
    name: "search",
    label: "Code search",
    summary: "Ripgrep-style lookup across the checked-out tree to locate call sites.",
  },
  {
    name: "read",
    label: "File read",
    summary: "Pulls files into context with line anchors so edits stay precise.",
  },
  {
    name: "edit",
    label: "Editor",
    summary: "Applies unified-diff patches and keeps a reviewable changeset.",
  },
  {
    name: "shell",
    label: "Shell",
    summary: "Runs commands in the sandbox with streamed stdout and exit codes.",
  },
  {
    name: "test",
    label: "Test runner",
    summary: "Executes the project's suite and parses failures back into the plan.",
  },
  {
    name: "browser",
    label: "Browser",
    summary: "Loads the running app to verify behaviour the tests cannot assert.",
  },
] as const;

export type LogLevel = "out" | "err" | "note";

export interface LogLine {
  level: LogLevel;
  text: string;
}

export interface DiffHunk {
  path: string;
  additions: number;
  deletions: number;
  /** Unified-diff body, without the `---`/`+++` file header lines. */
  body: string;
}

export interface Step {
  id: string;
  /** 1-based position, stable across re-renders. */
  index: number;
  title: string;
  /** Why the planner believes this step is required. */
  rationale: string;
  tool: ToolName;
  /** File path, command, or query the tool acts on. */
  target: string;
  state: StepState;
  logs: LogLine[];
  diff?: DiffHunk;
  durationMs?: number;
}

export interface Plan {
  objective: string;
  /** Where the plan came from: the offline planner or a live model. */
  source: "heuristic" | "model";
  summary: string;
  steps: Step[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  at: number;
}

export interface Session {
  id: string;
  title: string;
  repo: string;
  objective: string;
  state: RunState;
  plan: Plan | null;
  messages: ChatMessage[];
  createdAt: number;
  /** Set once the run reaches a terminal state. */
  finishedAt?: number;
}

/* --- Event stream -------------------------------------------------------- */

export type AgentEvent =
  | { type: "run.state"; state: RunState }
  | { type: "plan.created"; plan: Plan }
  | { type: "step.started"; stepId: string }
  | { type: "step.log"; stepId: string; line: LogLine }
  | { type: "step.diff"; stepId: string; diff: DiffHunk }
  | { type: "step.finished"; stepId: string; state: StepState; durationMs: number }
  | { type: "message"; role: ChatMessage["role"]; text: string }
  | { type: "run.finished"; state: Extract<RunState, "done" | "failed" | "blocked"> }
  | { type: "error"; message: string };

export const TERMINAL_STATES: readonly RunState[] = ["done", "failed"] as const;

export function isTerminal(state: RunState): boolean {
  return TERMINAL_STATES.includes(state);
}

/** Aggregate changeset across every step that produced a diff. */
export function changeset(plan: Plan | null): DiffHunk[] {
  if (!plan) return [];
  return plan.steps.flatMap((step) => (step.diff ? [step.diff] : []));
}

export function planProgress(plan: Plan | null): { done: number; total: number } {
  if (!plan || plan.steps.length === 0) return { done: 0, total: 0 };
  const done = plan.steps.filter(
    (step) => step.state === "done" || step.state === "skipped",
  ).length;
  return { done, total: plan.steps.length };
}
