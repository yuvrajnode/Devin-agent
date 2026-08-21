/**
 * Minimal class-name joiner. The project deliberately avoids a runtime
 * class-merging dependency: variants are declared as exhaustive maps, so
 * conflicting utilities never reach the DOM in the first place.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
