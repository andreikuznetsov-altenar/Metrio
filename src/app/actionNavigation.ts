import type { ActionItem, ActionTarget } from "../domain/actions/actionTypes";
import { openExternalUrl } from "../platform/openExternal";

import type { TeamPerformanceView } from "../domain/performance";
import { appNavigate } from "./navigationStore";

/** Open Performance with one atomic route + team view update. */
export function navigatePerformanceView(view: TeamPerformanceView): void {
  appNavigate({ route: "performance", performanceView: view });
}

export function dispatchFeedbackTab(tab: "survey" | "delivery" | "results" | "history") {
  window.dispatchEvent(new CustomEvent("metrio-open-feedback-tab", { detail: tab }));
}

export function dispatchAppRoute(route: "home" | "performance" | "feedback") {
  appNavigate({ route });
}

export function dispatchOpenHome() {
  dispatchAppRoute("home");
}

export function dispatchEmployeeView(
  view: "overview" | "my-week" | "goals" | "trends" | "work-history",
) {
  window.dispatchEvent(
    new CustomEvent("metrio-open-employee-view", { detail: view }),
  );
}

export interface ActionNavigationHandlers {
  openPerson: (personId: string, tab?: "overview" | "work" | "history") => void;
}

export function navigateActionTarget(
  target: ActionTarget,
  handlers: ActionNavigationHandlers,
): void {
  switch (target.kind) {
    case "person":
      handlers.openPerson(target.personId, target.tab);
      return;
    case "jira":
      void openExternalUrl(buildJiraIssueUrl(target.issueKey));
      return;
    case "delivery-risk":
      navigatePerformanceView("delivery-risk");
      return;
    case "performance":
      navigatePerformanceView(target.view);
      return;
    case "feedback":
      dispatchAppRoute("feedback");
      dispatchFeedbackTab(target.tab);
      return;
    case "confluence":
      void openExternalUrl(target.url);
      return;
    case "employee-work":
      dispatchAppRoute("performance");
      dispatchEmployeeView(target.view);
      return;
    case "home":
      dispatchAppRoute("home");
      return;
    case "person_brief":
      window.dispatchEvent(
        new CustomEvent("metrio-open-person-brief", {
          detail: { personId: target.personId },
        }),
      );
      return;
    default:
      return;
  }
}

function buildJiraIssueUrl(issueKey: string): string {
  const base = import.meta.env.VITE_JIRA_BASE_URL || "";
  if (base) {
    return `${String(base).replace(/\/$/, "")}/browse/${issueKey}`;
  }
  return `https://jira.atlassian.com/browse/${issueKey}`;
}

export function actionOpenLabel(item: ActionItem): string {
  if (item.target.kind === "jira") return "Open Jira";
  if (item.target.kind === "confluence") return "Open";
  if (item.target.kind === "feedback") return "Open Feedback";
  if (item.target.kind === "delivery-risk") return "Open Delivery Risk";
  if (item.target.kind === "person") return "View person";
  if (item.target.kind === "person_brief") return "View person";
  if (item.target.kind === "performance") return "View details";
  return "View details";
}
