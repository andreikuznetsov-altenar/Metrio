export interface TrayJiraTaskItem {
  issueKey: string;
  title: string;
}

export interface TrayBambooActionItem {
  id: string;
  label: string;
  url: string;
}

export interface TrayVacationItem {
  id: string;
  label: string;
  url: string;
}

export interface TrayActionSnapshot {
  /** macOS menu bar title: digits only when >0 unread Jira assignments */
  trayTitle?: string;
  unreadAssignmentCount: number;
  newTasks: TrayJiraTaskItem[];
  activeTaskCount: number;
  bambooActions: TrayBambooActionItem[];
  upcomingVacation?: TrayVacationItem;
}

export interface TrayMenuItemPayload {
  id: string;
  label: string;
  enabled?: boolean;
}

export function trayMenuItemsFromSnapshot(snapshot: TrayActionSnapshot): TrayMenuItemPayload[] {
  const items: TrayMenuItemPayload[] = [{ id: "open", label: "Open Metrio" }];

  for (const task of snapshot.newTasks.slice(0, 5)) {
    items.push({
      id: `jira:${task.issueKey}`,
      label: truncateTrayLabel(`${task.issueKey} · ${task.title}`),
    });
  }

  if (snapshot.unreadAssignmentCount > snapshot.newTasks.length) {
    items.push({ id: "view-all-work", label: "View all work" });
  } else if (snapshot.newTasks.length > 0) {
    items.push({ id: "view-all-work", label: "View all work" });
  }

  if (snapshot.activeTaskCount > 0) {
    items.push({
      id: "active-work",
      label: `Active tasks · ${snapshot.activeTaskCount}`,
    });
  }

  for (const action of snapshot.bambooActions) {
    items.push({ id: `bamboo-action:${action.id}`, label: action.label });
  }

  if (snapshot.upcomingVacation) {
    items.push({
      id: `vacation:${snapshot.upcomingVacation.id}`,
      label: snapshot.upcomingVacation.label,
    });
  }

  items.push({ id: "refresh", label: "Refresh" });
  items.push({ id: "logout", label: "Log out" });
  items.push({ id: "quit", label: "Quit" });
  return items;
}

function truncateTrayLabel(text: string, max = 52): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
