import type {
  EmployeePerformanceView,
  TeamPerformanceView,
} from "../domain/performance";

const TEAM_VIEW_KEY = "metrio.performance.teamView.v1";
const EMPLOYEE_VIEW_KEY = "metrio.performance.employeeView.v1";

const TEAM_VIEWS: TeamPerformanceView[] = [
  "overview",
  "people",
  "radar",
  "delivery-risk",
  "goals",
  "history-reports",
];

const EMPLOYEE_VIEWS: EmployeePerformanceView[] = [
  "overview",
  "my-week",
  "goals",
  "trends",
  "work-history",
];

export function readPersistedTeamPerformanceView(): TeamPerformanceView {
  if (typeof sessionStorage === "undefined") return "overview";
  const raw = sessionStorage.getItem(TEAM_VIEW_KEY);
  return TEAM_VIEWS.includes(raw as TeamPerformanceView)
    ? (raw as TeamPerformanceView)
    : "overview";
}

export function writePersistedTeamPerformanceView(view: TeamPerformanceView): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(TEAM_VIEW_KEY, view);
}

let pendingTeamPerformanceView: TeamPerformanceView | null = null;

export function setPendingTeamPerformanceView(view: TeamPerformanceView): void {
  pendingTeamPerformanceView = view;
}

export function peekPendingTeamPerformanceView(): TeamPerformanceView | null {
  return pendingTeamPerformanceView;
}

export function consumePendingTeamPerformanceView(): TeamPerformanceView | null {
  const next = pendingTeamPerformanceView;
  pendingTeamPerformanceView = null;
  return next;
}

export function readIntendedTeamPerformanceView(): TeamPerformanceView {
  return pendingTeamPerformanceView ?? readPersistedTeamPerformanceView();
}

export function readPersistedEmployeePerformanceView(): EmployeePerformanceView {
  if (typeof sessionStorage === "undefined") return "overview";
  const raw = sessionStorage.getItem(EMPLOYEE_VIEW_KEY);
  return EMPLOYEE_VIEWS.includes(raw as EmployeePerformanceView)
    ? (raw as EmployeePerformanceView)
    : "overview";
}

export function writePersistedEmployeePerformanceView(
  view: EmployeePerformanceView,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(EMPLOYEE_VIEW_KEY, view);
}
