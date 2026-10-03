import { describe, expect, it } from "vitest";
import { categorizeError } from "./errorCategory";

describe("categorizeError", () => {
  it("maps auth failures", () => {
    expect(categorizeError(new Error("HTTP 401"))).toBe("unauthorized");
  });

  it("maps network failures", () => {
    expect(categorizeError(new Error("Failed to fetch"))).toBe("network");
  });

  it("maps rate limits", () => {
    expect(categorizeError(new Error("429 rate limit"))).toBe("rate_limit");
  });
});
