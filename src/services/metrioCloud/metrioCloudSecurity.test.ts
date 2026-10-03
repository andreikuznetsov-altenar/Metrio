import { describe, expect, it } from "vitest";
import { parseApiError } from "./metrioCloudErrors";

describe("metrio cloud security client", () => {
  it("maps forbidden responses", () => {
    const err = parseApiError(403, {
      error: { code: "forbidden", message: "Denied" },
    });
    expect(err.code).toBe("forbidden");
  });

  it("maps conflict", () => {
    const err = parseApiError(409, {
      error: { code: "conflict", message: "Stale" },
    });
    expect(err.code).toBe("conflict");
  });
});
