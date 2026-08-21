import { isModelPlannerEnabled } from "@/lib/agent/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness probe for the platform, and a quick way to confirm configuration. */
export function GET(): Response {
  return Response.json(
    {
      status: "ok",
      planner: isModelPlannerEnabled() ? "model" : "heuristic",
      uptimeSeconds: Math.round(process.uptime()),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
