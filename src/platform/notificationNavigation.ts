import type { SettingsSection } from "../pages/settings/types";
import type { NotificationTarget } from "./notificationTypes";
import type { OrgFeatureAccess } from "../domain/organization/orgFeatureAccess";
import { resolveSafeFeedbackNotificationTab } from "../domain/organization/feedbackNotificationSafety";
import { buildJiraIssueBrowseUrl } from "./jiraIssueUrl";
import { openExternalUrl } from "./openExternal";
import type { AppPreferences } from "./preferences";
import { resolveJiraBaseUrl } from "../config/product";
import { bambooEmployeePortalUrl } from "../config/bambooPortal";
import { acknowledgeTrayJiraIssue } from "./trayActionCenter";
import { openDigest } from "./digestNavigation";
import { dispatchAppRoute, navigatePerformanceView } from "../app/actionNavigation";

export async function openNotificationTarget(
  target: NotificationTarget | undefined,
  handlers: {
    onOpenPerson: (personId: string) => void;
    onOpenSettings: (section: SettingsSection) => void;
    loadPreferences: () => Promise<AppPreferences>;
    orgFeatureAccess?: OrgFeatureAccess;
  },
): Promise<void> {
  if (!target) return;

  if (target.kind === "person") {
    handlers.onOpenPerson(target.personId);
    return;
  }

  if (target.kind === "settings") {
    handlers.onOpenSettings(target.section);
    return;
  }

  if (target.kind === "jira") {
    const prefs = await handlers.loadPreferences();
    const baseUrl = resolveJiraBaseUrl(prefs);
    const url = buildJiraIssueBrowseUrl(baseUrl, target.issueKey);
    await openExternalUrl(url);
    await acknowledgeTrayJiraIssue(target.issueKey);
    return;
  }

  if (target.kind === "performance") {
    navigatePerformanceView(target.tab);
    return;
  }

  if (target.kind === "feedback") {
    const access = handlers.orgFeatureAccess;
    const safeTab =
      access != null
        ? resolveSafeFeedbackNotificationTab(target.tab, access)
        : target.tab;
    if (safeTab == null) {
      dispatchAppRoute("home");
      return;
    }
    window.dispatchEvent(
      new CustomEvent("metrio-open-feedback-tab", { detail: safeTab }),
    );
    dispatchAppRoute("feedback");
    return;
  }

  if (target.kind === "bamboo") {
    await openExternalUrl(bambooEmployeePortalUrl());
    return;
  }

  if (target.kind === "home") {
    dispatchAppRoute("home");
    return;
  }

  if (target.kind === "digest") {
    dispatchAppRoute("home");
    openDigest(target.digestKind);
    return;
  }

  if (target.kind === "goal") {
    navigatePerformanceView("goals");
  }
}
