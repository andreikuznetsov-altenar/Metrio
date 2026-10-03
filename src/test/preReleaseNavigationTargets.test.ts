import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  dispatchEmployeeView,
  navigateActionTarget,
} from "../app/actionNavigation";
import { searchPaletteCommands } from "../domain/commandPalette/commandDefinitions";
import { openNotificationTarget } from "../platform/notificationNavigation";
import { COMPANY_CONFIG } from "../config/company";
import { DEFAULT_PREFERENCES } from "../platform/preferences";
import { buildJiraIssueBrowseUrl } from "../platform/jiraIssueUrl";
import { bambooEmployeePortalUrl } from "../config/bambooPortal";

vi.mock("../platform/openExternal", () => ({
  openExternalUrl: vi.fn(async () => undefined),
}));

import { openExternalUrl } from "../platform/openExternal";

describe("pre-release navigation targets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes View all work to employee my-week", () => {
    const handler = vi.fn();
    window.addEventListener("metrio-open-employee-view", handler);
    window.addEventListener("metrio-navigate-route", handler);
    navigateActionTarget(
      { kind: "employee-work", view: "my-week" },
      { openPerson: vi.fn() },
    );
    expect(handler).toHaveBeenCalled();
    const employeeEvent = handler.mock.calls.find(
      (call) =>
        (call[0] as CustomEvent).type === "metrio-open-employee-view",
    )?.[0] as CustomEvent;
    expect(employeeEvent.detail).toBe("my-week");
    window.removeEventListener("metrio-open-employee-view", handler);
    window.removeEventListener("metrio-navigate-route", handler);
  });

  it("builds Jira browse URL for issue keys", () => {
    const base = COMPANY_CONFIG.jiraBaseUrl.replace(/\/+$/, "");
    expect(buildJiraIssueBrowseUrl(base, "AGTC-106")).toBe(
      `${base}/browse/AGTC-106`,
    );
  });

  it("opens BambooHR portal for bamboo notification targets", async () => {
    await openNotificationTarget(
      { kind: "bamboo" },
      {
        onOpenPerson: vi.fn(),
        onOpenSettings: vi.fn(),
        loadPreferences: async () => DEFAULT_PREFERENCES,
      },
    );
    expect(openExternalUrl).toHaveBeenCalledWith(bambooEmployeePortalUrl());
  });

  it("hides Feedback palette command when feature disabled", () => {
    const results = searchPaletteCommands("feedback", { feedbackEnabled: false });
    expect(results.some((r) => r.title.toLowerCase().includes("feedback"))).toBe(
      false,
    );
  });

  it("dispatchEmployeeView emits my-week detail", () => {
    const handler = vi.fn();
    window.addEventListener("metrio-open-employee-view", handler);
    dispatchEmployeeView("my-week");
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toBe("my-week");
    window.removeEventListener("metrio-open-employee-view", handler);
  });
});
