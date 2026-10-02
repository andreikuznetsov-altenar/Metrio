import type { SettingsSection } from "../pages/settings/types";
import type { NotificationTarget } from "./notificationTypes";
import { buildJiraIssueBrowseUrl } from "./jiraIssueUrl";
import { openExternalUrl } from "./openExternal";
import type { AppPreferences } from "./preferences";
import { resolveJiraBaseUrl } from "../config/product";

export async function openNotificationTarget(
  target: NotificationTarget | undefined,
  handlers: {
    onOpenPerson: (personId: string) => void;
    onOpenSettings: (section: SettingsSection) => void;
    loadPreferences: () => Promise<AppPreferences>;
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
    return;
  }

  if (target.kind === "performance") {
    window.dispatchEvent(
      new CustomEvent("metrio-open-performance-tab", { detail: target.tab }),
    );
  }
}
