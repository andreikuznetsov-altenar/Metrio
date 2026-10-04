import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../platform/secureStorage", () => ({
  SECRET_KEYS: { JIRA_API_TOKEN: "jira", BAMBOO_API_TOKEN: "bamboo" },
  secureStoreSet: vi.fn(async () => undefined),
  secureStoreHas: vi.fn(async () => true),
  secureStoreDelete: vi.fn(async () => undefined),
}));

import {
  clearSessionMarker,
  isAppConnected,
  markSessionConnected,
  persistConnectionConfig,
  readSavedConnection,
} from "./connectionStorage";

describe("connection session marker", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not mark connected when only persisting config", async () => {
    await persistConnectionConfig(
      { workEmail: "user@altenar.com" },
      { jiraToken: "jira", bambooApiKey: "bamboo" },
    );

    expect(isAppConnected()).toBe(false);
    expect(localStorage.getItem("metrio-connection-config")).toContain(
      "user@altenar.com",
    );
  });

  it("marks connected only when explicitly requested", () => {
    markSessionConnected();
    expect(isAppConnected()).toBe(true);
  });

  it("reports stored credentials in visual fixture mode", async () => {
    vi.stubEnv("VITE_VISUAL_FIXTURE", "1");
    localStorage.setItem("metrio-visual-secure-store", "all");
    localStorage.setItem(
      "metrio-connection-config",
      JSON.stringify({ workEmail: "lead@altenar.com" }),
    );
    const saved = await readSavedConnection();
    expect(saved?.hasJiraToken).toBe(true);
    expect(saved?.hasBambooApiKey).toBe(true);
    vi.unstubAllEnvs();
  });

  it("clears stale marker without removing config", async () => {
    localStorage.setItem(
      "metrio-connection-config",
      JSON.stringify({ workEmail: "user@altenar.com" }),
    );
    markSessionConnected();
    clearSessionMarker();

    expect(isAppConnected()).toBe(false);
    expect(localStorage.getItem("metrio-connection-config")).toContain(
      "user@altenar.com",
    );
  });
});
