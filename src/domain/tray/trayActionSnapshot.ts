import type { TraySummaryModel } from "./buildTraySummaryModel";

export interface TrayMenuItemPayload {
  id: string;
  label: string;
  enabled?: boolean;
  kind?: "item" | "separator";
}

export interface TrayActionSnapshot {
  trayTitle?: string;
  summary: TraySummaryModel;
}

export function trayMenuItemsFromSummary(summary: TraySummaryModel): TrayMenuItemPayload[] {
  const items: TrayMenuItemPayload[] = [
    {
      id: "summary:open-tasks",
      label: formatSummaryRow("Open tasks", summary.openTaskCount),
      enabled: false,
    },
    {
      id: "summary:problem-tasks",
      label: formatSummaryRow("Problem tasks", summary.problemTaskCount),
      enabled: false,
    },
  ];

  if (summary.indexAvailable) {
    items.push({
      id: "summary:index",
      label: formatSummaryRow(summary.indexLabel, summary.indexValue, false),
      enabled: false,
    });
  }

  items.push({ id: "sep:1", label: "", kind: "separator" });

  if (summary.unreadNotificationCount > 0) {
    items.push({
      id: "notifications",
      label: formatSummaryRow("Notifications", summary.unreadNotificationCount),
    });
  } else {
    items.push({ id: "notifications", label: "Notifications" });
  }

  items.push({ id: "sep:2", label: "", kind: "separator" });
  items.push({ id: "open", label: "Open Metrio" });
  items.push({ id: "refresh", label: "Refresh" });
  items.push({ id: "sep:3", label: "", kind: "separator" });
  items.push({ id: "settings", label: "Settings" });
  items.push({ id: "quit", label: "Quit" });
  return items;
}

function formatSummaryRow(
  label: string,
  value: string | number,
  numeric = true,
): string {
  const text = numeric ? String(value) : value;
  return `${label}\t${text}`;
}
