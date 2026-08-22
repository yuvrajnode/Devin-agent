"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyEvent, emptySession } from "@/lib/agent/reduce";
import { REPO_BRANCH, REPO_NAME } from "@/lib/agent/repo";
import { RunRequestError, streamRun } from "@/lib/agent/stream-client";
import { createId } from "@/lib/agent/id";
import type { Session } from "@/lib/agent/types";

/** Older sessions are dropped so localStorage cannot grow without bound. */
const MAX_SESSIONS = 12;

interface StoreState {
  sessions: Session[];
  activeId: string | null;
  /** Set once persisted state has been read, to avoid a hydration mismatch. */
  hydrated: boolean;
  error: string | null;

  start: (objective: string) => Promise<void>;
  stop: () => void;
  select: (id: string) => void;
  remove: (id: string) => void;
  clearError: () => void;
}

/**
 * Kept outside the store: an AbortController is not serialisable and must
 * never end up in persisted state.
 */
let inFlight: AbortController | null = null;

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeId: null,
      hydrated: false,
      error: null,

      async start(objective) {
        get().stop();

        const controller = new AbortController();
        inFlight = controller;

        const session = emptySession(objective, objective, `${REPO_NAME}@${REPO_BRANCH}`);
        session.messages = [
          { id: createId("msg"), role: "user", text: objective, at: Date.now() },
        ];

        set((state) => ({
          sessions: [session, ...state.sessions].slice(0, MAX_SESSIONS),
          activeId: session.id,
          error: null,
        }));

        const update = (mutate: (current: Session) => Session) =>
          set((state) => ({
            sessions: state.sessions.map((entry) =>
              entry.id === session.id ? mutate(entry) : entry,
            ),
          }));

        try {
          for await (const event of streamRun(objective, controller.signal)) {
            if (event.type === "run.accepted") {
              update((current) => ({ ...current, title: event.title, repo: event.repo }));
              continue;
            }
            update((current) => applyEvent(current, event));
          }
        } catch (error) {
          if (controller.signal.aborted) {
            update((current) => ({ ...current, state: "blocked" }));
          } else {
            const message =
              error instanceof RunRequestError
                ? error.message
                : "Lost connection to the agent.";
            set({ error: message });
            update((current) => ({ ...current, state: "failed" }));
          }
        } finally {
          if (inFlight === controller) inFlight = null;
        }
      },

      stop() {
        inFlight?.abort();
        inFlight = null;
      },

      select(id) {
        set({ activeId: id });
      },

      remove(id) {
        // Deleting the run that is streaming must also cancel it, or the
        // request keeps producing into a session that no longer exists.
        if (get().activeId === id) get().stop();

        set((state) => {
          const sessions = state.sessions.filter((session) => session.id !== id);
          return {
            sessions,
            activeId: state.activeId === id ? (sessions[0]?.id ?? null) : state.activeId,
          };
        });
      },

      clearError() {
        set({ error: null });
      },
    }),
    {
      name: "devin.sessions",
      version: 1,
      partialize: (state) => ({
        sessions: state.sessions,
        activeId: state.activeId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // A run interrupted by a reload can never resume, so it is not left
        // showing a spinner from a previous page load.
        state.sessions = state.sessions.map((session) =>
          session.state === "running" || session.state === "planning"
            ? { ...session, state: "blocked" }
            : session,
        );
        state.hydrated = true;
      },
    },
  ),
);

export function useActiveSession(): Session | null {
  return useStore(
    (state) => state.sessions.find((session) => session.id === state.activeId) ?? null,
  );
}

export function useIsRunning(): boolean {
  return useStore((state) => {
    const active = state.sessions.find((session) => session.id === state.activeId);
    return active?.state === "running" || active?.state === "planning";
  });
}
