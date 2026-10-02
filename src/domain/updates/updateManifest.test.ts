import { describe, expect, it } from "vitest";
import {
  evaluateManifestUpdate,
  parseUpdateManifest,
  sanitizeReleaseNotes,
} from "./updateManifest";

describe("updateManifest", () => {
  it("parses valid manifest", () => {
    expect(parseUpdateManifest({ version: "0.2.0", notes: "Fixes" })?.version).toBe(
      "0.2.0",
    );
  });

  it("rejects malformed manifest", () => {
    expect(parseUpdateManifest(null)).toBeNull();
    expect(parseUpdateManifest({ version: "x" })).toBeNull();
  });

  it("evaluates update availability", () => {
    const result = evaluateManifestUpdate(
      { version: "0.2.0", notes: "Line one" },
      "0.1.0",
    );
    expect(result.available).toBe(true);
    expect(result.version).toBe("0.2.0");
  });

  it("same version is not an update", () => {
    const result = evaluateManifestUpdate({ version: "0.1.0" }, "0.1.0");
    expect(result.available).toBe(false);
  });

  it("strips html from notes", () => {
    expect(sanitizeReleaseNotes("<b>Hi</b>")).toBe("Hi");
  });
});
