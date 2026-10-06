import type { DeliveryRiskRow, TeamPerformanceSnapshot } from "../performance";
import { calendarDaysUntil, formatLeaveRangeLabel } from "./leaveCalendar";

export type AvailabilityRowSeverity = "info" | "warning";

export interface ManagerAvailabilityRow {
  personId: string;
  personName: string;
  absenceType: string;
  daysUntil: number | null;
  rangeLabel: string;
  activeCount: number;
  inReviewCount: number;
  severity: AvailabilityRowSeverity;
  summaryLine: string;
}

export interface TeamLeaveOverlap {
  start: string;
  end: string;
  rangeLabel: string;
  personIds: string[];
  personCount: number;
}

export interface TeamCapacityCounts {
  peopleTotal: number;
  peopleAvailable: number;
  peopleAwaySoon: number;
  activeWork: number;
  reviewWork: number;
}

export function buildManagerAvailabilityRows(
  snapshot: TeamPerformanceSnapshot,
  deliveryRisk: DeliveryRiskRow[],
  now = new Date(),
): ManagerAvailabilityRow[] {
  const rows: ManagerAvailabilityRow[] = [];

  for (const entry of snapshot.timeOff) {
    if (!entry.startDate) continue;
    const daysUntil = calendarDaysUntil(entry.startDate, now);
    if (daysUntil == null || daysUntil < 0 || daysUntil > 21) continue;

    const workload = snapshot.workload.find((w) => w.personId === entry.personId);
    const activeCount = workload?.activeWork ?? 0;
    const inReviewCount = deliveryRisk.filter(
      (row) =>
        row.ownerId === entry.personId && /review/i.test(row.status),
    ).length;

    const name = entry.personName ?? entry.personId;

    const hasRiskyWork =
      inReviewCount > 0 ||
      (workload?.workload === "Overloaded" || workload?.workload === "Heavy");
    const severity: AvailabilityRowSeverity =
      daysUntil <= 5 && (activeCount > 0 && (inReviewCount > 0 || hasRiskyWork))
        ? "warning"
        : "info";

    const countdown =
      daysUntil === 0
        ? "today"
        : daysUntil === 1
          ? "tomorrow"
          : `in ${daysUntil} days`;

    rows.push({
      personId: entry.personId,
      personName: name,
      absenceType: entry.note?.trim() || "Time off",
      daysUntil,
      rangeLabel: entry.rangeLabel,
      activeCount,
      inReviewCount,
      severity,
      summaryLine: `${name}\n${entry.note || "Time off"} ${countdown} · ${entry.rangeLabel}\n${activeCount} active · ${inReviewCount} in review`,
    });
  }

  return rows.sort((a, b) => (a.daysUntil ?? 99) - (b.daysUntil ?? 99));
}

function isoRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function detectTeamLeaveOverlaps(
  snapshot: TeamPerformanceSnapshot,
  minPeople = 2,
  now = new Date(),
): TeamLeaveOverlap[] {
  const intervals = snapshot.timeOff
    .filter((e) => e.startDate)
    .map((e) => ({
      personId: e.personId,
      start: e.startDate!,
      end: (e.endDate || e.startDate)!,
      rangeLabel: e.rangeLabel,
    }))
    .filter((e) => {
      const days = calendarDaysUntil(e.start, now);
      return days != null && days >= -1 && days <= 60;
    });

  const n = intervals.length;
  const parent = intervals.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    return root;
  };
  const unite = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (
        isoRangesOverlap(
          intervals[i].start,
          intervals[i].end,
          intervals[j].start,
          intervals[j].end,
        )
      ) {
        unite(i, j);
      }
    }
  }

  const byRoot = new Map<number, typeof intervals>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = byRoot.get(root) ?? [];
    list.push(intervals[i]);
    byRoot.set(root, list);
  }

  const clusters: TeamLeaveOverlap[] = [];
  for (const group of byRoot.values()) {
    if (group.length < minPeople) continue;
    let clusterStart = group[0].start;
    let clusterEnd = group[0].end;
    for (const row of group) {
      if (row.start < clusterStart) clusterStart = row.start;
      if (row.end > clusterEnd) clusterEnd = row.end;
    }
    clusters.push({
      start: clusterStart,
      end: clusterEnd,
      rangeLabel:
        formatLeaveRangeLabel(clusterStart, clusterEnd) || group[0].rangeLabel,
      personIds: group.map((row) => row.personId).sort(),
      personCount: group.length,
    });
  }

  return clusters.sort((a, b) => a.start.localeCompare(b.start));
}

export function buildTeamCapacityCounts(
  snapshot: TeamPerformanceSnapshot,
  deliveryRisk: DeliveryRiskRow[],
): TeamCapacityCounts {
  const peopleTotal = snapshot.workload.length;
  const peopleAwaySoon = snapshot.timeOff.filter((e) => {
    if (!e.startDate) return false;
    const days = calendarDaysUntil(e.startDate);
    return days != null && days >= 0 && days <= 14;
  }).length;
  const peopleAvailable = peopleTotal - peopleAwaySoon;
  const activeWork = snapshot.workload.reduce((sum, row) => sum + row.activeWork, 0);
  const reviewWork = deliveryRisk.filter((row) => /review/i.test(row.status)).length;
  return {
    peopleTotal,
    peopleAvailable: Math.max(0, peopleAvailable),
    peopleAwaySoon,
    activeWork,
    reviewWork,
  };
}

export interface DirectorTeamCapacityRow {
  teamId: string;
  teamName: string;
  peopleTotal: number;
  awayNextWeek: number;
  label: string;
}

export function buildDirectorTeamCapacity(
  teams: { teamId: string; teamName: string; persons: import("../people/types").Person[] }[],
  now = new Date(),
): DirectorTeamCapacityRow[] {
  return teams.map((team) => {
    const awayNextWeek = team.persons.filter((person) => {
      const start = person.availability.startDate;
      if (!start) return false;
      const days = calendarDaysUntil(start, now);
      return (
        days != null &&
        days >= 0 &&
        days <= 7 &&
        (person.availability.state === "vacation_soon" ||
          person.availability.state === "vacation_tomorrow")
      );
    }).length;
    return {
      teamId: team.teamId,
      teamName: team.teamName,
      peopleTotal: team.persons.length,
      awayNextWeek,
      label: `${awayNextWeek} of ${team.persons.length} away next week`,
    };
  });
}
