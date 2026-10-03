import type { CommandPaletteTarget } from "../domain/commandPalette/commandResultTypes";
import {
  dispatchAppRoute,
  dispatchEmployeeView,
  dispatchFeedbackTab,
  navigateActionTarget,
} from "../app/actionNavigation";
import { buildJiraIssueBrowseUrl } from "./jiraIssueUrl";
import { openExternalUrl } from "./openExternal";
import { recordCommandPaletteRecent } from "./commandPaletteRecents";
import type { CommandResult } from "../domain/commandPalette/commandResultTypes";

export interface CommandPaletteActionHandlers {
  refresh: () => void;
  openNotifications: () => void;
  openSettings: () => void;
  openPerson: (personId: string) => void;
  openProjectCockpit: (projectKey: string) => void;
  switchTheme: () => void;
  feedbackEnabled: boolean;
  resolveJiraUrl: (issueKey: string) => string;
  prepareNextOneOnOne: () => void;
  openTodayMeetings: () => void;
}

export function executeCommandPaletteTarget(
  result: CommandResult,
  handlers: CommandPaletteActionHandlers,
): void {
  recordCommandPaletteRecent({
    type: result.type,
    id: result.id,
    title: result.title,
    subtitle: result.subtitle,
    meta: result.meta,
    target: result.target,
  });
  executeTarget(result.target, handlers);
}

function executeTarget(
  target: CommandPaletteTarget,
  handlers: CommandPaletteActionHandlers,
): void {
  switch (target.kind) {
    case "command":
      runCommand(target.commandId, handlers);
      return;
    case "person":
      handlers.openPerson(target.personId);
      return;
    case "jira":
      void openExternalUrl(
        target.url ?? handlers.resolveJiraUrl(target.issueKey),
      );
      return;
    case "jira_project":
      handlers.openProjectCockpit(target.projectKey);
      return;
    case "confluence":
      void openExternalUrl(target.url);
      return;
    case "resource":
      navigateActionTarget(target.target, {
        openPerson: handlers.openPerson,
      });
      return;
    case "feedback":
      if (handlers.feedbackEnabled) {
        dispatchAppRoute("feedback");
        dispatchFeedbackTab(target.tab);
      }
      return;
    default:
      return;
  }
}

function runCommand(commandId: string, handlers: CommandPaletteActionHandlers): void {
  switch (commandId) {
    case "navigate-home":
      dispatchAppRoute("home");
      return;
    case "navigate-performance":
      dispatchAppRoute("performance");
      return;
    case "navigate-feedback":
      if (handlers.feedbackEnabled) dispatchAppRoute("feedback");
      return;
    case "refresh-data":
      handlers.refresh();
      return;
    case "open-my-work":
      dispatchAppRoute("performance");
      dispatchEmployeeView("my-week");
      return;
    case "open-notifications":
      handlers.openNotifications();
      return;
    case "open-settings":
      handlers.openSettings();
      return;
    case "switch-theme":
      handlers.switchTheme();
      return;
    case "prepare-next-one-on-one":
      handlers.prepareNextOneOnOne();
      return;
    case "open-today-meetings":
      handlers.openTodayMeetings();
      return;
    default:
      return;
  }
}

export function defaultResolveJiraUrl(issueKey: string, baseUrl: string): string {
  return buildJiraIssueBrowseUrl(baseUrl, issueKey);
}
