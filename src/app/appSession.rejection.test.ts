import { describe, expect, it, vi, beforeEach } from "vitest";
import { bootstrapProductionSession } from "./appSession";
import * as connectionStorage from "./connectionStorage";

describe("bootstrapProductionSession rejection safety", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when readSavedConnection throws", async () => {
    vi.spyOn(connectionStorage, "isAppConnected").mockReturnValue(true);
    vi.spyOn(connectionStorage, "readSavedConnection").mockRejectedValue(
      new Error("secure store unavailable"),
    );

    await expect(bootstrapProductionSession()).rejects.toThrow(
      "secure store unavailable",
    );
  });
});
