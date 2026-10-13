import { describe, expect, it, vi } from "vitest";
import {
  checkForUpdatesWithManifest,
  checkUpdateFromManifest,
  isUpdaterEnabledForChannel,
} from "./metrioUpdater";

describe("metrioUpdater", () => {
  it("enables updater only on production channel", () => {
    expect(isUpdaterEnabledForChannel("production")).toBe(true);
    expect(isUpdaterEnabledForChannel("development")).toBe(false);
  });

  it("detects available update from manifest", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ version: "0.2.0", notes: "Bug fixes" }),
    })) as typeof fetch;

    const result = await checkForUpdatesWithManifest(
      "0.1.0",
      "https://example.com/latest.json",
      fetchImpl,
    );
    expect(result.status).toBe("available");
    expect(result.availableVersion).toBe("0.2.0");
  });

  it("reports up to date for same version", () => {
    const result = checkUpdateFromManifest({ version: "0.1.0" }, "0.1.0");
    expect(result.status).toBe("up-to-date");
  });

  it("handles network failure", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
    })) as typeof fetch;
    const result = await checkForUpdatesWithManifest(
      "0.1.0",
      "https://example.com/latest.json",
      fetchImpl,
    );
    expect(result.status).toBe("error");
  });

  it("handles malformed manifest", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ version: "broken" }),
    })) as typeof fetch;
    const result = await checkForUpdatesWithManifest(
      "0.1.0",
      "https://example.com/latest.json",
      fetchImpl,
    );
    expect(result.status).toBe("error");
  });

});
