import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapProductionSession } from "./appSession";
import * as connectionStorage from "./connectionStorage";
import * as preferences from "../platform/preferences";

describe("bootstrapProductionSession", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requires connection when marker is absent", async () => {
    vi.spyOn(connectionStorage, "isAppConnected").mockReturnValue(false);

    const result = await bootstrapProductionSession();
    expect(result.kind).toBe("connection_required");
    if (result.kind === "connection_required") {
      expect(result.reason).toBe("no_marker");
    }
  });

  it("treats default preferences with connected marker as stale", async () => {
    vi.spyOn(connectionStorage, "isAppConnected").mockReturnValue(true);
    vi.spyOn(connectionStorage, "readSavedConnection").mockResolvedValue({
      workEmail: "user@altenar.com",
      jiraBaseUrl: "https://jira.example",
      bambooSubdomain: "example",
      hasJiraToken: true,
      hasBambooApiKey: true,
    });
    vi.spyOn(preferences, "loadPreferencesOutcome").mockResolvedValue({
      ok: true,
      source: "default",
      prefs: {
        ...preferences.DEFAULT_PREFERENCES,
        setup: { completed: false },
      },
    });

    const result = await bootstrapProductionSession();
    expect(result.kind).toBe("connection_required");
    if (result.kind === "connection_required") {
      expect(result.reason).toBe("stale_session");
      expect(result.preservedEmail).toBe("user@altenar.com");
    }
  });

  it("accepts a valid persisted workspace", async () => {
    vi.spyOn(connectionStorage, "isAppConnected").mockReturnValue(true);
    vi.spyOn(connectionStorage, "readSavedConnection").mockResolvedValue({
      workEmail: "user@altenar.com",
      jiraBaseUrl: "https://jira.example",
      bambooSubdomain: "example",
      hasJiraToken: true,
      hasBambooApiKey: true,
    });
    vi.spyOn(preferences, "loadPreferencesOutcome").mockResolvedValue({
      ok: true,
      source: "file",
      prefs: {
        ...preferences.DEFAULT_PREFERENCES,
        setup: { completed: true },
        workEmail: "user@altenar.com",
      },
    });

    const result = await bootstrapProductionSession();
    expect(result.kind).toBe("ready");
  });

  it("returns storage error when preferences_load invoke fails", async () => {
    vi.spyOn(connectionStorage, "isAppConnected").mockReturnValue(true);
    vi.spyOn(connectionStorage, "readSavedConnection").mockResolvedValue({
      workEmail: "user@altenar.com",
      jiraBaseUrl: "https://jira.example",
      bambooSubdomain: "example",
      hasJiraToken: true,
      hasBambooApiKey: true,
    });
    vi.spyOn(preferences, "loadPreferencesOutcome").mockResolvedValue({
      ok: false,
      reason: "invoke failed",
      stage: "invoke",
    });

    const result = await bootstrapProductionSession();
    expect(result.kind).toBe("storage_error");
  });
});
