import { describe, expect, it, vi } from "vitest";
import { openNotificationTarget } from "./notificationNavigation";
import { COMPANY_CONFIG } from "../config/company";
import { DEFAULT_PREFERENCES } from "./preferences";
import { resolveOrgFeatureAccess } from "../domain/organization/orgFeatureAccess";

vi.mock("./openExternal", () => ({
  openExternalUrl: vi.fn(async () => undefined),
}));

import { openExternalUrl } from "./openExternal";

describe("openNotificationTarget", () => {
  it("opens Jira issue using configured base URL", async () => {
    await openNotificationTarget(
      { kind: "jira", issueKey: "UX-1234" },
      {
        onOpenPerson: vi.fn(),
        onOpenSettings: vi.fn(),
        loadPreferences: async () => DEFAULT_PREFERENCES,
      },
    );
    const base = COMPANY_CONFIG.jiraBaseUrl.replace(/\/+$/, "");
    expect(openExternalUrl).toHaveBeenCalledWith(`${base}/browse/UX-1234`);
  });

  it("opens person drawer handler for person targets", async () => {
    const onOpenPerson = vi.fn();
    await openNotificationTarget(
      { kind: "person", personId: "person-9" },
      {
        onOpenPerson,
        onOpenSettings: vi.fn(),
        loadPreferences: async () => DEFAULT_PREFERENCES,
      },
    );
    expect(onOpenPerson).toHaveBeenCalledWith("person-9");
  });

  it("maps survey notification to results for IC", async () => {
    const openedTabs: unknown[] = [];
    const onTab = (event: Event) => {
      openedTabs.push((event as CustomEvent).detail);
    };
    window.addEventListener("metrio-open-feedback-tab", onTab);
    await openNotificationTarget(
      { kind: "feedback", tab: "survey" },
      {
        onOpenPerson: vi.fn(),
        onOpenSettings: vi.fn(),
        loadPreferences: async () => DEFAULT_PREFERENCES,
        orgFeatureAccess: resolveOrgFeatureAccess("individual_contributor"),
      },
    );
    expect(openedTabs).toEqual(["results"]);
    window.removeEventListener("metrio-open-feedback-tab", onTab);
  });
});
