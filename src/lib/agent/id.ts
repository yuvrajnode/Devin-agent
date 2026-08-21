/**
 * Deterministic-by-default id generator.
 *
 * `crypto.randomUUID` is unavailable in some non-secure contexts, so a
 * counter-backed fallback keeps ids unique within a process without pulling in
 * a uuid dependency.
 */
let counter = 0;

export function createId(prefix: string): string {
  counter += 1;
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}${counter.toString(36)}`;
}
