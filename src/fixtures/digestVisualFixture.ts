import {
  DEFAULT_PREFERENCES,
  PREFERENCES_SCHEMA_VERSION,
  type AppPreferences,
} from "../platform/preferences";
import type { OperationalDigest } from "../domain/digests/digestTypes";

function sampleDigest(
  partial: Pick<
    OperationalDigest,
    "kind" | "role" | "id" | "periodLabel" | "summaryLine" | "sections"
  > & { sinceLabel?: string },
): OperationalDigest {
  const plainText = [
    partial.periodLabel,
    "",
    ...partial.sections.flatMap((s) => [s.title, ...s.lines.map((l) => `• ${l}`), ""]),
  ].join("\n");
  return {
    ...partial,
    generatedAt: "2026-03-02T08:00:00.000Z",
    sinceLabel: partial.sinceLabel ?? "Since your previous daily brief",
    plainText,
  };
}

export const EMPLOYEE_DAILY_VISUAL: OperationalDigest = sampleDigest({
  kind: "daily",
  role: "employee",
  id: "daily:2026-03-02:employee",
  periodLabel: "Tuesday, 2 Mar 2026",
  summaryLine: "2 items need attention",
  sections: [
    {
      id: "assignments",
      title: "New assignments",
      lines: ["MET-101 · Review API contract"],
    },
    {
      id: "attention",
      title: "Work needing attention",
      lines: ["MET-88 · In review longer than target"],
    },
    {
      id: "work",
      title: "Current work",
      lines: ["3 in progress · 1 in review", "2 completed this week"],
    },
    {
      id: "time-off",
      title: "Upcoming time off",
      lines: ["No upcoming leave on your calendar."],
    },
  ],
});

export const MANAGER_DAILY_VISUAL: OperationalDigest = sampleDigest({
  kind: "daily",
  role: "manager",
  id: "daily:2026-03-02:manager",
  periodLabel: "Team brief · Tuesday, 2 Mar 2026",
  summaryLine: "Delivery changes and 3 team actions",
  sections: [
    {
      id: "actions",
      title: "Team actions",
      lines: ["Survey responses: 8/12", "2 delivery failures remain"],
    },
    {
      id: "delivery",
      title: "Delivery changes",
      lines: ["Completed increased from 12 to 16", "3 tasks entered long Review"],
    },
    {
      id: "availability",
      title: "Upcoming availability",
      lines: ["Daria away Mon–Wed (next 7 days)"],
    },
  ],
});

export const WEEKLY_DIGEST_VISUAL: OperationalDigest = sampleDigest({
  kind: "weekly",
  role: "manager",
  id: "weekly:2026-02-24:manager",
  periodLabel: "Week of 24 Feb – 2 Mar 2026",
  summaryLine: "5 completed · 2 new attention signals",
  sinceLabel: "This calendar week (Mon–Sun, local)",
  sections: [
    {
      id: "week",
      title: "This week",
      lines: ["16 tasks completed", "1 backflow event"],
    },
    {
      id: "attention",
      title: "New attention signals",
      lines: ["2 new problematic tasks"],
    },
    {
      id: "resolved",
      title: "Resolved signals",
      lines: ["2 previous attention items are no longer active"],
    },
    {
      id: "starters",
      title: "New starters",
      lines: ["Konstantin · Day 43"],
    },
  ],
});

export const NO_CHANGE_DAILY_VISUAL: OperationalDigest = sampleDigest({
  kind: "daily",
  role: "employee",
  id: "daily:2026-03-02:employee",
  periodLabel: "Tuesday, 2 Mar 2026",
  summaryLine: "Your work is steady today",
  sections: [
    {
      id: "assignments",
      title: "New assignments",
      lines: ["No new Jira assignments since you last checked."],
    },
    {
      id: "attention",
      title: "Work needing attention",
      lines: ["No active work flagged for attention."],
    },
    {
      id: "work",
      title: "Current work",
      lines: ["2 in progress · 0 in review", "1 completed this week"],
    },
  ],
});

export function serializeDigestVisualPrefsForPlaywright(
  variant: "employee" | "manager" | "weekly" | "no-change",
): string {
  const daily =
    variant === "manager"
      ? MANAGER_DAILY_VISUAL
      : variant === "no-change"
        ? NO_CHANGE_DAILY_VISUAL
        : EMPLOYEE_DAILY_VISUAL;
  const weekly = variant === "weekly" ? WEEKLY_DIGEST_VISUAL : undefined;
  const prefs: AppPreferences = {
    ...DEFAULT_PREFERENCES,
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    setup: { completed: true },
    digestState: {
      history: { daily: [], weekly: [] },
      currentDaily: daily,
      currentWeekly: weekly,
    },
    digests: {
      dailyBriefEnabled: true,
      weeklyDigestEnabled: true,
      showDailyOnHome: true,
      showWeeklyOnHome: true,
      notifyDailyBrief: false,
      notifyWeeklyDigest: false,
    },
  };
  return JSON.stringify(prefs);
}
