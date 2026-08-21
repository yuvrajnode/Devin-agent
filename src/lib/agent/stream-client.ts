import type { AgentEvent } from "./types";

/** The one extra event the HTTP layer adds before the engine takes over. */
export interface RunAcceptedEvent {
  type: "run.accepted";
  title: string;
  repo: string;
}

export type StreamEvent = AgentEvent | RunAcceptedEvent;

export class RunRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RunRequestError";
  }
}

/**
 * Reads the SSE body of POST /api/run.
 *
 * A hand-rolled reader rather than EventSource, which cannot issue a POST.
 * Frames are separated by a blank line; a partial frame is held in `buffer`
 * until the rest of it arrives, which is the case a naive per-chunk parser
 * gets wrong under a slow connection.
 */
export async function* streamRun(
  objective: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ objective }),
    signal,
  });

  if (!response.ok || !response.body) {
    let message = "The run could not be started.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* non-JSON error body; keep the default message */
    }
    throw new RunRequestError(message, response.status);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += value;

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        const payload = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("");

        if (payload.length === 0) continue;

        try {
          yield JSON.parse(payload) as StreamEvent;
        } catch {
          // A truncated frame is not worth failing the whole run over.
          continue;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
