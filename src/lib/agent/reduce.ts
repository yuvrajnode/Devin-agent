import { createId } from "./id";
import type { AgentEvent, ChatMessage, Session, Step } from "./types";

/**
 * Projects an event onto session state.
 *
 * Deliberately pure and shared: the browser store and the tests apply the very
 * same reducer, so a run replayed in a test produces exactly the state a user
 * would see.
 */

export function emptySession(objective: string, title: string, repo: string): Session {
  return {
    id: createId("run"),
    title,
    repo,
    objective,
    state: "idle",
    plan: null,
    messages: [],
    createdAt: Date.now(),
  };
}

function mapStep(
  session: Session,
  stepId: string,
  update: (step: Step) => Step,
): Session {
  if (!session.plan) return session;
  return {
    ...session,
    plan: {
      ...session.plan,
      steps: session.plan.steps.map((step) =>
        step.id === stepId ? update(step) : step,
      ),
    },
  };
}

export function applyEvent(session: Session, event: AgentEvent): Session {
  switch (event.type) {
    case "run.state":
      return { ...session, state: event.state };

    case "plan.created":
      return { ...session, plan: event.plan };

    case "step.started":
      return mapStep(session, event.stepId, (step) => ({ ...step, state: "active" }));

    case "step.log":
      return mapStep(session, event.stepId, (step) => ({
        ...step,
        logs: [...step.logs, event.line],
      }));

    case "step.diff":
      return mapStep(session, event.stepId, (step) => ({ ...step, diff: event.diff }));

    case "step.finished":
      return mapStep(session, event.stepId, (step) => ({
        ...step,
        state: event.state,
        durationMs: event.durationMs,
      }));

    case "message": {
      const message: ChatMessage = {
        id: createId("msg"),
        role: event.role,
        text: event.text,
        at: Date.now(),
      };
      return { ...session, messages: [...session.messages, message] };
    }

    case "run.finished":
      return { ...session, state: event.state, finishedAt: Date.now() };

    case "error": {
      const message: ChatMessage = {
        id: createId("msg"),
        role: "agent",
        text: `Run failed: ${event.message}`,
        at: Date.now(),
      };
      return { ...session, state: "failed", messages: [...session.messages, message] };
    }

    default: {
      // Exhaustiveness guard: adding an event variant without handling it here
      // becomes a compile error rather than a silent no-op.
      const _never: never = event;
      return session;
    }
  }
}

export function applyAll(session: Session, events: AgentEvent[]): Session {
  return events.reduce(applyEvent, session);
}
