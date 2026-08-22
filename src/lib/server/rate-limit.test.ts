import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clientKey, resetRateLimit } from "./rate-limit";

const LIMIT = 12;
const WINDOW_MS = 60_000;

beforeEach(resetRateLimit);

describe("checkRateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const now = 1_000_000;

    for (let i = 0; i < LIMIT; i += 1) {
      expect(checkRateLimit("a", now).allowed).toBe(true);
    }

    const blocked = checkRateLimit("a", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each client separately", () => {
    const now = 1_000_000;
    for (let i = 0; i < LIMIT; i += 1) checkRateLimit("a", now);

    expect(checkRateLimit("b", now).allowed).toBe(true);
  });

  it("recovers once the window has slid past", () => {
    const now = 1_000_000;
    for (let i = 0; i < LIMIT; i += 1) checkRateLimit("a", now);

    expect(checkRateLimit("a", now).allowed).toBe(false);
    expect(checkRateLimit("a", now + WINDOW_MS + 1).allowed).toBe(true);
  });

  it("does not let a burst through at the window boundary", () => {
    const now = 1_000_000;
    for (let i = 0; i < LIMIT; i += 1) checkRateLimit("a", now);

    // A fixed-window counter would reset here; a sliding window must not.
    expect(checkRateLimit("a", now + WINDOW_MS - 1).allowed).toBe(false);
  });

  it("reports the remaining budget", () => {
    expect(checkRateLimit("a", 1).remaining).toBe(LIMIT - 1);
    expect(checkRateLimit("a", 2).remaining).toBe(LIMIT - 2);
  });
});

describe("client tracking", () => {
  it("keeps a client's budget intact across many other clients", () => {
    const now = 1_000_000;
    for (let i = 0; i < LIMIT; i += 1) checkRateLimit("hot", now);

    // Traffic from other clients must not silently reset an existing budget.
    for (let i = 0; i < 200; i += 1) checkRateLimit(`cold-${i}`, now);

    expect(checkRateLimit("hot", now).allowed).toBe(false);
  });
});

describe("clientKey", () => {
  it("prefers the first x-forwarded-for entry", () => {
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
    expect(clientKey(headers)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip then to anonymous", () => {
    expect(clientKey(new Headers({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(clientKey(new Headers())).toBe("anonymous");
  });
});
