export type TraySummaryRole = "employee" | "manager" | "director";

export interface TraySummaryModel {
  role: TraySummaryRole;
  openTaskCount: number;
  problemTaskCount: number;
  indexLabel: string;
  indexValue: string;
  indexAvailable: boolean;
  unreadNotificationCount: number;
  trayTitle?: string;
}

export interface TraySummaryModelInput {
  role: TraySummaryRole;
  openTaskCount: number;
  problemTaskCount: number;
  indexLabel: string;
  indexValue: string;
  indexAvailable: boolean;
  unreadNotificationCount: number;
}

export function trayTitleForUnreadCount(unreadNotificationCount: number): string | undefined {
  if (unreadNotificationCount <= 0) return undefined;
  return String(unreadNotificationCount);
}

export function buildTraySummaryModel(input: TraySummaryModelInput): TraySummaryModel {
  return {
    ...input,
    trayTitle: trayTitleForUnreadCount(input.unreadNotificationCount),
  };
}

export function indexLabelForRole(role: TraySummaryRole): string {
  if (role === "employee") return "Personal index";
  if (role === "director") return "Organization index";
  return "Team index";
}

export function dedupeIssueKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    const trimmed = key.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function sumOpenTasks(activeCounts: number[]): number {
  return activeCounts.reduce((sum, value) => sum + Math.max(0, value), 0);
}
