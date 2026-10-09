import { describe, expect, it } from "vitest";
import { resolveOrgFeatureAccess } from "./orgFeatureAccess";
import { resolveSafeFeedbackNotificationTab } from "./feedbackNotificationSafety";

describe("resolveSafeFeedbackNotificationTab", () => {
  it("redirects operational tabs to results for IC", () => {
    const access = resolveOrgFeatureAccess("individual_contributor");
    expect(resolveSafeFeedbackNotificationTab("survey", access)).toBe("results");
    expect(resolveSafeFeedbackNotificationTab("delivery", access)).toBe("results");
  });

  it("blocks feedback navigation for manager of managers", () => {
    const access = resolveOrgFeatureAccess("manager_of_managers");
    expect(resolveSafeFeedbackNotificationTab("survey", access)).toBeNull();
    expect(resolveSafeFeedbackNotificationTab("delivery", access)).toBeNull();
  });

  it("maps legacy survey tab to cycles landing for leaf manager", () => {
    const access = resolveOrgFeatureAccess("leaf_manager");
    expect(resolveSafeFeedbackNotificationTab("survey", access)).toBe("cycles");
  });
});
