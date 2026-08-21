import { runAgent } from "@/lib/agent/engine";
import { planWithModel } from "@/lib/agent/model";
import { titleFor } from "@/lib/agent/planner";
import { REPO_BRANCH, REPO_NAME } from "@/lib/agent/repo";
import { checkRateLimit, clientKey } from "@/lib/server/rate-limit";
import { validateObjective } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function sse(event: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function problem(status: number, error: string, headers: HeadersInit = {}) {
  return Response.json({ error }, { status, headers });
}

/**
 * Streams a run as Server-Sent Events.
 *
 * POST rather than GET (so the objective is not in a URL) which rules out
 * EventSource, so the client reads the body with a stream reader instead. The
 * generator is only pulled as fast as the client consumes it, and aborting the
 * request cancels the run rather than leaving it producing into a dead socket.
 */
export async function POST(request: Request): Promise<Response> {
  const limit = checkRateLimit(clientKey(request.headers));
  if (!limit.allowed) {
    return problem(429, "Too many runs started. Try again shortly.", {
      "retry-after": String(limit.retryAfterSeconds),
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problem(400, "Request body must be JSON.");
  }

  const objective = (payload as { objective?: unknown } | null)?.objective;
  const validated = validateObjective(objective);
  if (!validated.ok) {
    return problem(400, validated.error);
  }

  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      streamController.enqueue(
        sse({
          type: "run.accepted",
          title: titleFor(validated.objective),
          repo: `${REPO_NAME}@${REPO_BRANCH}`,
        }),
      );

      try {
        const draft = await planWithModel(validated.objective);
        for await (const event of runAgent(validated.objective, {
          signal: controller.signal,
          draft,
        })) {
          streamController.enqueue(sse(event));
        }
      } catch (error) {
        streamController.enqueue(
          sse({
            type: "error",
            message: error instanceof Error ? error.message : "Run failed",
          }),
        );
      } finally {
        streamController.close();
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Stops nginx-style proxies from buffering the stream into one chunk.
      "x-accel-buffering": "no",
      "x-ratelimit-remaining": String(limit.remaining),
    },
  });
}
