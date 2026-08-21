export const MAX_OBJECTIVE_LENGTH = 400;
export const MIN_OBJECTIVE_LENGTH = 8;

export type Validation =
  | { ok: true; objective: string }
  | { ok: false; error: string };

/**
 * Validates the only user-supplied value the API accepts.
 *
 * Control characters are stripped because the objective is echoed back into
 * the SSE stream, where a stray newline would split one event into two.
 */
export function validateObjective(input: unknown): Validation {
  if (typeof input !== "string") {
    return { ok: false, error: "An objective is required." };
  }

  const cleaned = input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < MIN_OBJECTIVE_LENGTH) {
    return {
      ok: false,
      error: `Describe the task in at least ${MIN_OBJECTIVE_LENGTH} characters.`,
    };
  }
  if (cleaned.length > MAX_OBJECTIVE_LENGTH) {
    return {
      ok: false,
      error: `Keep the objective under ${MAX_OBJECTIVE_LENGTH} characters.`,
    };
  }

  return { ok: true, objective: cleaned };
}
